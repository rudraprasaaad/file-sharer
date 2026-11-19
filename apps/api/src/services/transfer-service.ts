import { CreateTransferInput, EXPIRY_SECONDS } from "@file-sharer/shared";
import { Clock } from "../interfaces/clock";
import { IdGenerator } from "../interfaces/id-generator";
import { PasswordHasher } from "../interfaces/password-hasher";
import { TransferRepository } from "../interfaces/transfer-repository";
import { UploadUrlSigner } from "../interfaces/upload-url-signer";
import { TransferFile } from "../domain/transfer";
import { chunkKey, chunkKeys, filePrefix } from "../domain/chunk-key";
import {
  TransferExpiredError,
  TransferNotFoundError,
  TransferStateConflictError,
  UploadIncompleteError,
} from "../domain/errors";
import { isExpired } from "../domain/is-expired";
import { ObjectInspector } from "../interfaces/object-inspector";
import { expectedChunkSizes } from "../domain/expected-chunk-sizes";

const UPLOAD_URL_TTL_SECONDS = 6 * 60 * 60;

export interface CreateTransferResult {
  readonly transferId: string;
  readonly expiresAt: Date;
  readonly files: readonly {
    readonly fileId: string;
    readonly uploadUrls: readonly string[];
  }[];
}

export interface CompleteTransferResult {
  readonly transferId: string;
  readonly expiresAt: Date;
}

export class TransferService {
  constructor(
    private readonly repository: TransferRepository,
    private readonly uploadSigner: UploadUrlSigner,
    private readonly passwordHasher: PasswordHasher,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly objectInspector: ObjectInspector,
  ) {}

  async create(input: CreateTransferInput): Promise<CreateTransferResult> {
    const now = this.clock.now();

    const expiresAt = new Date(
      now.getTime() + EXPIRY_SECONDS[input.expiry] * 1000,
    );

    const transferId = this.ids.transferId();

    const passwordHash =
      input.password === undefined
        ? null
        : await this.passwordHasher.hash(input.password);

    const files: TransferFile[] = input.files.map((file) => {
      const fileId = this.ids.fieldId();
      return {
        id: fileId,
        r2Prefix: filePrefix(transferId, fileId),
        chunkCount: file.chunkCount,
        encryptedMetadata: file.encryptedMetadata,
        sizeBytes: file.sizeBytes,
      };
    });

    const signedFiles = await Promise.all(
      files.map(async (file) => ({
        fileId: file.id,
        uploadUrls: await this.uploadSigner.signUploads(
          chunkKeys(file.r2Prefix, file.chunkCount),
          UPLOAD_URL_TTL_SECONDS,
        ),
      })),
    );

    await this.repository.save({
      id: transferId,
      status: "pending",
      passwordHash,
      chunkSize: input.chunkSize,
      createdAt: now,
      expiresAt,
      files,
    });

    return {
      transferId,
      expiresAt,
      files: signedFiles,
    };
  }

  async complete(transferId: string): Promise<CompleteTransferResult> {
    const transfer = await this.repository.findById(transferId);

    if (transfer === null) throw new TransferNotFoundError(transferId);

    if (
      transfer.status === "expired" ||
      isExpired(transfer, this.clock.now())
    ) {
      throw new TransferExpiredError(transferId);
    }

    if (transfer.status === "active") {
      return {
        transferId,
        expiresAt: transfer.expiresAt,
      };
    }
    await Promise.all(
      transfer?.files.map((file) =>
        this.assertFileFullyUploaded(file, transfer.chunkSize),
      ),
    );

    const activated = await this.repository.markActive(transferId);

    if (!activated) {
      const current = await this.repository.findById(transferId);
      if (current?.status === "active") {
        return {
          transferId,
          expiresAt: current.expiresAt,
        };
      }
      throw new TransferStateConflictError(transferId);
    }

    return {
      transferId,
      expiresAt: transfer.expiresAt,
    };
  }

  private async assertFileFullyUploaded(
    file: TransferFile,
    chunkSize: number,
  ): Promise<void> {
    const stored = await this.objectInspector.listSizes(file.r2Prefix);
    const expectedSizes = expectedChunkSizes(file, chunkSize);
    const problems: string[] = [];

    expectedSizes.forEach((expectedSize, index) => {
      const actual = stored.get(chunkKey(file.r2Prefix, index));
      if (actual === undefined) {
        problems.push(`chunk ${index} is missing`);
      } else if (actual !== expectedSize) {
        problems.push(
          `chunk ${index} has ${actual} bytes, expected ${expectedSize}`,
        );
      }
    });

    const expectedKeys = new Set(chunkKeys(file.r2Prefix, file.chunkCount));
    const unexpected = [...stored.keys()].filter(
      (key) => !expectedKeys.has(key),
    );

    if (unexpected.length > 0) {
      problems.push(`${unexpected.length} unexpected object(s) in storage`);
    }

    if (problems.length > 0) {
      const shown = problems.slice(0, 10);
      if (problems.length > shown.length) {
        shown.push(`...and ${problems.length - shown.length} more`);
      }

      throw new UploadIncompleteError(file.id, shown);
    }
  }
}
