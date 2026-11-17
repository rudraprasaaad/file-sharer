import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const files = pgTable("files", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  storageKey: text("storage_key").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
