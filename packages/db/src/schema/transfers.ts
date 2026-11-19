import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const transferStatus = pgEnum("transfer_status", [
  "pending",
  "active",
  "expired",
]);

export const transfers = pgTable(
  "transfers",
  {
    id: text("id").primaryKey(),
    status: transferStatus("status").notNull().default("pending"),
    passwordHash: text("password_hash"),
    chunkSize: integer("chunk_size").notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
    }).notNull(),
  },
  (table) => [index("transfers_status_expires_at_idx").on(table.expiresAt)],
);

export type TransferRow = typeof transfers.$inferSelect;
export type NewTransferRow = typeof transfers.$inferInsert;
