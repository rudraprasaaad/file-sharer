import { Hono } from "hono";
import { TransferService } from "../services/transfer-service";
import { bodyLimit } from "hono/body-limit";
import { createTransferSchema } from "@file-sharer/shared";

const MAX_BODY_BYTES = 1024 * 1024;

export function createTransferRoutes(service: TransferService): Hono {
  const routes = new Hono();

  routes.post(
    "/",
    bodyLimit({
      maxSize: MAX_BODY_BYTES,
      onError: (c) =>
        c.json(
          {
            error: "payload_too_large",
            message: "Body too large",
          },
          413,
        ),
    }),

    async (c) => {
      let body: unknown;
      try {
        body = await c.req.json();
      } catch {
        return c.json(
          {
            error: "invalid_json",
            message: "Body must be valid JSON",
          },
          400,
        );
      }

      const parsed = createTransferSchema.safeParse(body);
      if (!parsed.success) {
        return c.json(
          {
            error: "validation_failed",
            issues: parsed.error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
          },
          400,
        );
      }

      const result = await service.create(parsed.data);

      return c.json(result, 201);
    },
  );

  routes.post("/:id/complete", async (c) => {
    const result = await service.complete(c.req.param("id"));
    return c.json(result, 200);
  });

  return routes;
}
