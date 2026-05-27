/**
 * Myers diff — a clean LCS-based aligner for sequences of items.
 *
 * Algorithmic core for both block alignment (with custom equality)
 * and token alignment.
 *
 * Returns a list of operations: equal/insert/delete. There is no MODIFY at
 * this layer — MODIFY is computed by a higher-level pass that detects
 * similar-but-not-identical pairs of (delete, insert) and reclassifies.
 */

export type DiffOp<T> =
  | { op: "equal"; value: T; aIndex: number; bIndex: number }
  | { op: "delete"; value: T; aIndex: number }
  | { op: "insert"; value: T; bIndex: number };

/**
 * Standard LCS table → diff operations. O(n*m) time and space; fine for
 * the sizes we deal with at the block/token level. We choose the LCS
 * approach (not the O((n+m)D) Myers variant) for predictability — D can be
 * large on amendments that rewrite a section.
 */
export function diffSequence<T>(
  a: ReadonlyArray<T>,
  b: ReadonlyArray<T>,
  equals: (x: T, y: T) => boolean,
): DiffOp<T>[] {
  const n = a.length;
  const m = b.length;
  // dp packed into a single Int32Array: dp[i*(m+1)+j] = LCS length of a[0..i), b[0..j).
  // Typed-array beats nested-array by ~3x on large tables (less heap pressure,
  // better cache locality) and uses ~75% less memory.
  const stride = m + 1;
  const dp = new Int32Array((n + 1) * stride);
  for (let i = 1; i <= n; i++) {
    const rowBase = i * stride;
    const prevRowBase = (i - 1) * stride;
    for (let j = 1; j <= m; j++) {
      if (equals(a[i - 1], b[j - 1])) {
        dp[rowBase + j] = dp[prevRowBase + j - 1] + 1;
      } else {
        const up = dp[prevRowBase + j];
        const left = dp[rowBase + j - 1];
        dp[rowBase + j] = up >= left ? up : left;
      }
    }
  }
  const ops: DiffOp<T>[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && equals(a[i - 1], b[j - 1])) {
      ops.push({ op: "equal", value: a[i - 1], aIndex: i - 1, bIndex: j - 1 });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i * stride + j - 1] >= dp[(i - 1) * stride + j])) {
      ops.push({ op: "insert", value: b[j - 1], bIndex: j - 1 });
      j--;
    } else {
      ops.push({ op: "delete", value: a[i - 1], aIndex: i - 1 });
      i--;
    }
  }
  ops.reverse();
  return ops;
}
