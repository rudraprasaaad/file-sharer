import { Hono } from "hono";
import { TransferService } from "../services/transfer-service";
import { cors } from "hono/cors";
import { createTransferRoutes } from "./transfer-routes";
import { handleError } from "./handle-error";

export interface AppOptions {
  readonly service: TransferService;
  readonly webOrigin: string;
}

export function createApp({ service, webOrigin }: AppOptions): Hono {
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: webOrigin,
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type"],
      maxAge: 3600,
    }),
  );

  app.get("/health", (c) =>
    c.json({
      status: "ok",
    }),
  );

  app.route("/transfers", createTransferRoutes(service));

  app.onError(handleError);

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
