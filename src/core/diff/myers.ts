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
  // dp[i][j] = LCS length of a[0..i), b[0..j)
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (equals(a[i - 1], b[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = dp[i - 1][j] >= dp[i][j - 1] ? dp[i - 1][j] : dp[i][j - 1];
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
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
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
