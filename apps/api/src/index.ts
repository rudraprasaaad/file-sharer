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
import { CleanupService } from "./services/cleanup-service";
import { RepeatingJob } from "./jobs/repeating-job";

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

const transferRepository = new DrizzleTransferRepository(db);
const clock = new SystemClock();

const transferService = new TransferService({
  repository: transferRepository,
  uploadSigner: objectStorage,
  downloadSigner: objectStorage,
  objectInspector: objectStorage,
  passwordHasher: new BunPasswordHasher(),
  clock,
  ids: new SecureIdGenerator(),
  logger: logger.child({
    component: "transfer-service",
  }),
});

const cleanupService = new CleanupService({
  repository: transferRepository,
  objectDeleter: objectStorage,
  clock,
  logger: logger.child({
    component: "cleanup",
  }),
});

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

const cleanupJob = new RepeatingJob({
  name: "cleanup",
  task: async (shouldStop) => {
    await cleanupService.runOnce(shouldStop);
  },
  intervalMs: env.CLEANUP_INTERVAL_SECONDS * 1000,
  initialDelayMs: 10_000,
  logger: logger.child({
    component: "job",
  }),
});
cleanupJob.start();

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("Shutting down", { signal });

  await server.stop();
  await cleanupJob.stop();
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
