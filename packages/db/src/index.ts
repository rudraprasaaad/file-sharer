import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export function createDb(connectionString: string) {
  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

  pool.on("error", (err) => {
    console.error("Unexpected error on idle database connection", err);
  });

  const db = drizzle({
    client: pool,
    schema,
  });

  return {
    db,
    close: () => pool.end(),
  };
}

export type Database = ReturnType<typeof createDb>["db"];

export * from "./schema";
export { and, asc, eq, inArray, lte } from "drizzle-orm";
