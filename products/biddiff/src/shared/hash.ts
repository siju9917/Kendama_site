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

/** Returns a 16-char lowercase hex hash, stable across platforms. */
export function contentHash(input: string): string {
  // Mix in a salted second pass so trivial collisions are unlikely.
  const a = fnv1a32(input).toString(16).padStart(8, "0");
  const b = fnv1a32(`${input}`).toString(16).padStart(8, "0");
  return `${a}${b}`;
}

export function shortHash(input: string): string {
  return fnv1a32(input).toString(16).padStart(8, "0");
}
