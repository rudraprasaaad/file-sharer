import { Transfer } from "../domain/transfer";

export interface TransferRepository {
  save(transfer: Transfer): Promise<void>;

  findById(id: string): Promise<Transfer | null>;

  delete(id: string): Promise<void>;

  markActive(id: string): Promise<boolean>;

  findExpired(now: Date, limit: number): Promise<Transfer[]>;
}
