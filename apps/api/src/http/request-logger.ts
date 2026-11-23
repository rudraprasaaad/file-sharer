import { MiddlewareHandler } from "hono";
import { Logger } from "../interfaces/logger";
import { AppEnv } from "./app-env";

export function requestLogger(logger: Logger): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const requestId = crypto.randomUUID();
    c.set("requestId", requestId);
    c.header("X-Request-Id", requestId);

    const startedAt = performance.now();

    await next();

    const durationMs = Math.round(performance.now() - startedAt);
    const status = c.res.status;

    const fields = {
      requestId,
      method: c.req.method,
      path: c.req.path,
      status,
      durationMs,
    };

    if (status >= 500) {
      logger.error("Request failed", fields);
    } else if (status >= 400) {
      logger.warn("Request rejected", fields);
    } else if (c.req.path === "/health") {
      logger.debug("Request completed", fields);
    } else {
      logger.info("Request completed", fields);
    }
  };
}
