import { ENCRYPTION_OVERHEAD_PER_CHUNK } from "@file-sharer/shared";
import { TransferFile } from "./transfer";

export function expectedChunkSizes(
  file: Pick<TransferFile, "sizeBytes" | "chunkCount">,
  chunkSize: number,
): number[] {
  const fullChunk = chunkSize + ENCRYPTION_OVERHEAD_PER_CHUNK;
  const lastChunk = file.sizeBytes - (file.chunkCount - 1) * fullChunk;

  return Array.from(
    {
      length: file.chunkCount,
    },
    (_, index) => (index < file.chunkCount - 1 ? fullChunk : lastChunk),
  );
}
