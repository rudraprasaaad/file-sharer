import { IdGenerator } from "../interfaces/id-generator";

const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

const TRANSFER_ID_LENGTH = 12;

export class SecureIdGenerator implements IdGenerator {
  transferId(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(TRANSFER_ID_LENGTH));

    return Array.from(bytes, (byte) =>
      ALPHABET.charAt(byte % ALPHABET.length),
    ).join("");
  }

  fieldId(): string {
    return crypto.randomUUID();
  }
}
