import { z } from "zod/v4";

const queryBoolean = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "true" || normalized === "1") {
      return true;
    }

    if (normalized === "false" || normalized === "0") {
      return false;
    }
  }

  return value;
}, z.boolean().optional());

const idParam = z.object({
  id: z.coerce.number().int().positive(),
});

export const HealthCheckResponse = z.object({
  status: z.string(),
});

export const ProductSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  sku: z.string(),
  description: z.string().nullable().optional(),
  category: z.string(),
  price: z.number(),
  quantity: z.number().int(),
  lowStockThreshold: z.number().int(),
  isLowStock: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Product = z.infer<typeof ProductSchema>;

export const CategoryStatSchema = z.object({
  category: z.string(),
  count: z.number().int(),
  totalValue: z.number(),
});

export type CategoryStat = z.infer<typeof CategoryStatSchema>;

export const InventoryStatsSchema = z.object({
  totalProducts: z.number().int(),
  totalValue: z.number(),
  lowStockCount: z.number().int(),
  outOfStockCount: z.number().int(),
  categories: z.array(CategoryStatSchema),
});

export type InventoryStats = z.infer<typeof InventoryStatsSchema>;

export const NotificationSchema = z.object({
  id: z.number().int(),
  productId: z.number().int(),
  eventType: z.string(),
  severity: z.enum(["warning", "critical"]),
  title: z.string(),
  message: z.string(),
  product: ProductSchema.optional(),
  isRead: z.boolean(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Notification = z.infer<typeof NotificationSchema>;

export const ListNotificationsQueryParams = z.object({
  unreadOnly: queryBoolean,
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const MarkNotificationsReadBody = z.object({
  notificationIds: z.array(z.number().int().positive()).min(1).max(100),
});

export const NotificationReadAckSchema = z.object({
  updated: z.number().int().min(0),
});

export type NotificationReadAck = z.infer<typeof NotificationReadAckSchema>;

export const ProductInputSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  description: z.string().nullable().optional(),
  category: z.string().min(1),
  price: z.number().min(0),
  quantity: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).default(5),
});

export const ProductUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  category: z.string().min(1).optional(),
  price: z.number().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
});

export const StockUpdateSchema = z.object({
  quantity: z.number().int().min(0),
});

export const ListProductsQueryParams = z.object({
  lowStock: queryBoolean,
  category: z.string().optional(),
  search: z.string().optional(),
});

export const CreateProductBody = ProductInputSchema;
export const UpdateProductBody = ProductUpdateSchema;
export const UpdateStockBody = StockUpdateSchema;
export const MarkNotificationsReadRequest = MarkNotificationsReadBody;

export const GetProductParams = idParam;
export const UpdateProductParams = idParam;
export const DeleteProductParams = idParam;
export const UpdateStockParams = idParam;

export const ErrorResponse = z.object({
  error: z.string(),
});