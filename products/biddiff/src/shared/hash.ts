/**
 * Deterministic content hashing.
 *
 * We use FNV-1a (32-bit) folded into a 64-bit composite. This is fast,
 * dependency-free, and good enough for content-addressing within a document.
 * It is NOT cryptographic and must not be used for security purposes.
 */

export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // 32-bit multiply by FNV prime 16777619, kept as unsigned.
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Salt for the second hash pass so the two 32-bit halves are independent. */
const HASH_SALT = " biddiff-content-hash-v1 ";

/** Returns a 16-char lowercase hex hash, stable across platforms. */
export function contentHash(input: string): string {
  // Two INDEPENDENT 32-bit passes folded into 64 bits. The second pass
  // MUST be salted: the old second pass re-hashed the identical input,
  // so both halves were equal and the function delivered only 32-bit
  // collision resistance despite its 16-hex width. Block/change IDs are
  // content hashes and move detection dedups by id, so a 32-bit
  // collision could drop a real change — the salt restores the intended
  // ~64-bit content address.
  const a = fnv1a32(input).toString(16).padStart(8, "0");
  const b = fnv1a32(HASH_SALT + input).toString(16).padStart(8, "0");
  return `${a}${b}`;
}

export function shortHash(input: string): string {
  return fnv1a32(input).toString(16).padStart(8, "0");
}
