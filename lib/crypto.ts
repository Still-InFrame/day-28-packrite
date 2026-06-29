import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

// AES-256-GCM encryption for per-user Anthropic API keys. The master key lives
// only in APP_ENCRYPTION_KEY (server env) and is never stored or sent to the
// client. We persist only { ciphertext, iv, authTag } — all useless without it.

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // 96-bit nonce, the GCM standard

function masterKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("APP_ENCRYPTION_KEY is not set.");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `APP_ENCRYPTION_KEY must decode to 32 bytes (got ${key.length}). Generate with: openssl rand -base64 32`,
    );
  }
  return key;
}

export interface Encrypted {
  ciphertext: string; // base64
  iv: string; // base64
  authTag: string; // base64
}

export function encrypt(plaintext: string): Encrypted {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, masterKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decrypt({ ciphertext, iv, authTag }: Encrypted): string {
  const decipher = createDecipheriv(
    ALGORITHM,
    masterKey(),
    Buffer.from(iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

// Non-sensitive masked preview for the UI, e.g. "sk-ant-...4f2a".
export function maskKey(key: string): string {
  const trimmed = key.trim();
  const tail = trimmed.slice(-4);
  return `sk-ant-...${tail}`;
}
