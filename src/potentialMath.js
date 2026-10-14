// Numerical core for the Arbitrary Potential Simulator (harmonic.jsx).
//
// Coordinates are normalized to the plotting area: x in [0, 1] left -> right,
// y in [0, 1] top -> bottom (screen convention). Potential energy is
// V(x) = 1 - y(x), so a valley on screen is a minimum of V.

const GRID_N = 400;          // resample resolution over the drawn span
const MIN_SPAN = 0.15;       // stroke must cover this fraction of the width
const SMOOTH_PERIOD = 0.06;  // wiggles shorter than this (x units) are smoothed out

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Resamples the raw drawing onto a uniform x grid. Every stroke segment is
// rasterized, so fast mouse movement (sparse points) is handled. Where the
// stroke crosses the same x more than once (going back over a section to
// fix it), the most recent pass wins.
export function prepareStroke(points) {
  const pts = [];
  for (const p of points) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    const q = { x: clamp(p.x, 0, 1), y: clamp(p.y, 0, 1) };
    const last = pts[pts.length - 1];
    if (!last || last.x !== q.x || last.y !== q.y) pts.push(q);
  }
  if (pts.length < 2) {
    return { error: 'Draw a curve by clicking and dragging across the graph.' };
  }

  let xa = Infinity, xb = -Infinity;
  for (const p of pts) { xa = Math.min(xa, p.x); xb = Math.max(xb, p.x); }
  if (xb - xa < MIN_SPAN) {
    return { error: 'Draw across more of the graph. Your curve needs to cover a wider range of positions.' };
  }

  const N = GRID_N;
  const dx = (xb - xa) / (N - 1);
  const ys = new Float64Array(N).fill(NaN);
  for (let j = 0; j < pts.length - 1; j++) {
    const { x: x1, y: y1 } = pts[j];
    const { x: x2, y: y2 } = pts[j + 1];
    const lo = Math.min(x1, x2), hi = Math.max(x1, x2);
    const i0 = Math.max(0, Math.ceil((lo - xa) / dx - 1e-9));
    const i1 = Math.min(N - 1, Math.floor((hi - xa) / dx + 1e-9));
    for (let i = i0; i <= i1; i++) {
      const t = hi === lo ? 1 : (xa + i * dx - x1) / (x2 - x1);
      ys[i] = y1 + clamp(t, 0, 1) * (y2 - y1);
    }
  }
  fillGaps(ys);

  const xs = new Float64Array(N);
  for (let i = 0; i < N; i++) xs[i] = xa + i * dx;
  return { xa, xb, xs, ys, pts };
}

function fillGaps(ys) {
  const n = ys.length;
  let prev = -1;
  for (let i = 0; i < n; i++) {
    if (Number.isNaN(ys[i])) continue;
    if (prev === -1) for (let k = 0; k < i; k++) ys[k] = ys[i];
    else for (let k = prev + 1; k < i; k++) ys[k] = ys[prev] + (ys[i] - ys[prev]) * (k - prev) / (i - prev);
    prev = i;
  }
  for (let k = prev + 1; k < n; k++) ys[k] = ys[prev];
}

// Whittaker smoother: minimizes sum (y - z)^2 + lambda * sum (2nd diff of z)^2.
// The system is symmetric pentadiagonal; solved with banded Cholesky in O(n).
export function whittakerSmooth(y, lambda) {
  const n = y.length;
  if (n < 3 || lambda <= 0) return Float64Array.from(y);

  const d0 = new Float64Array(n), d1 = new Float64Array(n - 1), d2 = new Float64Array(n - 2);
  for (let i = 0; i < n; i++) {
    const c = (i === 0 || i === n - 1) ? 1 : (i === 1 || i === n - 2) ? 5 : 6;
    d0[i] = 1 + lambda * c;
  }
  for (let i = 0; i < n - 1; i++) d1[i] = lambda * ((i === 0 || i === n - 2) ? -2 : -4);
  for (let i = 0; i < n - 2; i++) d2[i] = lambda;

  const l0 = new Float64Array(n), l1 = new Float64Array(n), l2 = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    if (i >= 2) l2[i] = d2[i - 2] / l0[i - 2];
    if (i >= 1) l1[i] = (d1[i - 1] - (i >= 2 ? l2[i] * l1[i - 1] : 0)) / l0[i - 1];
    l0[i] = Math.sqrt(d0[i] - l1[i] * l1[i] - l2[i] * l2[i]);
  }
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    w[i] = (y[i] - (i >= 1 ? l1[i] * w[i - 1] : 0) - (i >= 2 ? l2[i] * w[i - 2] : 0)) / l0[i];
  }
  const z = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    z[i] = (w[i] - (i + 1 < n ? l1[i + 1] * z[i + 1] : 0) - (i + 2 < n ? l2[i + 2] * z[i + 2] : 0)) / l0[i];
  }
  return z;
}

// Natural cubic spline through values on a uniform grid over [xa, xb].
export function makeSplineCurve(xa, xb, ys) {
  const n = ys.length;
  const h = (xb - xa) / (n - 1);
  const M = new Float64Array(n);
  const m = n - 2;
  if (m > 0) {
    const cp = new Float64Array(m), dp = new Float64Array(m);
    for (let k = 0; k < m; k++) {
      const i = k + 1;
      const rhs = 6 * (ys[i + 1] - 2 * ys[i] + ys[i - 1]) / (h * h);
      const denom = 4 - (k > 0 ? cp[k - 1] : 0);
      cp[k] = 1 / denom;
      dp[k] = (rhs - (k > 0 ? dp[k - 1] : 0)) / denom;
    }
    for (let k = m - 1; k >= 0; k--) M[k + 1] = dp[k] - (k + 1 < m ? cp[k] * M[k + 2] : 0);
  }
  const locate = (x) => {
    const u = (clamp(x, xa, xb) - xa) / h;
    const i = clamp(Math.floor(u), 0, n - 2);
    return { i, s: (u - i) * h };
  };
  return {
    kind: 'spline', xa, xb,
    y(x) {
      const { i, s } = locate(x);
      const r = h - s;
      return M[i] * r * r * r / (6 * h) + M[i + 1] * s * s * s / (6 * h)
        + (ys[i] / h - M[i] * h / 6) * r + (ys[i + 1] / h - M[i + 1] * h / 6) * s;
    },
    dy(x) {
      if (x < xa || x > xb) return 0;
      const { i, s } = locate(x);
      const r = h - s;
      return -M[i] * r * r / (2 * h) + M[i + 1] * s * s / (2 * h)
        - (ys[i] / h - M[i] * h / 6) + (ys[i + 1] / h - M[i + 1] * h / 6);
    },
  };
}

// Least-squares polynomial in the Chebyshev basis, solved by Householder QR.
// The old monomial basis + normal equations loses all precision at degree 16.
export function makePolynomialCurve(xs, ys, degree, xa, xb) {
  const m = xs.length, n = degree + 1;
  if (m < n) return null;
  const toT = (x) => 2 * (x - xa) / (xb - xa) - 1;
  const A = Array.from({ length: m }, (_, i) => {
    const t = toT(xs[i]);
    const row = new Float64Array(n);
    row[0] = 1;
    if (n > 1) row[1] = t;
    for (let k = 2; k < n; k++) row[k] = 2 * t * row[k - 1] - row[k - 2];
    return row;
  });
  const c = leastSquaresQR(A, ys, n);
  if (!c) return null;

  // Coefficients of the derivative series (with respect to t).
  const dc = new Float64Array(n + 1);
  for (let k = n - 1; k >= 1; k--) dc[k - 1] = dc[k + 1] + 2 * k * c[k];
  dc[0] /= 2;

  const series = (coef, len, t) => {
    let b1 = 0, b2 = 0;
    for (let k = len - 1; k >= 1; k--) {
      const b0 = coef[k] + 2 * t * b1 - b2;
      b2 = b1; b1 = b0;
    }
    return coef[0] + t * b1 - b2;
  };
  return {
    kind: 'polynomial', degree, xa, xb,
    y: (x) => series(c, n, toT(clamp(x, xa, xb))),
    dy: (x) => (x < xa || x > xb) ? 0 : series(dc, Math.max(1, n - 1), toT(x)) * 2 / (xb - xa),
  };
}

function leastSquaresQR(A, b, n) {
  const m = A.length;
  const R = A.map(r => Float64Array.from(r));
  const y = Float64Array.from(b);
  for (let k = 0; k < n; k++) {
    let norm = 0;
    for (let i = k; i < m; i++) norm += R[i][k] * R[i][k];
    norm = Math.sqrt(norm);
    if (norm === 0) return null;
    const alpha = R[k][k] > 0 ? -norm : norm;
    const v = new Float64Array(m);
    v[k] = R[k][k] - alpha;
    for (let i = k + 1; i < m; i++) v[i] = R[i][k];
    let vv = 0;
    for (let i = k; i < m; i++) vv += v[i] * v[i];
    if (vv === 0) continue;
    for (let j = k; j < n; j++) {
      let s = 0;
      for (let i = k; i < m; i++) s += v[i] * R[i][j];
      s = 2 * s / vv;
      for (let i = k; i < m; i++) R[i][j] -= s * v[i];
    }
    let s = 0;
    for (let i = k; i < m; i++) s += v[i] * y[i];
    s = 2 * s / vv;
    for (let i = k; i < m; i++) y[i] -= s * v[i];
  }
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i];
    for (let j = i + 1; j < n; j++) s -= R[i][j] * x[j];
    if (Math.abs(R[i][i]) < 1e-14) return null;
    x[i] = s / R[i][i];
  }
  return x.every(Number.isFinite) ? x : null;
}

// The blue curve: the smoothed drawing, or a global polynomial fit to it.
export function buildCurve(prepared, degree = 'none') {
  const { xa, xb, xs, ys } = prepared;
  if (degree === 'none' || degree == null) {
    const periodSamples = SMOOTH_PERIOD * (ys.length - 1) / (xb - xa);
    const lambda = Math.pow(periodSamples / (2 * Math.PI), 4);
    return makeSplineCurve(xa, xb, whittakerSmooth(ys, lambda));
  }
  return makePolynomialCurve(xs, ys, parseInt(degree, 10), xa, xb);
}

const ANALYSIS_N = 1200;   // dense sampling for minimum finding
const PROM_FRAC = 0.12;    // a valley must be this deep relative to the curve's range...
const PROM_ABS = 0.06;     // ...and at least this deep in absolute terms
const FIT_FRAC = 0.25;     // fit the quadratic over the bottom 25% of the well
const VALID_FRAC = 0.06;   // "valid" while the quadratic is within 6% of the well depth
const FLAT_MIN = 0.06;     // curves whose total rise is less than this count as flat

// Finds the deepest real valley and its harmonic approximation
// V ~ V0 + k/2 (x - x0)^2. Returns { error } if there is no usable valley.
export function analyzeCurve(curve) {
  const { xa, xb } = curve;
  const N = ANALYSIS_N;
  const dxs = (xb - xa) / (N - 1);
  const xs = new Float64Array(N), V = new Float64Array(N);
  let vMin = Infinity, vMax = -Infinity;
  for (let i = 0; i < N; i++) {
    xs[i] = xa + i * dxs;
    V[i] = 1 - curve.y(xs[i]);
    if (!Number.isFinite(V[i])) return { error: 'Could not evaluate the fitted curve. Try drawing again.' };
    vMin = Math.min(vMin, V[i]);
    vMax = Math.max(vMax, V[i]);
  }
  if (vMax - vMin < FLAT_MIN) {
    return { error: 'Your curve is almost flat. Draw a curve with a clear valley (local minimum).' };
  }
  const thr = Math.max(PROM_FRAC * (vMax - vMin), PROM_ABS);

  // Strict local minima; a flat run counts once, at its middle.
  const minima = [];
  for (let i = 1; i < N - 1; i++) {
    if (!(V[i] < V[i - 1])) continue;
    let j = i;
    while (j + 1 < N && V[j + 1] === V[i]) j++;
    if (j + 1 < N && V[j + 1] > V[i]) minima.push((i + j) >> 1);
    i = j;
  }

  // Keep only valleys whose walls rise by at least thr on both sides before
  // anything lower appears. This rejects leftover wobble and valleys that
  // run off the end of the drawing.
  let m = -1;
  for (const c of minima) {
    let left = -Infinity, right = -Infinity;
    for (let k = c - 1; k >= 0 && V[k] >= V[c]; k--) left = Math.max(left, V[k]);
    for (let k = c + 1; k < N && V[k] >= V[c]; k++) right = Math.max(right, V[k]);
    if (Math.min(left, right) - V[c] >= thr && (m === -1 || V[c] < V[m])) m = c;
  }
  if (m === -1) {
    return { error: "No valley found. Make sure your curve dips down and comes back up on both sides." };
  }

  // Basin edges: the nearest real hump on each side (bumps smaller than thr
  // are ignored), or the end of the drawing.
  const barrier = (dir) => {
    let run = V[m], idx = m;
    for (let k = m + dir; k >= 0 && k < N; k += dir) {
      if (V[k] > run) { run = V[k]; idx = k; }
      else if (V[k] < run - thr) break;
    }
    return idx;
  };
  const bL = barrier(-1), bR = barrier(1);

  // Locate the minimum between samples (parabola through 3 points).
  let x0 = xs[m];
  const den = V[m - 1] - 2 * V[m] + V[m + 1];
  if (den > 1e-12) x0 += clamp(0.5 * (V[m - 1] - V[m + 1]) / den, -1, 1) * dxs;
  let V0 = Math.min(1 - curve.y(x0), V[m]);
  const minimum = { x: x0, y: 1 - V0 };  // lowest point of the curve (cyan dot)
  const depth = Math.max(Math.min(V[bL], V[bR]) - V0, 1e-6);

  // Least-squares parabola over the bottom FIT_FRAC of the well. The window
  // scales with the well instead of being a fixed width, and fitting the
  // vertex too (rather than pinning it to the single lowest sample) averages
  // out hand wobble, which otherwise decides where the "minimum" is.
  let iL = m, iR = m;
  while (iL - 1 >= bL && V[iL - 1] - V0 <= FIT_FRAC * depth) iL--;
  while (iR + 1 <= bR && V[iR + 1] - V0 <= FIT_FRAC * depth) iR++;
  iL = Math.max(bL, Math.min(iL, m - 6));
  iR = Math.min(bR, Math.max(iR, m + 6));
  let k = 0;
  {
    // Normal equations for a + b d + c d^2 with d centered and scaled: 3x3, well conditioned.
    const xc = xs[m], sc = Math.max(xs[iR] - xc, xc - xs[iL]);
    const S = [0, 0, 0, 0, 0], T = [0, 0, 0];
    for (let i = iL; i <= iR; i++) {
      const d = (xs[i] - xc) / sc;
      let p = 1;
      for (let e = 0; e < 5; e++) { S[e] += p; if (e < 3) T[e] += p * V[i]; p *= d; }
    }
    const sol = solve3([[S[0], S[1], S[2]], [S[1], S[2], S[3]], [S[2], S[3], S[4]]], T);
    if (sol && sol[2] > 0) {
      const [a0, b1, c2] = sol;
      const dv = clamp(-b1 / (2 * c2), (xs[iL] - xc) / sc, (xs[iR] - xc) / sc);
      x0 = xc + dv * sc;
      V0 = a0 + b1 * dv + c2 * dv * dv;
      k = 2 * c2 / (sc * sc);
    }
  }
  if (!(k > 0) || !Number.isFinite(k)) {
    const half = Math.max(xs[iR] - x0, x0 - xs[iL], dxs);
    k = 2 * FIT_FRAC * depth / (half * half);
  }
  const quadV = (x) => V0 + 0.5 * k * (x - x0) ** 2;

  // Valid range: where the parabola stays close to the curve, within the basin.
  const tol = Math.max(VALID_FRAC * depth, 0.004);
  // It always includes the region the parabola was fitted to, so a wobble
  // dimple at the very bottom can't shrink it to a sliver.
  const i0 = clamp(Math.round((x0 - xa) / dxs), 0, N - 1);
  let vl = Math.min(iL, i0), vr = Math.max(iR, i0);
  while (vl - 1 >= bL && Math.abs(V[vl - 1] - quadV(xs[vl - 1])) <= tol) vl--;
  while (vr + 1 <= bR && Math.abs(V[vr + 1] - quadV(xs[vr + 1])) <= tol) vr++;
  const left = xs[vl], right = xs[vr];

  return {
    curve, minimum, x0, y0: 1 - V0, k, depth: Math.max(Math.min(V[bL], V[bR]) - V0, 1e-6),
    range: { left, right },
    basin: { left: xs[bL], right: xs[bR], spillV: V0 + depth },
  };
}

function solve3(A, b) {
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < 3; c++) {
    let p = c;
    for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-14) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < 3; r++) {
      const f = M[r][c] / M[c][c];
      for (let j = c; j < 4; j++) M[r][j] -= f * M[c][j];
    }
  }
  const x = [0, 0, 0];
  for (let r = 2; r >= 0; r--) {
    let v = M[r][3];
    for (let j = r + 1; j < 3; j++) v -= M[r][j] * x[j];
    x[r] = v / M[r][r];
  }
  return x;
}

// Screen-y of the harmonic approximation.
export function quadY(a, x) {
  return a.y0 - 0.5 * a.k * (x - a.x0) ** 2;
}

const TARGET_PERIOD = 2.5;  // seconds per oscillation of the quadratic particle
const RUN_OSCILLATIONS = 2;  // each particle stops after this many full oscillations

const MIN_ENERGY = 0.3;   // release at least this far up the well (fraction of depth)
const MAX_RUN = 10 * TARGET_PERIOD;  // safety net: no run lasts longer than this

// Both particles start at rest at the same x, near the edge of the valid range,
// high enough up the wall that the real-curve particle can cross small ripples
// in the bottom, and below the lower rim so it stays in the well.
export function initialState(a) {
  const { x0, range, basin, curve, depth, minimum } = a;
  const V = (x) => 1 - curve.y(x);
  const Vmin = 1 - minimum.y;
  const ceiling = basin.spillV - 0.1 * depth;
  const pick = (A) => {
    const options = [x0 - A, x0 + A].filter(x => x >= basin.left && x <= basin.right);
    if (!options.length) return null;
    return options.reduce((p, q) => (V(q) < V(p) ? q : p));
  };

  const near = Math.min(x0 - range.left, range.right - x0);
  const far = Math.max(x0 - range.left, range.right - x0);
  let amp = Math.max(near, 0.5 * far, 1e-3);
  let start = pick(amp);
  while (!start && amp > 1e-4) { amp *= 0.9; start = pick(amp); }
  if (!start) { amp = 0; start = x0; }

  for (let i = 0; i < 300 && V(start) - Vmin < MIN_ENERGY * depth; i++) {
    const next = pick(amp * 1.03);
    if (next === null || V(next) >= ceiling) break;
    amp *= 1.03;
    start = next;
  }
  for (let i = 0; i < 100 && V(start) >= ceiling && amp > 1e-4; i++) {
    amp *= 0.95;
    start = pick(amp) ?? start;
  }

  // Mass chosen so the harmonic period is the same for every drawing.
  const omega = 2 * Math.PI / TARGET_PERIOD;
  // home: release point; sign: direction of travel; turns: turning points passed.
  const particle = () => ({ x: start, v: 0, home: start, sign: 0, turns: 0, done: false });
  return {
    t: 0,
    amp: Math.abs(start - x0),
    mass: a.k / (omega * omega),
    quad: particle(),
    real: particle(),
    done: false,
  };
}

// Advances both particles by dt seconds with velocity Verlet (energy
// conserving, unlike the old step-and-clamp). Force is -dV/dx = dy/dx.
export function stepState(a, s, dt) {
  const { curve, x0, k } = a;
  const m = s.mass;
  const accQ = (x) => -k * (x - x0) / m;
  const accR = (x) => curve.dy(x) / m;
  const steps = Math.max(1, Math.ceil(dt / (TARGET_PERIOD / 400)));
  const h = dt / steps;
  // A full oscillation is two turning points (velocity reversals). After
  // 2 * RUN_OSCILLATIONS of them the particle is back at its release point,
  // where it is parked while the other particle finishes.
  const advance = (p, acc, walls) => {
    if (p.done) return p;
    let { x, v, sign, turns } = p;
    let ax = acc(x);
    for (let i = 0; i < steps; i++) {
      x += v * h + 0.5 * ax * h * h;
      if (walls) {
        if (x < curve.xa) { x = 2 * curve.xa - x; v = -v; }
        if (x > curve.xb) { x = 2 * curve.xb - x; v = -v; }
      }
      const an = acc(x);
      v += 0.5 * (ax + an) * h;
      ax = an;
      const sg = Math.sign(v);
      if (sg !== 0) {
        if (sign !== 0 && sg !== sign && ++turns >= 2 * RUN_OSCILLATIONS) {
          return { ...p, x: p.home, v: 0, sign: sg, turns, done: true };
        }
        sign = sg;
      }
    }
    return { ...p, x, v, sign, turns };
  };
  let quad = advance(s.quad, accQ, false);
  let real = advance(s.real, accR, true);
  const t = s.t + dt;
  if (t > MAX_RUN) {
    // Should never trigger; guarantees a run always ends, back at the start.
    const park = (p) => ({ ...p, x: p.home, v: 0, done: true });
    quad = park(quad);
    real = park(real);
  }
  return { ...s, t, quad, real, done: quad.done && real.done };
}

// Total energy per particle, for checks.
export function energies(a, s) {
  const Vq = (1 - quadY(a, s.quad.x));
  const Vr = 1 - a.curve.y(s.real.x);
  return {
    quad: 0.5 * s.mass * s.quad.v ** 2 + Vq,
    real: 0.5 * s.mass * s.real.v ** 2 + Vr,
  };
}
