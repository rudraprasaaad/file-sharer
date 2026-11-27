import { chunkKeys } from "../domain/chunk-key";
import { ObjectDeletionError } from "../domain/errors";
import { Transfer } from "../domain/transfer";
import { Clock } from "../interfaces/clock";
import { Logger } from "../interfaces/logger";
import { ObjectDeleter } from "../interfaces/object-deleter";
import { TransferRepository } from "../interfaces/transfer-repository";

export interface CleanupServiceDependencies {
  readonly repository: TransferRepository;
  readonly objectDeleter: ObjectDeleter;
  readonly clock: Clock;
  readonly logger: Logger;
}

export interface CleanupSummary {
  readonly deleted: number;
  readonly failed: number;
}

const BATCH_SIZE = 50;

export class CleanupService {
  private readonly repository: TransferRepository;
  private readonly objectDeleter: ObjectDeleter;
  private readonly clock: Clock;
  private readonly logger: Logger;

  constructor(deps: CleanupServiceDependencies) {
    this.repository = deps.repository;
    this.objectDeleter = deps.objectDeleter;
    this.clock = deps.clock;
    this.logger = deps.logger;
  }

  async runOnce(
    shouldStop: () => boolean = () => false,
  ): Promise<CleanupSummary> {
    let deleted = 0;
    let failed = 0;

    while (!shouldStop()) {
      const batch = await this.repository.findExpired(
        this.clock.now(),
        BATCH_SIZE,
      );
      if (batch.length === 0) break;

      let deletedInBatch = 0;

      for (const tranfser of batch) {
        if (shouldStop()) break;

        try {
          await this.cleanTransfer(tranfser);
          deleted += 1;
          deletedInBatch += 1;
        } catch (error) {
          failed += 1;
          this.logger.error("Failed to clean transfer", {
            transferId: tranfser.id,
            err: error,
            failedKeySample:
              error instanceof ObjectDeletionError
                ? error.failedKeys.slice(0, 5)
                : undefined,
          });
        }
      }

      if (deletedInBatch === 0) break;

      if (batch.length < BATCH_SIZE) break;
    }

    const summary = {
      deleted,
      failed,
    };

    if (deleted > 0 || failed > 0) {
      this.logger.info("Cleanup run finished", summary);
    } else {
      this.logger.debug("Cleanup run found nothing to do");
    }
    return summary;
  }

  private async cleanTransfer(transfer: Transfer): Promise<void> {
    const keys = transfer.files.flatMap((file) =>
      chunkKeys(file.r2Prefix, file.chunkCount),
    );

    if (keys.length > 0) await this.objectDeleter.deleteObjects(keys);

    await this.repository.delete(transfer.id);

    this.logger.debug("Transfer cleaned", {
      transferId: transfer.id,
      objectCount: keys.length,
    });
  }
}
