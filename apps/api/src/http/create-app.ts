import { Hono } from "hono";
import { TransferService } from "../services/transfer-service";
import { cors } from "hono/cors";
import { createTransferRoutes } from "./transfer-routes";
import { AppEnv } from "./app-env";
import { Logger } from "../interfaces/logger";
import { requestLogger } from "./request-logger";
import { createErrorHandler } from "./handle-error";

export interface AppOptions {
  readonly service: TransferService;
  readonly webOrigin: string;
  readonly logger: Logger;
}

export function createApp({
  service,
  webOrigin,
  logger,
}: AppOptions): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.use("*", requestLogger(logger));

  app.use(
    "*",
    cors({
      origin: webOrigin,
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type"],
      exposeHeaders: ["X-Request-Id"],
      maxAge: 3600,
    }),
  );

  app.get("/health", (c) =>
    c.json({
      status: "ok",
    }),
  );

  app.route("/transfers", createTransferRoutes(service));

  app.onError(createErrorHandler(logger));

  app.notFound((c) =>
    c.json(
      {
        error: "not_found",
        message: "Not found",
      },
      404,
    ),
  );

  return app;
}
