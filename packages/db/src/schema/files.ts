import {
  bigint,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { transfers } from "./transfers";

export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    transferId: text("transfer_id")
      .notNull()
      .references(() => transfers.id, {
        onDelete: "cascade",
      }),
    r2Prefix: text("r2_prefix").notNull().unique(),
    chunkCount: integer("chunk_count").notNull(),
    encryptedMetadata: text("encrypted_metadata").notNull(),
    sizeBytes: bigint("size_bytes", {
      mode: "number",
    }).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("files_transfer_id_idx").on(table.transferId)],
);

export type FileRow = typeof files.$inferSelect;
export type NewFileRow = typeof files.$inferInsert;
