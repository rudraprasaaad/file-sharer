import { LogContext, Logger } from "../interfaces/logger";
import pino, { type Logger as PinoInstance } from "pino";
import pretty from "pino-pretty";

export interface PinoLoggerOptions {
  readonly level: "debug" | "info" | "warn" | "error";
  readonly pretty: boolean;
}

const REDACTED_PATHS = [
  "password",
  "*.password",
  "passwordHash",
  "*.passwordHash",
  "uploadUrls",
  "*.uploadUrls",
  "downloadUrls",
  "*.downloadUrls",
];

export class PinoLogger implements Logger {
  private constructor(private readonly base: PinoInstance) {}

  static create(options: PinoLoggerOptions): PinoLogger {
    const base = pino(
      {
        level: options.level,
        redact: {
          paths: REDACTED_PATHS,
          censor: "[redacted]",
        },
        formatters: {
          level: (label) => ({
            level: label,
          }),
        },
      },
      options.pretty
        ? pretty({
            colorize: true,
            translateTime: "SYS:HH:MM:ss",
            ignore: "pid,hostname",
          })
        : undefined,
    );

    return new PinoLogger(base);
  }

  debug(message: string, context?: LogContext): void {
    this.base.debug(context ?? {}, message);
  }

  info(message: string, context?: LogContext): void {
    this.base.info(context ?? {}, message);
  }

  warn(message: string, context?: LogContext): void {
    this.base.warn(context ?? {}, message);
  }

  error(message: string, context?: LogContext): void {
    this.base.error(context ?? {}, message);
  }

  child(bindings: LogContext): Logger {
    return new PinoLogger(this.base.child(bindings));
  }
}
