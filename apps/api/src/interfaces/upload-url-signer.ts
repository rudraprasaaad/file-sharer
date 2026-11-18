export interface UploadUrlSigner {
  signUploads(
    keys: readonly string[],
    expiresInSecons: number,
  ): Promise<string[]>;
}
