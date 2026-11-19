import {
  and,
  eq,
  files,
  inArray,
  lte,
  TransferRow,
  transfers,
  type Database,
  type FileRow,
} from "@file-sharer/db";
import { TransferRepository } from "../interfaces/transfer-repository";
import { Transfer } from "../domain/transfer";

export class DrizzleTransferRepository implements TransferRepository {
  constructor(private readonly db: Database) {}

  async save(transfer: Transfer): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(transfers).values({
        id: transfer.id,
        status: transfer.status,
        passwordHash: transfer.passwordHash,
        chunkSize: transfer.chunkSize,
        createdAt: transfer.createdAt,
        expiresAt: transfer.expiresAt,
      });

      await tx.insert(files).values(
        transfer.files.map((file) => ({
          id: file.id,
          transferId: transfer.id,
          r2Prefix: file.r2Prefix,
          chunkCount: file.chunkCount,
          encryptedMetadata: file.encryptedMetadata,
          sizeBytes: file.sizeBytes,
        })),
      );
    });
  }

  async findById(id: string): Promise<Transfer | null> {
    const [row] = await this.db
      .select()
      .from(transfers)
      .where(eq(transfers.id, id))
      .limit(1);

    if (row === undefined) return null;

    const fileRows = await this.db
      .select()
      .from(files)
      .where(eq(files.transferId, id));

    return toTransfer(row, fileRows);
  }

  async markActive(id: string): Promise<boolean> {
    const updated = await this.db
      .update(transfers)
      .set({
        status: "active",
      })
      .where(and(eq(transfers.id, id), eq(transfers.status, "pending")))
      .returning({
        id: transfers.id,
      });

    return updated.length > 0;
  }

  async findExpired(now: Date): Promise<Transfer[]> {
    const rows = await this.db
      .select()
      .from(transfers)
      .where(lte(transfers.expiresAt, now));

    if (rows.length === 0) return [];

    const fileRows = await this.db
      .select()
      .from(files)
      .where(
        inArray(
          files.transferId,
          rows.map((row) => row.id),
        ),
      );

    const fileByTransfer = new Map<string, FileRow[]>();
    for (const fileRow of fileRows) {
      const list = fileByTransfer.get(fileRow.transferId) ?? [];
      list.push(fileRow);
      fileByTransfer.set(fileRow.transferId, list);
    }

    return rows.map((row) => toTransfer(row, fileByTransfer.get(row.id) ?? []));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(transfers).where(eq(transfers.id, id));
  }
}

function toTransfer(row: TransferRow, fileRows: FileRow[]): Transfer {
  return {
    id: row.id,
    status: row.status,
    passwordHash: row.passwordHash,
    chunkSize: row.chunkSize,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    files: fileRows.map((file) => ({
      id: file.id,
      r2Prefix: file.r2Prefix,
      chunkCount: file.chunkCount,
      encryptedMetadata: file.encryptedMetadata,
      sizeBytes: file.sizeBytes,
    })),
  };
}
