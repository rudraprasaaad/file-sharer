export type TransferStatus = "pending" | "active" | "expired";

export interface TransferFile {
  readonly id: string;
  readonly r2Prefix: string;
  readonly chunkCount: number;
  readonly encryptedMetadata: string;
  readonly sizeBytes: number;
}

export interface Transfer {
  readonly id: string;
  readonly status: TransferStatus;
  readonly passwordHash: string | null;
  readonly chunkSize: number;
  readonly createAt: Date;
  readonly expiresAt: Date;
  readonly files: readonly TransferFile[];
}
