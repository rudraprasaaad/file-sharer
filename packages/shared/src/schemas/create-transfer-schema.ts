import { z } from "zod";
import { EXPIRY_OPTIONS, LIMITS } from "../constants/limits";
import { ENCRYPTION_OVERHEAD_PER_CHUNK } from "../constants/crypto-format";

const createTransferFileSchema = z.object({
  encryptedMetadata: z.string().min(1).max(LIMITS.maxEncryptedMetadataChars),
  sizeBytes: z.number().int().positive().max(LIMITS.maxChunksPerFile),
  chunkCount: z.number().int().min(1).max(LIMITS.maxChunksPerFile),
});

export const createTransferSchema = z
  .object({
    chunkSize: z
      .number()
      .int()
      .min(LIMITS.minChunkBytes)
      .max(LIMITS.maxChunkBytes),

    expiry: z.enum(EXPIRY_OPTIONS).default("24h"),
    password: z
      .string()
      .min(LIMITS.minPasswordLength)
      .max(LIMITS.maxPasswordLenghth)
      .optional(),
    files: z
      .array(createTransferFileSchema)
      .min(1)
      .max(LIMITS.maxFilesPerTransfer),
  })
  .superRefine((data, ctx) => {
    let totalStoredBytes = 0;

    data.files.forEach((file, index) => {
      totalStoredBytes += file.sizeBytes;

      const expected = Math.ceil(
        file.sizeBytes / (data.chunkSize + ENCRYPTION_OVERHEAD_PER_CHUNK),
      );

      if (file.chunkCount !== expected) {
        ctx.addIssue({
          code: "custom",
          path: ["files", index, "chunkCount"],
          message: `chunkCount must be ${expected} for a ${file.sizeBytes}-byte file with this chunk size`,
        });
      }
    });

    if (totalStoredBytes > LIMITS.maxStoredBytesPerTransfer) {
      ctx.addIssue({
        code: "custom",
        path: ["files"],
        message: "Total size of all files exceeds the transfer limit",
      });
    }
  });

export type CreateTransferInput = z.infer<typeof createTransferSchema>;
