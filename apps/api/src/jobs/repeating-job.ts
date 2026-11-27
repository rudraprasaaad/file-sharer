import { Logger } from "../interfaces/logger";

export interface RepeatingJobOptions {
  readonly name: string;
  readonly task: (shouldStop: () => boolean) => Promise<void>;
  readonly intervalMs: number;
  readonly initialDelayMs: number;
  readonly logger: Logger;
}

export class RepeatingJob {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private currentRun: Promise<void> | undefined;
  private stopping = false;

  constructor(private readonly options: RepeatingJobOptions) {}

  start(): void {
    this.scheduleNext(this.options.initialDelayMs);
  }

  async stop(): Promise<void> {
    this.stopping = true;
    if (this.timer !== undefined) clearTimeout(this.timer);
    await this.currentRun;
  }

  private scheduleNext(delayMs: number): void {
    if (this.stopping) return;

    this.timer = setTimeout(() => {
      this.currentRun = this.runSafely().finally(() => {
        this.currentRun = undefined;
        this.scheduleNext(this.options.intervalMs);
      });
    }, delayMs);
  }

  private async runSafely(): Promise<void> {
    try {
      await this.options.task(() => this.stopping);
    } catch (error) {
      this.options.logger.error("Job run failed", {
        job: this.options.name,
        err: Error,
      });
    }
  }
}
