import { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  TransferExpiredError,
  TransferNotFoundError,
  TransferStateConflictError,
  UploadIncompleteError,
} from "../domain/errors";

export const handleError: ErrorHandler = (error, c) => {
  if (error instanceof HTTPException) {
    return error.getResponse();
  }

  if (error instanceof TransferNotFoundError) {
    return c.json(
      {
        error: "not_found",
        message: "Transfer not found",
      },
      404,
    );
  }

  if (error instanceof TransferExpiredError) {
    return c.json(
      {
        error: "expired",
        message: "Transfer has expired",
      },
      410,
    );
  }

  if (error instanceof UploadIncompleteError) {
    return c.json(
      {
        error: "upload_incomplete",
        message: "Some chunks are missing or have the wrong size",
        fileId: error.fileId,
        problems: error.problems,
      },
      409,
    );
  }

  if (error instanceof TransferStateConflictError) {
    return c.json(
      {
        error: "state_conflict",
        message: "Transfer is not in a state that allows this",
      },
      409,
    );
  }

  console.error("Unhandled error:", error);
  return c.json(
    {
      error: "internal",
      message: "Something went wrong",
    },
    500,
  );
};
