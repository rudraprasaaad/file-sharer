import { Transfer } from "../domain/transfer";

export interface TransferRepository {
  save(transfer: Transfer): Promise<void>;

  findById(id: string): Promise<Transfer | null>;

  findExpired(now: Date): Promise<Transfer[]>;

  delete(id: string): Promise<void>;

  markActive(id: string): Promise<boolean>;
}
