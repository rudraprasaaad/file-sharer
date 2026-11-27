export class TransferNotFoundError extends Error {
  constructor(readonly transferId: string) {
    super(`Transfer ${transferId} not found`);
    this.name = "TransferNotFoundError";
  }
}

export class TransferExpiredError extends Error {
  constructor(readonly transferId: string) {
    super(`Transfer ${transferId} has expired`);
    this.name = "TransferExpiredError";
  }
}

export class UploadIncompleteError extends Error {
  constructor(
    readonly fileId: string,
    readonly problems: readonly string[],
  ) {
    super(`File ${fileId} is not fully uploaded: ${problems.join("; ")}`);
    this.name = "UploadIncompleteError";
  }
}

export class TransferStateConflictError extends Error {
  constructor(readonly transferId: string) {
    super(`Transfer ${transferId} changed state while completing`);
    this.name = "TransferStateConflictError";
  }
}

export class InvalidPasswordError extends Error {
  constructor() {
    super("Password is missing or incorrect");
    this.name = "InvalidPasswordError";
  }
}

export class FileNotFoundError extends Error {
  constructor(readonly fileId: string) {
    super(`File ${fileId} not found in transfer`);
    this.name = "FileNotFoundError";
  }
}

export class ObjectDeletionError extends Error {
  constructor(readonly failedKeys: readonly string[]) {
    super(`Failed to delete ${failedKeys.length} object(s)`);
    this.name = "ObjectDeletionError";
  }
}
