import { createDb } from "@file-sharer/db";
import { loadEnv } from "./config/env";
import { R2ObjectStorage } from "./adapters/r2-object-storage";
import { TransferService } from "./services/transfer-service";
import { DrizzleTransferRepository } from "./adapters/drizzle-transfer-repository";
import { BunPasswordHasher } from "./adapters/bun-password-hasher";
import { SystemClock } from "./adapters/system-clock";
import { SecureIdGenerator } from "./adapters/secure-id-generator";
import { createApp } from "./http/create-app";
import { PinoLogger } from "./adapters/pino-logger";

const env = loadEnv();

const logger = PinoLogger.create({
  level: env.LOG_LEVEL,
  pretty: env.NODE_ENV !== "production",
});

const { db, close: closeDb } = createDb(env.DATABASE_URL);

const objectStorage = new R2ObjectStorage({
  accountId: env.R2_ACCOUNT_ID,
  accessKeyId: env.R2_ACCESS_KEY_ID,
  secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  bucketName: env.R2_BUCKET_NAME,
});

const transferService = new TransferService(
  new DrizzleTransferRepository(db),
  objectStorage,
  new BunPasswordHasher(),
  new SystemClock(),
  new SecureIdGenerator(),
  objectStorage,
);

const app = createApp({
  service: transferService,
  webOrigin: env.WEB_ORIGIN,
  logger,
});

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
});

logger.info("API listening", { port: server.port, env: env.NODE_ENV });

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("Shutting down", { signal });

  await server.stop();
  await closeDb();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", { err: reason });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", { err: error });
  process.exit(1);
});
