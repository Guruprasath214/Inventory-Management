// @ts-nocheck

import {
  ListNotificationsQueryParams,
  MarkNotificationsReadBody,
} from "@workspace/api-zod";
import { and, db, desc, eq, inArray, isNull, notificationReadsTable, notificationsTable, productsTable, sql } from "@workspace/db";
import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const DEFAULT_NOTIFICATION_USER = "admin";
const STOCK_EVENT_TYPE = "stock";

type ProductRow = typeof productsTable.$inferSelect;

type StockNotificationPayload = {
  productId: number;
  eventType: string;
  severity: "warning" | "critical";
  title: string;
  message: string;
  fingerprint: string;
};

function getNotificationUserId(rawUserId: unknown) {
  if (typeof rawUserId === "string" && rawUserId.trim().length > 0) {
    return rawUserId.trim().slice(0, 128);
  }
  return DEFAULT_NOTIFICATION_USER;
}

function buildStockFingerprint(product: ProductRow) {
  return `stock:${product.id}:${product.quantity}:${product.updatedAt.toISOString()}`;
}

function buildStockNotification(product: ProductRow): StockNotificationPayload {
  const severity = product.quantity === 0 ? "critical" : "warning";
  const title = product.quantity === 0 ? "Out of stock" : "Low stock";
  const message =
    product.quantity === 0
      ? `${product.name} is now unavailable.`
      : `${product.name} has only ${product.quantity} units left.`;

  return {
    productId: product.id,
    eventType: STOCK_EVENT_TYPE,
    severity,
    title,
    message,
    fingerprint: buildStockFingerprint(product),
  };
}

export async function syncStockNotifications() {
  logger.debug("syncStockNotifications: scanning products for low stock");
  const lowStockRows = await db
    .select()
    .from(productsTable)
    .where(sql`${productsTable.quantity} < ${productsTable.lowStockThreshold}`);

  const payloads = lowStockRows.map(buildStockNotification);
  const payloadByFingerprint = new Map(payloads.map((payload) => [payload.fingerprint, payload]));

  const existingStockRows = await db
    .select({
      id: notificationsTable.id,
      fingerprint: notificationsTable.fingerprint,
      isActive: notificationsTable.isActive,
    })
    .from(notificationsTable)
    .where(eq(notificationsTable.eventType, STOCK_EVENT_TYPE));

  const now = new Date();

  let inserted = 0;
  let updated = 0;
  let deactivated = 0;

  for (const payload of payloads) {
    const existing = existingStockRows.find((row) => row.fingerprint === payload.fingerprint);

    if (existing) {
      await db
        .update(notificationsTable)
        .set({
          productId: payload.productId,
          severity: payload.severity,
          title: payload.title,
          message: payload.message,
          isActive: 1,
          lastSeenAt: now,
        })
        .where(eq(notificationsTable.id, existing.id));
      updated += 1;
      continue;
    }

    await db.insert(notificationsTable).values({
      productId: payload.productId,
      eventType: payload.eventType,
      severity: payload.severity,
      title: payload.title,
      message: payload.message,
      fingerprint: payload.fingerprint,
      isActive: 1,
      lastSeenAt: now,
    });
    inserted += 1;
  }

  for (const existing of existingStockRows) {
    if (!payloadByFingerprint.has(existing.fingerprint) && existing.isActive === 1) {
      await db
        .update(notificationsTable)
        .set({ isActive: 0 })
        .where(eq(notificationsTable.id, existing.id));
      deactivated += 1;
    }
  }

  logger.info({ inserted, updated, deactivated }, "syncStockNotifications: summary");

  return { inserted, updated, deactivated };
}

router.get("/notifications", async (req, res): Promise<void> => {
  try {
    const parsed = ListNotificationsQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    await syncStockNotifications();

    const userId = getNotificationUserId(req.header("x-user-id"));
    const unreadOnly = parsed.data.unreadOnly === true;
    const limit = parsed.data.limit ?? 50;

    const joinedRows = await db
      .select({
        id: notificationsTable.id,
        productId: notificationsTable.productId,
        eventType: notificationsTable.eventType,
        severity: notificationsTable.severity,
        title: notificationsTable.title,
        message: notificationsTable.message,
        createdAt: notificationsTable.createdAt,
        updatedAt: notificationsTable.updatedAt,
        readAt: notificationReadsTable.readAt,
        productName: productsTable.name,
        productSku: productsTable.sku,
        productCategory: productsTable.category,
        productPrice: productsTable.price,
        productQuantity: productsTable.quantity,
        productLowStockThreshold: productsTable.lowStockThreshold,
        productCreatedAt: productsTable.createdAt,
        productUpdatedAt: productsTable.updatedAt,
      })
      .from(notificationsTable)
      .leftJoin(
        notificationReadsTable,
        and(
          eq(notificationReadsTable.notificationId, notificationsTable.id),
          eq(notificationReadsTable.userId, userId),
        ),
      )
      .leftJoin(
        productsTable,
        eq(productsTable.id, notificationsTable.productId),
      )
      .where(
        and(
          eq(notificationsTable.isActive, 1),
          unreadOnly ? isNull(notificationReadsTable.readAt) : sql`1=1`,
        ),
      )
      .orderBy(desc(notificationsTable.updatedAt))
      .limit(limit);

    res.json(
      joinedRows.map((row) => {
        const formatDate = (date: any) => {
          if (!date) return null;
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

        const product = row.productName
          ? {
              id: row.productId,
              name: row.productName,
              sku: row.productSku,
              category: row.productCategory,
              price: parseFloat(row.productPrice as unknown as string) || 0,
              quantity: row.productQuantity,
              lowStockThreshold: row.productLowStockThreshold,
              isLowStock:
                typeof row.productQuantity === "number" &&
                typeof row.productLowStockThreshold === "number"
                  ? row.productQuantity < row.productLowStockThreshold
                  : false,
              createdAt: formatDate(row.productCreatedAt),
              updatedAt: formatDate(row.productUpdatedAt),
            }
          : null;

        return {
          id: row.id,
          productId: row.productId,
          eventType: row.eventType,
          severity: row.severity === "critical" ? "critical" : "warning",
          title: row.title,
          message: row.message,
          product,
          isRead: row.readAt !== null,
          readAt: formatDate(row.readAt),
          createdAt: formatDate(row.createdAt),
          updatedAt: formatDate(row.updatedAt),
        };
      }),
    );
  } catch (error) {
    logger.warn({ err: error }, "Notifications unavailable; returning empty list");
    res.json([]);
  }
});

router.post("/notifications/read", async (req, res): Promise<void> => {
  try {
    const parsed = MarkNotificationsReadBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const userId = getNotificationUserId(req.header("x-user-id"));
    const now = new Date();
    const uniqueIds = Array.from(new Set(parsed.data.notificationIds));

    const existingNotifications = await db
      .select({ id: notificationsTable.id })
      .from(notificationsTable)
      .where(and(eq(notificationsTable.isActive, 1), inArray(notificationsTable.id, uniqueIds)));

    const activeIds = existingNotifications.map((row) => row.id);
    let updated = 0;

    for (const notificationId of activeIds) {
      const [existingRead] = await db
        .select({ id: notificationReadsTable.id })
        .from(notificationReadsTable)
        .where(
          and(
            eq(notificationReadsTable.notificationId, notificationId),
            eq(notificationReadsTable.userId, userId),
          ),
        );

      if (existingRead) {
        await db
          .update(notificationReadsTable)
          .set({ readAt: now })
          .where(eq(notificationReadsTable.id, existingRead.id));
      } else {
        await db.insert(notificationReadsTable).values({
          notificationId,
          userId,
          readAt: now,
        });
      }

      updated += 1;
    }

    res.json({ updated });
  } catch (error) {
    logger.warn({ err: error }, "Notifications unavailable; skipping mark-read");
    res.json({ updated: 0 });
  }
});

router.post("/notifications/read-all", async (req, res): Promise<void> => {
  try {
    await syncStockNotifications();

    const userId = getNotificationUserId(req.header("x-user-id"));
    const now = new Date();

    const unreadRows = await db
      .select({ id: notificationsTable.id })
      .from(notificationsTable)
      .leftJoin(
        notificationReadsTable,
        and(
          eq(notificationReadsTable.notificationId, notificationsTable.id),
          eq(notificationReadsTable.userId, userId),
        ),
      )
      .where(and(eq(notificationsTable.isActive, 1), isNull(notificationReadsTable.readAt)));

    for (const row of unreadRows) {
      await db.insert(notificationReadsTable).values({
        notificationId: row.id,
        userId,
        readAt: now,
      });
    }

    res.json({ updated: unreadRows.length });
  } catch (error) {
    logger.warn({ err: error }, "Notifications unavailable; skipping mark-all read");
    res.json({ updated: 0 });
  }
});

export default router;
