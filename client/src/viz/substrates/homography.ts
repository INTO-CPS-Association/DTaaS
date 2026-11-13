/**
 * A homography: the projective map from a plane in the world, such as a road
 * surface in metres, to the pixels of a photograph of it.
 *
 * It is fitted to the point pairs of a calibration by least squares, so four
 * pairs give the exact map and more pairs average out the error of clicking
 * them on the picture.
 */

export type Point = readonly [number, number];

/** The row from `col` down with the largest entry in column `col`. */
function pivotRow(m: number[][], col: number): number {
  let pivot = col;
  for (let r = col + 1; r < m.length; r += 1) {
    if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
  }
  return pivot;
}

/** Solve an upper triangular augmented system from the last row up. */
function backSubstitute(m: number[][]): number[] {
  const n = m.length;
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r -= 1) {
    let sum = m[r][n];
    for (let c = r + 1; c < n; c += 1) sum -= m[r][c] * x[c];
    x[r] = sum / m[r][r];
  }
  return x;
}

/** Solve `a x = b` by Gaussian elimination with partial pivoting. */
function solve(a: number[][], b: number[]): number[] {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col += 1) {
    const pivot = pivotRow(m, col);
    [m[col], m[pivot]] = [m[pivot], m[col]];
    if (Math.abs(m[col][col]) < 1e-12)
      throw new Error('Degenerate calibration');
    for (let r = col + 1; r < n; r += 1) {
      const factor = m[r][col] / m[col][col];
      for (let c = col; c <= n; c += 1) m[r][c] -= factor * m[col][c];
    }
  }
  return backSubstitute(m);
}

/** The two rows one point pair adds to the linear system, with h33 = 1. */
function rows(
  [x, y]: Point,
  [u, v]: Point,
): [number[], number, number[], number] {
  return [
    [x, y, 1, 0, 0, 0, -u * x, -u * y],
    u,
    [0, 0, 0, x, y, 1, -v * x, -v * y],
    v,
  ];
}

/** The map from `from` points to `to` points, as a function of a point. */
export default function fitHomography(
  from: readonly Point[],
  to: readonly Point[],
): (point: Point) => Point {
  const a: number[][] = [];
  const b: number[] = [];
  from.forEach((point, i) => {
    const [r1, b1, r2, b2] = rows(point, to[i]);
    a.push(r1, r2);
    b.push(b1, b2);
  });
  // Least squares through the normal equations: (AᵀA) h = Aᵀb.
  const at = a[0].map((_, c) => a.map((row) => row[c]));
  const ata = at.map((row) =>
    at.map((col) => row.reduce((s, v, k) => s + v * col[k], 0)),
  );
  const atb = at.map((row) => row.reduce((s, v, k) => s + v * b[k], 0));
  const h = [...solve(ata, atb), 1];
  return ([x, y]) => {
    const w = h[6] * x + h[7] * y + h[8];
    return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w];
  };
}
