import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Info } from 'lucide-react';

const PotentialSimulator = () => {
  const [points, setPoints] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [polynomial, setPolynomial] = useState(null);
  const [spline, setSpline] = useState(null);
  const [quadratic, setQuadratic] = useState(null);
  const [minimum, setMinimum] = useState(null);
  const [validRange, setValidRange] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [particlePos, setParticlePos] = useState(null);
  const [particleVel, setParticleVel] = useState(0);
  // New state for spline-following particle
  const [splineParticlePos, setSplineParticlePos] = useState(null);
  const [splineParticleVel, setSplineParticleVel] = useState(0);
  const [error, setError] = useState('');
  const [showInfo, setShowInfo] = useState(true);
  // State for polynomial degree selection
  const [polynomialDegree, setPolynomialDegree] = useState('none');
  const [globalPolynomial, setGlobalPolynomial] = useState(null);
  
  const canvasRef = useRef(null);
  const zoomCanvasRef = useRef(null);
  const animationRef = useRef(null);
  const particlePosRef = useRef(null);
  const particleVelRef = useRef(0);
  // New refs for spline-following particle
  const splineParticlePosRef = useRef(null);
  const splineParticleVelRef = useRef(0);
  
  const width = 600;
  const height = 300;
  const zoomWidth = 600;
  const zoomHeight = 200;
  const padding = 40;

  // Polynomial fitting using least squares
  const fitPolynomial = (pts, degree) => {
    const n = pts.length;
    if (n < degree + 1) return null;
    
    // Normalize x values to [-1, 1] for numerical stability
    const xMin = Math.min(...pts.map(p => p.x));
    const xMax = Math.max(...pts.map(p => p.x));
    const xRange = xMax - xMin;
    
    // Build Vandermonde matrix
    const X = [];
    const y = [];
    
    for (let i = 0; i < n; i++) {
      const xNorm = 2 * (pts[i].x - xMin) / xRange - 1;
      const row = [];
      for (let j = 0; j <= degree; j++) {
        row.push(Math.pow(xNorm, j));
      }
      X.push(row);
      y.push(pts[i].y);
    }
    
    // Solve normal equations X^T X a = X^T y
    const XtX = Array(degree + 1).fill(0).map(() => Array(degree + 1).fill(0));
    const Xty = Array(degree + 1).fill(0);
    
    for (let i = 0; i <= degree; i++) {
      for (let j = 0; j <= degree; j++) {
        for (let k = 0; k < n; k++) {
          XtX[i][j] += X[k][i] * X[k][j];
        }
      }
      for (let k = 0; k < n; k++) {
        Xty[i] += X[k][i] * y[k];
      }
    }
    
    // Gaussian elimination
    const coeffs = gaussianElimination(XtX, Xty);
    
    return { coeffs, xMin, xRange };
  };
  
  const gaussianElimination = (A, b) => {
    const n = A.length;
    const M = A.map((row, i) => [...row, b[i]]);
    
    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
          maxRow = k;
        }
      }
      [M[i], M[maxRow]] = [M[maxRow], M[i]];
      
      for (let k = i + 1; k < n; k++) {
        const c = M[k][i] / M[i][i];
        for (let j = i; j <= n; j++) {
          M[k][j] -= c * M[i][j];
        }
      }
    }
    
    const x = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = M[i][n];
      for (let j = i + 1; j < n; j++) {
        x[i] -= M[i][j] * x[j];
      }
      x[i] /= M[i][i];
    }
    
    return x;
  };
  
  // Cubic spline interpolation
  const fitCubicSpline = (points) => {
    const n = points.length;
    if (n < 2) return null;
    
    // Sort points by x
    const sorted = [...points].sort((a, b) => a.x - b.x);
    
    // Remove duplicate x values - for duplicates, average the y values
    const uniqueX = [];
    const tolerance = 0.001; // Small tolerance for floating point comparison
    
    let i = 0;
    while (i < sorted.length) {
      let sumY = sorted[i].y;
      let count = 1;
      let j = i + 1;
      
      // Find all points with similar x values and average their y values
      while (j < sorted.length && Math.abs(sorted[j].x - sorted[i].x) < tolerance) {
        sumY += sorted[j].y;
        count++;
        j++;
      }
      
      // Add the averaged point
      uniqueX.push({
        x: sorted[i].x,
        y: sumY / count
      });
      
      i = j;
    }
    
    // If we don't have enough unique points after removing duplicates, return null
    if (uniqueX.length < 2) return null;
    
    // Reduce points to avoid having too many at similar x values
    // Keep approximately 50-100 well-distributed points
    const targetPoints = Math.min(80, Math.max(20, Math.floor(uniqueX.length / 5)));
    const reduced = [];
    const step = Math.max(1, Math.floor(uniqueX.length / targetPoints));
    
    for (let i = 0; i < uniqueX.length; i += step) {
      reduced.push(uniqueX[i]);
    }
    // Always include the last point
    if (reduced[reduced.length - 1] !== uniqueX[uniqueX.length - 1]) {
      reduced.push(uniqueX[uniqueX.length - 1]);
    }
    
    // Extract x and y arrays from reduced set
    const x = reduced.map(p => p.x);
    const y = reduced.map(p => p.y);
    
    const nReduced = reduced.length;
    
    // Build tridiagonal system for natural cubic spline
    // We need to solve for the second derivatives (M values)
    const h = Array(nReduced - 1).fill(0);
    for (let i = 0; i < nReduced - 1; i++) {
      h[i] = x[i + 1] - x[i];
    }
    
    // Build the system matrix (tridiagonal)
    const A = Array(nReduced).fill(0).map(() => Array(nReduced).fill(0));
    const b = Array(nReduced).fill(0);
    
    // Natural boundary conditions: M[0] = M[n-1] = 0
    A[0][0] = 1;
    A[nReduced - 1][nReduced - 1] = 1;
    
    // Interior points
    for (let i = 1; i < nReduced - 1; i++) {
      A[i][i - 1] = h[i - 1];
      A[i][i] = 2 * (h[i - 1] + h[i]);
      A[i][i + 1] = h[i];
      b[i] = 6 * ((y[i + 1] - y[i]) / h[i] - (y[i] - y[i - 1]) / h[i - 1]);
    }
    
    // Solve for M (second derivatives)
    const M = gaussianElimination(A, b);
    
    return { x, y, M, h };
  };
  
  const evaluateCubicSpline = (spline, xVal) => {
    if (!spline) return 0;
    
    const { x, y, M, h } = spline;
    const n = x.length;
    
    // Handle boundary cases
    if (xVal <= x[0]) return y[0];
    if (xVal >= x[n - 1]) return y[n - 1];
    
    // Find the interval containing xVal
    let i = 0;
    for (i = 0; i < n - 1; i++) {
      if (xVal >= x[i] && xVal <= x[i + 1]) break;
    }
    
    // Evaluate cubic polynomial on this interval
    const t = xVal - x[i];
    const hi = h[i];
    
    const a = M[i] / (6 * hi);
    const b = M[i + 1] / (6 * hi);
    const c = (y[i] / hi) - (M[i] * hi / 6);
    const d = (y[i + 1] / hi) - (M[i + 1] * hi / 6);
    
    return a * Math.pow(hi - t, 3) + b * Math.pow(t, 3) + c * (hi - t) + d * t;
  };
  
  const evaluatePolynomial = (poly, x) => {
    const xNorm = 2 * (x - poly.xMin) / poly.xRange - 1;
    let result = 0;
    for (let i = 0; i < poly.coeffs.length; i++) {
      result += poly.coeffs[i] * Math.pow(xNorm, i);
    }
    return result;
  };
  
  const findLocalMinima = (poly, xMin, xMax, samples = 20) => {
    const minima = [];
    const step = (xMax - xMin) / samples;
    
    for (let i = 2; i < samples - 2; i++) {
      const x = xMin + i * step;
      const y = evaluatePolynomial(poly, x);
      const yPrev = evaluatePolynomial(poly, x - step);
      const yNext = evaluatePolynomial(poly, x + step);
      const yPrev2 = evaluatePolynomial(poly, x - 2 * step);
      const yNext2 = evaluatePolynomial(poly, x + 2 * step);
      
      // Check if it's a local minimum (not maximum)
      if ((y >= yPrev ||y >= yPrev2) && (y >= yNext || y >= yNext2)) {
        minima.push({ x, y });
      }
    }
    
    return minima;
  };
  
  const findLocalMinimaFromSpline = (spline, xMin, xMax, samples = 200) => {
    const minima = [];
    const step = (xMax - xMin) / samples;
    
    for (let i = 2; i < samples - 2; i++) {
      const x = xMin + i * step;
      const y = evaluateCubicSpline(spline, x);
      const yPrev = evaluateCubicSpline(spline, x - step);
      const yNext = evaluateCubicSpline(spline, x + step);
      const yPrev2 = evaluateCubicSpline(spline, x - 2 * step);
      const yNext2 = evaluateCubicSpline(spline, x + 2 * step);
      
      // Check if it's a local minimum (not maximum)
      if ((y >= yPrev ||y >= yPrev2) && (y >= yNext || y >= yNext2)){
        minima.push({ x, y });
      }
    }
    
    return minima;
  };
  
  const fitQuadraticAtMinimum = (spline, minX, windowSize = 0.15) => {
    const samples = [];
    const xMin = Math.max(0, minX - windowSize);
    const xMax = Math.min(1, minX + windowSize);
    
    // Sample points from the spline
    for (let i = 0; i <= 30; i++) {
      const x = xMin + (xMax - xMin) * i / 30;
      const y = evaluateCubicSpline(spline, x);
      samples.push({ x, y });
    }
    
    return fitPolynomial(samples, 2);
  };
  
   
  const findValidRangeFromSpline = (spline, quad, minX, tolerance = 0.02) => {
    let leftX = minX;
    let rightX = minX;
    const step = 0.01;
    
    // Find left boundary
    for (let x = minX; x >= 0; x -= step) {
      const diff = Math.abs(evaluateCubicSpline(spline, x) - evaluatePolynomial(quad, x));
      if (diff > tolerance) break;
      leftX = x;
    }
    
    // Find right boundary
    for (let x = minX; x <= 1; x += step) {
      const diff = Math.abs(evaluateCubicSpline(spline, x) - evaluatePolynomial(quad, x));
      if (diff > tolerance) break;
      rightX = x;
    }
    
    return { left: leftX, right: rightX };
  };
  
  const handleMouseDown = (e) => {
    if (simulating) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - padding) / (width - 2 * padding);
    const y = (e.clientY - rect.top - padding) / (height - 2 * padding);
    
    if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
      setIsDrawing(true);
      setPoints([{ x, y }]);
      setPolynomial(null);
      setSpline(null);
      setQuadratic(null);
      setMinimum(null);
      setValidRange(null);
      setError('');
    }
  };
  
  const handleMouseMove = (e) => {
    if (!isDrawing || simulating) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - padding) / (width - 2 * padding);
    const y = (e.clientY - rect.top - padding) / (height - 2 * padding);
    
    if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
      setPoints(prev => [...prev, { x, y }]);
    }
  };
  
  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    if (points.length < 10) {
      setError('Draw more points (click and drag)');
      return;
    }
    
    // Fit cubic spline
    const splineResult = fitCubicSpline(points);
    if (!splineResult) {
      setError('Could not fit spline to the points');
      return;
    }
    setSpline(splineResult);
    
    // Fit global polynomial if selected
    let globalPolyResult = null;
    if (polynomialDegree !== 'none') {
      const degree = parseInt(polynomialDegree);
      globalPolyResult = fitPolynomial(points, degree);
      if (!globalPolyResult) {
        setError(`Could not fit ${degree}-degree polynomial to the points`);
        return;
      }
      setGlobalPolynomial(globalPolyResult);
    } else {
      setGlobalPolynomial(null);
    }
    
    // Find local minima
    const minima = findLocalMinimaFromSpline(splineResult, 0, 1);
    
    if (minima.length === 0) {
      setError('No local minimum found. Draw a curve with at least one valley.');
      setSpline(null);
      return;
    }
    
    // Find the deepest minimum
    let deepestMin = minima[0];
    for (const min of minima) {
      if (min.y > deepestMin.y) {
        deepestMin = min;
      }
    }
    setMinimum(deepestMin);
    
    // Fit quadratic around the minimum
    const quad = fitQuadraticAtMinimum(splineResult, deepestMin.x);
    if (!quad) {
      setError('Could not fit quadratic approximation');
      return;
    }
    setQuadratic(quad);
    
    // Find valid range where quadratic approximation is good (compare to spline, not polynomial)
    const range = findValidRangeFromSpline(splineResult, quad, deepestMin.x);
    
    // Check if valid range is too small
    const rangeSize = range.right - range.left;
    const minRangeSize = 0.05; // Minimum range size (5% of total width)
    
    if (rangeSize < minRangeSize) {
      setError(`Valid range too small (${(rangeSize * 100).toFixed(1)}% of width). Please draw a smoother, wider valley. Try making your minimum less sharp.`);
      setQuadratic(null);
      setMinimum(null);
      setValidRange(null);
      return;
    }
    
    setValidRange(range);
    
    setError('');
  };
  
  const reset = () => {
    setPoints([]);
    setPolynomial(null);
    setSpline(null);
    setQuadratic(null);
    setMinimum(null);
    setValidRange(null);
    setSimulating(false);
    setParticlePos(null);
    setParticleVel(0);
    setSplineParticlePos(null);
    setSplineParticleVel(0);
    setGlobalPolynomial(null);
    setError('');
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };
  
  // Analytical derivative for cubic spline
  const getSplineDerivative = (spline, xVal) => {
    if (!spline) return 0;
    
    const { x, y, M, h } = spline;
    const n = x.length;
    
    // Handle boundary cases
    if (xVal <= x[0]) {
      // Use derivative at the first interval
      const t = 0;
      const hi = h[0];
      const a = M[0] / (6 * hi);
      const b = M[1] / (6 * hi);
      const c = (y[0] / hi) - (M[0] * hi / 6);
      const d = (y[1] / hi) - (M[1] * hi / 6);
      return -3 * a * hi * hi + 3 * b * 0 - c + d;
    }
    if (xVal >= x[n - 1]) {
      // Use derivative at the last interval
      const i = n - 2;
      const t = h[i];
      const hi = h[i];
      const a = M[i] / (6 * hi);
      const b = M[i + 1] / (6 * hi);
      const c = (y[i] / hi) - (M[i] * hi / 6);
      const d = (y[i + 1] / hi) - (M[i + 1] * hi / 6);
      return -3 * a * 0 + 3 * b * t * t - c + d;
    }
    
    // Find the interval containing xVal
    let i = 0;
    for (i = 0; i < n - 1; i++) {
      if (xVal >= x[i] && xVal <= x[i + 1]) break;
    }
    
    // Compute derivative of cubic polynomial on this interval
    // Original spline: S(x) = a(hi-t)³ + bt³ + c(hi-t) + dt
    // Derivative: S'(x) = -3a(hi-t)² + 3bt² - c + d
    const t = xVal - x[i];
    const hi = h[i];
    
    const a = M[i] / (6 * hi);
    const b = M[i + 1] / (6 * hi);
    const c = (y[i] / hi) - (M[i] * hi / 6);
    const d = (y[i + 1] / hi) - (M[i + 1] * hi / 6);
    
    return -3 * a * Math.pow(hi - t, 2) + 3 * b * Math.pow(t, 2) - c + d;
  };
  
  // Animation loop
  useEffect(() => {
  let doneOneQ = false;
   let doneOneS = false;
    if (!simulating || !quadratic || !validRange || !spline) return;
    
    const animate = () => {
      const dt = 0.016; // ~60fps
      const k = 50; // Spring constant for quadratic
      const m = 1; // Mass
      
      // Update quadratic-following particle (green)
      let x = particlePosRef.current;
      let v = particleVelRef.current;
      
      if (x !== null) {
        // Calculate force from quadratic potential: F = -dV/dx
        const h = 0.0001;
        const V1 = evaluatePolynomial(quadratic, x + h);
        const V2 = evaluatePolynomial(quadratic, x - h);
        const force = (V1 - V2) / (2 * h);
        
        const a = force / m;
        v += a * dt;
        x += v * dt;
        
        // Reflect at boundaries
        if (x < validRange.left+.002 && doneOneQ) {
           x = validRange.left;
         v = 0;
        }
        else if (x > validRange.right-.002 && doneOneQ) {
          x = validRange.right;
          v = 0;
        }
        else{
        doneOneQ = true;
        }
        
        particlePosRef.current = x;
        particleVelRef.current = v;
        setParticlePos(x);
        setParticleVel(v);
      }
      
      // Update spline-following particle (orange)
      let xSpline = splineParticlePosRef.current;
      let vSpline = splineParticleVelRef.current;
      
      if (xSpline !== null) {
        // Calculate force from spline potential: F = -dV/dx
        const forceSpline = getSplineDerivative(spline, xSpline);
        
        const aSpline = forceSpline / m;
        vSpline += aSpline * dt;
        xSpline += vSpline * dt;
        
        // Reflect at boundaries (use same boundaries as quadratic for consistency)
        if (xSpline < validRange.left+.003 && doneOneS) {
          xSpline = validRange.left;
          vSpline = 0;
        }
        else if (xSpline > validRange.right-.003 && doneOneS) {
         xSpline = validRange.right;
          vSpline = 0;
        }
        else{
        doneOneS = true;
        }
        
        splineParticlePosRef.current = xSpline;
        splineParticleVelRef.current = vSpline;
        setSplineParticlePos(xSpline);
        setSplineParticleVel(vSpline);
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [simulating, quadratic, validRange, spline]);
  
  const drawCanvas = (canvas, showParticle = false) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const isZoom = canvas === zoomCanvasRef.current;
    
    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, w, h);
    
    // Draw axes
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, h - padding);
    ctx.lineTo(w - padding, h - padding);
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, h - padding);
    ctx.stroke();
    
    // Add labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.fillText('Position', w / 2 - 20, h - 10);
    ctx.save();
    ctx.translate(15, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Potential Energy', 0, 0);
    ctx.restore();
    
    const toCanvasX = (x) => padding + (w - 2 * padding) * x;
    const toCanvasY = (y) => padding + (h - 2 * padding) * y;
    
    // Determine zoom range
    let zoomXMin = 0, zoomXMax = 1, zoomYMin = 0, zoomYMax = 1;
    if (isZoom && validRange && spline) {
      const center = (validRange.left + validRange.right) / 2;
      const range = (validRange.right - validRange.left) * 1.5;
      
      zoomXMin = Math.max(0, center - range / 2);
      zoomXMax = Math.min(1, center + range / 2);
      
      // Calculate Y range for zoom based on spline in the x range
      const samples = 50;
      const yValues = [];
      for (let i = 0; i <= samples; i++) {
        const x = zoomXMin + (zoomXMax - zoomXMin) * i / samples;
        yValues.push(evaluateCubicSpline(spline, x));
      }
      const minY = Math.min(...yValues);
      const maxY = Math.max(...yValues);
      const yRange = maxY - minY;
      const yPadding = yRange * 0.2; // Add 20% padding
      zoomYMin = Math.max(0, minY - yPadding);
      zoomYMax = Math.min(1, maxY + yPadding);
    }
    
    // Coordinate transformation functions (zoom-aware)
    const toZoomCanvasX = (x) => {
      if (isZoom) {
        const normalizedX = (x - zoomXMin) / (zoomXMax - zoomXMin);
        return padding + (w - 2 * padding) * normalizedX;
      }
      return toCanvasX(x);
    };
    
    const toZoomCanvasY = (y) => {
      if (isZoom) {
        const normalizedY = (y - zoomYMin) / (zoomYMax - zoomYMin);
        return padding + (h - 2 * padding) * normalizedY;
      }
      return toCanvasY(y);
    };
    
    // Draw user's raw drawing (only before spline is fitted)
    if (!isZoom && points.length > 1 && !spline) {
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        const canvasX = toCanvasX(points[i].x);
        const canvasY = toCanvasY(points[i].y);
        if (i === 0) ctx.moveTo(canvasX, canvasY);
        else ctx.lineTo(canvasX, canvasY);
      }
      ctx.stroke();
    }
    
    // Draw cubic spline (only if no global polynomial is selected)
    if (spline && !globalPolynomial) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 200; i++) {
        const x = isZoom ? zoomXMin + (zoomXMax - zoomXMin) * i / 200 : i / 200;
        const y = evaluateCubicSpline(spline, x);
        const canvasX = toZoomCanvasX(x);
        const canvasY = toZoomCanvasY(y);
        if (i === 0) ctx.moveTo(canvasX, canvasY);
        else ctx.lineTo(canvasX, canvasY);
      }
      ctx.stroke();
    }
    
    // Draw global polynomial if fitted (as solid blue line)
    if (globalPolynomial) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 200; i++) {
        const x = isZoom ? zoomXMin + (zoomXMax - zoomXMin) * i / 200 : i / 200;
        const y = evaluatePolynomial(globalPolynomial, x);
        const canvasX = toZoomCanvasX(x);
        const canvasY = toZoomCanvasY(y);
        if (i === 0) ctx.moveTo(canvasX, canvasY);
        else ctx.lineTo(canvasX, canvasY);
      }
      ctx.stroke();
    }
    
    // Draw quadratic
    if (quadratic && validRange) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      for (let i = 0; i <= 100; i++) {
        const progress = i / 100;
        const x = validRange.left + (validRange.right - validRange.left) * progress;
        const y = evaluatePolynomial(quadratic, x);
        const canvasX = toZoomCanvasX(x);
        const canvasY = toZoomCanvasY(y);
        if (i === 0) ctx.moveTo(canvasX, canvasY);
        else ctx.lineTo(canvasX, canvasY);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Mark valid range
      if (!isZoom) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
        ctx.fillRect(
          toCanvasX(validRange.left),
          padding,
          toCanvasX(validRange.right) - toCanvasX(validRange.left),
          h - 2 * padding
        );
      }
    }
    
    // Draw green particle (quadratic-following)
    if (showParticle && particlePos !== null && validRange) {
      const y = evaluatePolynomial(quadratic, particlePos);
      const canvasX = toZoomCanvasX(particlePos);
      const canvasY = toZoomCanvasY(y);
      
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 6, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // Draw orange particle (spline-following)
    if (showParticle && splineParticlePos !== null && validRange && spline) {
      const y = evaluateCubicSpline(spline, splineParticlePos);
      const canvasX = toZoomCanvasX(splineParticlePos);
      const canvasY = toZoomCanvasY(y);
      
      ctx.fillStyle = '#f97316'; // Orange color
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 6, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // Draw minimum marker (cyan dot) - now shown in both views
    if (minimum) {
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(toZoomCanvasX(minimum.x), toZoomCanvasY(minimum.y), 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  };
  
  useEffect(() => {
    drawCanvas(canvasRef.current, true);
  }, [points, spline, polynomial, quadratic, minimum, validRange, particlePos, splineParticlePos, globalPolynomial]);
  
  useEffect(() => {
    drawCanvas(zoomCanvasRef.current, true);
  }, [spline, polynomial, quadratic, validRange, particlePos, splineParticlePos, minimum, globalPolynomial]);
  
  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Potential Well Simulator</h2>
      
      {showInfo && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Instructions:</strong> Draw a potential energy curve by clicking and dragging. 
                Make sure it has at least one valley (local minimum). Optionally select a polynomial degree to fit a global polynomial to your curve.
              </p>
              <p className="text-sm text-gray-600">
                The simulation will find the deepest minimum, 
                fit a quadratic approximation (red dashed) to the region around it, and simulate particles sliding in the well.
                The green particle follows the quadratic approximation, while the orange particle follows the actual fitted curve. 
                You'll notice they move very similarly, demonstrating that just about any smooth continuous function around a local minimum can be approximated locally by a simple quadratic.
              </p>
            </div>
            <button 
              onClick={() => setShowInfo(false)}
              className="ml-4 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Global Polynomial Fit (Optional)
        </label>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="none"
              checked={polynomialDegree === 'none'}
              onChange={(e) => setPolynomialDegree(e.target.value)}
              disabled={isDrawing || simulating}
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
            />
            <span className="text-sm text-gray-700">No polynomial fit</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="8"
              checked={polynomialDegree === '8'}
              onChange={(e) => setPolynomialDegree(e.target.value)}
              disabled={isDrawing || simulating}
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
            />
            <span className="text-sm text-gray-700">8-degree</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="16"
              checked={polynomialDegree === '16'}
              onChange={(e) => setPolynomialDegree(e.target.value)}
              disabled={isDrawing || simulating}
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
            />
            <span className="text-sm text-gray-700">16-degree</span>
          </label>
          
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Optional: Fit a high-degree polynomial to your entire curve (will replace the spline as the blue line)
        </p>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}
      
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Full Potential</h3>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="border border-gray-300 rounded cursor-crosshair"
        />
      </div>
      
      {quadratic && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Zoomed View (Valid Range)</h3>
          <canvas
            ref={zoomCanvasRef}
            width={zoomWidth}
            height={zoomHeight}
            className="border border-gray-300 rounded"
          />
        </div>
      )}
      
      <div className="flex gap-2">
        <button
          onClick={() => {
          if (!simulating) {
      // Reset both particles to starting position when beginning simulation
      let startPos = validRange.left + 0.002;

      if(evaluatePolynomial(quadratic, validRange.left) < evaluatePolynomial(quadratic, validRange.right)){
	    startPos = validRange.right - .002;
	     }
      // Set both particles to same starting x position
      setParticlePos(startPos);
      setParticleVel(0);
      particlePosRef.current = startPos;
      particleVelRef.current = 0;
      
      setSplineParticlePos(startPos);
      setSplineParticleVel(0);
      splineParticlePosRef.current = startPos;
      splineParticleVelRef.current = 0;
      }
    setSimulating(!simulating)
    }}
          disabled={!quadratic}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {simulating ? <Pause size={16} /> : <Play size={16} />}
          {simulating ? 'Pause' : 'Start'} Simulation
        </button>
        
        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          <RotateCcw size={16} />
          Reset
        </button>
        
        {!showInfo && (
          <button
            onClick={() => setShowInfo(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            <Info size={16} />
            Show Info
          </button>
        )}
      </div>
      
      {quadratic && (
        <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-800">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-gray-800">
              <span className="inline-block w-4 h-4 bg-blue-600 mr-2"></span>
              <strong>Blue:</strong> {globalPolynomial ? `${polynomialDegree}-degree polynomial` : 'Original (with some smoothing)'}
            </div>
            <div className="text-gray-800">
              <span className="inline-block w-4 h-4 bg-red-600 mr-2"></span>
              <strong>Red (dashed):</strong> Quadratic approximation
            </div>
            <div className="text-gray-800">
              <span className="inline-block w-4 h-4 bg-cyan-500 rounded-full mr-2"></span>
              <strong>Cyan dot:</strong> Local minimum
            </div>
            <div className="text-gray-800">
              <span className="inline-block w-4 h-4 bg-green-600 rounded-full mr-2"></span>
              <strong>Green:</strong> Quadratic particle
            </div>
            <div className="text-gray-800">
              <span className="inline-block w-4 h-4 bg-orange-600 rounded-full mr-2"></span>
              <strong>Orange:</strong> {globalPolynomial ? `${polynomialDegree}-degree particle` : 'Original particle'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PotentialSimulator;