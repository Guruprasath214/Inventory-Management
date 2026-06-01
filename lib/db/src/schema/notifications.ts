import {
    index,
    int,
    mysqlTable,
    serial,
    text,
    timestamp,
    tinyint,
    uniqueIndex,
    varchar,
} from "drizzle-orm/mysql-core";

export const notificationsTable = mysqlTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    productId: int("product_id").notNull(),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    severity: varchar("severity", { length: 16 }).notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    fingerprint: varchar("fingerprint", { length: 191 }).notNull(),
    isActive: tinyint("is_active").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
    lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
  },
  (table) => ({
    uqFingerprint: uniqueIndex("uq_notifications_fingerprint").on(table.fingerprint),
    idxProduct: index("idx_notifications_product_id").on(table.productId),
    idxActive: index("idx_notifications_active").on(table.isActive),
    idxUpdatedAt: index("idx_notifications_updated_at").on(table.updatedAt),
  }),
);

export const notificationReadsTable = mysqlTable(
  "notification_reads",
  {
    id: serial("id").primaryKey(),
    notificationId: int("notification_id").notNull(),
    userId: varchar("user_id", { length: 128 }).notNull(),
    readAt: timestamp("read_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    uqNotificationUser: uniqueIndex("uq_notification_reads_notification_user").on(
      table.notificationId,
      table.userId,
    ),
    idxUser: index("idx_notification_reads_user").on(table.userId),
  }),
);
