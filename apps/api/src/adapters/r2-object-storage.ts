import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { ObjectInspector } from "../interfaces/object-inspector";
import { UploadUrlSigner } from "../interfaces/upload-url-signer";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DownloadUrlSigner } from "../interfaces/download-url-signer";
import { ObjectDeleter } from "../interfaces/object-deleter";
import { ObjectDeletionError } from "../domain/errors";

export interface R2Config {
  readonly accountId: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly bucketName: string;
}

const CHUNK_CONTENT_TYPE = "application/octet-stream";
const MAX_KEYS_PER_DELETE_REQUEST = 1000;

export class R2ObjectStorage
  implements UploadUrlSigner, DownloadUrlSigner, ObjectInspector, ObjectDeleter
{
  private readonly client: S3Client;
  private readonly bucketName: string;

  constructor(config: R2Config) {
    this.bucketName = config.bucketName;

    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },

      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }

  async signUploads(
    keys: readonly string[],
    expiresInSeconds: number,
  ): Promise<string[]> {
    return Promise.all(
      keys.map((key) =>
        getSignedUrl(
          this.client,
          new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            ContentType: CHUNK_CONTENT_TYPE,
          }),
          {
            expiresIn: expiresInSeconds,
          },
        ),
      ),
    );
  }

  async signDownloads(
    keys: readonly string[],
    expiresInSeconds: number,
  ): Promise<string[]> {
    return Promise.all(
      keys.map((key) =>
        getSignedUrl(
          this.client,
          new GetObjectCommand({
            Bucket: this.bucketName,
            Key: key,
          }),
          {
            expiresIn: expiresInSeconds,
          },
        ),
      ),
    );
  }

  async listSizes(prefix: string): Promise<ReadonlyMap<string, number>> {
    const sizes = new Map<string, number>();
    let continuationToken: string | undefined;

    do {
      const page = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );

      for (const object of page.Contents ?? []) {
        if (object.Key === undefined || object.Size === undefined) {
          throw new Error("R2 returned a listing entry without key or size");
        }
        sizes.set(object.Key, object.Size);
      }

      continuationToken = page.IsTruncated
        ? page.NextContinuationToken
        : undefined;
    } while (continuationToken !== undefined);

    return sizes;
  }

  async deleteObjects(keys: readonly string[]): Promise<void> {
    const failedKeys: string[] = [];

    for (
      let start = 0;
      start < keys.length;
      start += MAX_KEYS_PER_DELETE_REQUEST
    ) {
      const batch = keys.slice(start, start + MAX_KEYS_PER_DELETE_REQUEST);

      const response = await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucketName,
          Delete: {
            Objects: batch.map((Key) => ({ Key })),
            Quiet: true,
          },
        }),
      );

      for (const failure of response.Errors ?? []) {
        if (failure.Code === "NoSuchKey") continue;
        failedKeys.push(failure.Key ?? "(unknown key)");
      }
    }

    if (failedKeys.length > 0) throw new ObjectDeletionError(failedKeys);
  }
}
