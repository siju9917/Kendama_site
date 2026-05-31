/**
 * Stable content hashing (two-lane FNV-1a, 64-bit result as 16 hex chars).
 *
 * Used for block / section / change IDs. This MUST be a pure function of
 * `input` — the same string always hashes to the same value, with NO
 * module-level or persistent state. Block/section/change IDs (and hence
 * the entire diff result) depend on this; any hidden state makes the diff
 * engine nondeterministic.
 *
 * History (why this is written so defensively): a prior "salting" attempt
 * carried a mutable module-level `_seed` that was advanced inside the
 * hashing loop and never reset, so `contentHash(x)` returned DIFFERENT
 * values on consecutive calls — silently breaking engine determinism and
 * surfacing as flaky "nondeterministic" / "INVERSION" test failures only
 * under certain run orders. The fix is to have no state at all.
 */

// FNV-1a 32-bit parameters.
const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
// A second-lane offset (golden-ratio constant) so the two 32-bit lanes do
// not start in lockstep; together they form a 64-bit-wide hash.
const LANE2_OFFSET = (FNV_OFFSET_BASIS ^ 0x9e3779b9) >>> 0;

export function contentHash(input: string): string {
  let h1 = FNV_OFFSET_BASIS >>> 0;
  let h2 = LANE2_OFFSET;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, FNV_PRIME) >>> 0;
    // Lane 2 also folds in the position so the lanes diverge for inputs
    // that are permutations of one another, widening the effective space
    // and reducing collisions in the truncated 16-hex output.
    h2 = Math.imul(h2 ^ (c + i), FNV_PRIME) >>> 0;
  }
  const hex1 = h1.toString(16).padStart(8, "0");
  const hex2 = h2.toString(16).padStart(8, "0");
  return (hex1 + hex2).slice(0, 16);
}
