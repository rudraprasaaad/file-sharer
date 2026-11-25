export interface DownloadUrlSigner {
  signDownloads(
    keys: readonly string[],
    expiresInSeconds: number,
  ): Promise<string[]>;
}
