import { z } from "zod";

import { Context } from "hono";
import { HTTPException } from "hono/http-exception";

export async function parseBody<S extends z.ZodType>(
  c: Context,
  schema: S,
): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw new HTTPException(400, {
      res: c.json(
        {
          error: "invalid_json",
          message: "Body must be valid JSON",
        },
        400,
      ),
    });
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new HTTPException(400, {
      res: c.json(
        {
          error: "validation_failed",
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        400,
      ),
    });
  }

  return parsed.data;
}
