export interface ObjectDeleter {
  deleteObjects(keys: readonly string[]): Promise<void>;
}
