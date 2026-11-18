const MIB = 1024 * 1024;
const GIB = 1024 * MIB;

const MAX_STORED_BYTES = 2 * GIB;
const MIN_CHUNKS_BYTES = 1 * MIB;

export const LIMITS = {
  maxFilesPerTransfer: 50,

  maxStoreBytesPerFile: MAX_STORED_BYTES,
  maxStoredBytesPerTransfer: MAX_STORED_BYTES,

  minChunkBytes: MIN_CHUNKS_BYTES,
  maxChunkBytes: 16 * MIB,
  defaultChunkBytes: 8 * MIB,

  maxChunksPerFile: Math.ceil(MAX_STORED_BYTES / MIN_CHUNKS_BYTES),

  maxEncryptedMetadataChars: 4096,

  minPasswordLength: 6,
  maxPasswordLenghth: 128,
};

export const EXPIRY_OPTIONS = ["1h", "24h", "7d"] as const;
export type ExpiryOption = (typeof EXPIRY_OPTIONS)[number];

export const EXPIRY_SECONDS: Record<ExpiryOption, number> = {
  "1h": 60 * 60,
  "24h": 24 * 60 * 60,
  "7d": 7 * 24 * 60 * 60,
};
