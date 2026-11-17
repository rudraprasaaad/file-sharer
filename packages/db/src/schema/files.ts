import {
  bigint,
  index,
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
    r2Key: text("r2_key").notNull().unique(),
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
