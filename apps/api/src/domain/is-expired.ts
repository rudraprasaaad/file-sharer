import { Transfer } from "./transfer";

export function isExpired(
  transfer: Pick<Transfer, "expiresAt">,
  now: Date,
): boolean {
  return now.getTime() >= transfer.expiresAt.getTime();
}
