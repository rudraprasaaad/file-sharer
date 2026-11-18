export interface ObjectInspector {
  listSizes(prefix: string): Promise<ReadonlyMap<string, number>>;
}
