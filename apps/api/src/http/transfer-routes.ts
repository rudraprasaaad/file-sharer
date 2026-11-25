import { Hono } from "hono";
import { TransferService } from "../services/transfer-service";
import { bodyLimit } from "hono/body-limit";
import {
  accessTransferSchema,
  createTransferSchema,
} from "@file-sharer/shared";
import { parseBody } from "./parse-body";

const MAX_BODY_BYTES = 1024 * 1024;
const MAX_ACCESS_BODY_BYTES = 4 * 1024;

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

  const accesBodyLimit = bodyLimit({
    maxSize: MAX_ACCESS_BODY_BYTES,
    onError: (c) =>
      c.json(
        {
          error: "payload_too_large",
          message: "Body too large",
        },
        413,
      ),
  });

  routes.get("/:id", async (c) => {
    const info = await service.getPublicInfo(c.req.param("id"));
    c.header("Cache-Control", "no-store");
    return c.json(info);
  });

  routes.post("/:id/access", accesBodyLimit, async (c) => {
    const { password } = await parseBody(c, accessTransferSchema);
    const result = await service.openTransfer(c.req.param("id"), password);

    c.header("Cache-Control", "no-store");
    return c.json(result);
  });

  routes.post("/:id/files/:fileId/download-urls", accesBodyLimit, async (c) => {
    const { password } = await parseBody(c, accessTransferSchema);
    const result = await service.getDownloadUrls(
      c.req.param("id"),
      c.req.param("fileId"),
      password,
    );

    c.header("Cache-Control", "no-store");
    return c.json(result);
  });

  return routes;
}
