import { CreateTransferInput, EXPIRY_SECONDS } from "@file-sharer/shared";
import { Clock } from "../interfaces/clock";
import { IdGenerator } from "../interfaces/id-generator";
import { PasswordHasher } from "../interfaces/password-hasher";
import { TransferRepository } from "../interfaces/transfer-repository";
import { UploadUrlSigner } from "../interfaces/upload-url-signer";
import { TransferFile } from "../domain/transfer";
import { chunkKeys, filePrefix } from "../domain/chunk-key";

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
}
