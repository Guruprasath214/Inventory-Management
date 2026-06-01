import {
  CreateProductBody,
  DeleteProductParams,
  GetProductParams,
  ListProductsQueryParams,
  UpdateProductBody,
  UpdateProductParams,
  UpdateStockBody,
  UpdateStockParams,
} from "@workspace/api-zod";
import { and, db, eq, productsTable, sql } from "@workspace/db";
import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";
import { syncStockNotifications } from "./notifications";

const router: IRouter = Router();

function toProductResponse(row: typeof productsTable.$inferSelect) {
  if (!row) return null;
  
  const formatDate = (date: any) => {
    if (date instanceof Date) return date.toISOString();
    if (typeof date === "string" || typeof date === "number") {
      try {
        return new Date(date).toISOString();
      } catch {
        return new Date().toISOString();
      }
    }
    return new Date().toISOString();
  };

  return {
    ...row,
    price: parseFloat(row.price as unknown as string) || 0,
    isLowStock: row.quantity < row.lowStockThreshold,
    createdAt: formatDate(row.createdAt),
    updatedAt: formatDate(row.updatedAt),
  };
}

router.get("/products", async (req, res): Promise<void> => {
  try {
    const parsed = ListProductsQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { lowStock, category, search } = parsed.data;

    // If a search term is provided, avoid SQL-level case-insensitive ops (which
    // can vary across DB engines) and perform a safe in-memory filter. This
    // guarantees the frontend won't receive 500s for incremental search.
    if (search) {
      try {
        const allRows = await db.select().from(productsTable).orderBy(productsTable.name);
        const searchLower = String(search).toLowerCase();

        const filtered = allRows.filter((row) => {
          if (lowStock === true && !(row.quantity < row.lowStockThreshold)) return false;
          if (category && row.category !== category) return false;
          const name = String(row.name || "").toLowerCase();
          const sku = String(row.sku || "").toLowerCase();
          return name.includes(searchLower) || sku.includes(searchLower);
        });

        res.json(filtered.map(toProductResponse).filter(Boolean));
        return;
      } catch (err) {
        logger.error({ err }, "Failed to perform in-memory product search");
        // Graceful fallback: return empty list so the frontend doesn't receive
        // repeated 500 responses during incremental searches when the DB is
        // temporarily unavailable.
        res.json([]);
        return;
      }
    }

    // No search term — perform a SQL query with optional filters for better performance.
    let query = db.select().from(productsTable).$dynamic();
    const conditions = [];
    if (lowStock === true) {
      conditions.push(sql`${productsTable.quantity} < ${productsTable.lowStockThreshold}`);
    }
    if (category) {
      conditions.push(eq(productsTable.category, category));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions) as any);
    }

    const rows = await query.orderBy(productsTable.name);
    res.json(rows.map(toProductResponse).filter(Boolean));
  } catch (err) {
    logger.error({ err }, "Failed to list products");
    // Graceful fallback: return empty list to avoid surfacing a 500 to the
    // frontend for non-critical listing failures (e.g. temporary DB outage).
    res.json([]);
  }
});

router.post("/products", async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    logger.warn({ errors: parsed.error.message }, "Invalid product body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { price, ...rest } = parsed.data;

  // MySQL does not support RETURNING in the same way Postgres does.
  // Use $returningId() to get the inserted primary key, then select the row to return.
  const insertedIds = await db
    .insert(productsTable)
    .values({ ...rest, price: price.toString() })
    .$returningId();

  const insertedId = insertedIds?.[0]?.id;
  const [row] = insertedId
    ? await db.select().from(productsTable).where(eq(productsTable.id, insertedId))
    : [];

  try {
    const res = await syncStockNotifications();
    logger.info({ res }, "syncStockNotifications result after product create");
  } catch (err) {
    logger.warn({ err }, "syncStockNotifications failed after product create");
  }

  res.status(201).json(toProductResponse(row));
});

router.get("/products/stats", async (req, res): Promise<void> => {
  const rows = await db.select().from(productsTable);

  const totalProducts = rows.length;
  const totalValue = rows.reduce((sum, p) => sum + parseFloat(p.price as unknown as string) * p.quantity, 0);
  const lowStockCount = rows.filter((p) => p.quantity < p.lowStockThreshold).length;
  const outOfStockCount = rows.filter((p) => p.quantity === 0).length;

  const categoryMap = new Map<string, { count: number; totalValue: number }>();
  for (const p of rows) {
    const existing = categoryMap.get(p.category) ?? { count: 0, totalValue: 0 };
    categoryMap.set(p.category, {
      count: existing.count + 1,
      totalValue: existing.totalValue + parseFloat(p.price as unknown as string) * p.quantity,
    });
  }

  const categories = Array.from(categoryMap.entries()).map(([category, stat]) => ({
    category,
    count: stat.count,
    totalValue: Math.round(stat.totalValue * 100) / 100,
  }));

  res.json({
    totalProducts,
    totalValue: Math.round(totalValue * 100) / 100,
    lowStockCount,
    outOfStockCount,
    categories,
  });
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  try {
    const res = await syncStockNotifications();
    logger.info({ res }, "syncStockNotifications result after product update");
  } catch (err) {
    logger.warn({ err }, "syncStockNotifications failed after product update");
  }

  res.json(toProductResponse(row));
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { price, ...rest } = parsed.data;
  const updateValues: Record<string, unknown> = { ...rest };
  if (price !== undefined) {
    updateValues.price = price.toString();
  }

  await db
    .update(productsTable)
    .set(updateValues)
    .where(eq(productsTable.id, params.data.id))
    .execute();

  const [row] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  try {
    const res = await syncStockNotifications();
    logger.info({ res }, "syncStockNotifications result after product delete");
  } catch (err) {
    logger.warn({ err }, "syncStockNotifications failed after product delete");
  }

  res.json(toProductResponse(row));
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // For MySQL, delete does not return the deleted row. Check existence then delete.
  const [existing] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  await db.delete(productsTable).where(eq(productsTable.id, params.data.id)).execute();

  try {
    const res = await syncStockNotifications();
    logger.info({ res }, "syncStockNotifications result after stock update");
  } catch (err) {
    logger.warn({ err }, "syncStockNotifications failed after stock update");
  }

  res.sendStatus(204);
});

router.patch("/products/:id/stock", async (req, res): Promise<void> => {
  const params = UpdateStockParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateStockBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.quantity < 0) {
    res.status(400).json({ error: "Stock quantity cannot be negative" });
    return;
  }

  // Update then select the row to return the new state.
  await db
    .update(productsTable)
    .set({ quantity: parsed.data.quantity })
    .where(eq(productsTable.id, params.data.id))
    .execute();

  const [row] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  await syncStockNotifications();

  res.json(toProductResponse(row));
});

export default router;
