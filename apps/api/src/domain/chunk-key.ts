export function filePrefix(transferId: string, fileId: string): string {
  return `${transferId}/${fileId}`;
}

export function chunkKey(prefix: string, index: number): string {
  return `${prefix}${String(index).padStart(6, "0")}`;
}

export function chunkKeys(prefix: string, count: number): string[] {
  return Array.from(
    {
      length: count,
    },
    (_, index) => chunkKey(prefix, index),
  );
}
