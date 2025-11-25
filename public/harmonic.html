import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Info } from 'lucide-react';

const PotentialSimulator = () => {
  const [points, setPoints] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [polynomial, setPolynomial] = useState(null);
  const [quadratic, setQuadratic] = useState(null);
  const [minimum, setMinimum] = useState(null);
  const [validRange, setValidRange] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [particlePos, setParticlePos] = useState(null);
  const [particleVel, setParticleVel] = useState(0);
  const [error, setError] = useState('');
  const [showInfo, setShowInfo] = useState(true);
  
  const canvasRef = useRef(null);
  const zoomCanvasRef = useRef(null);
  const animationRef = useRef(null);
  
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
  
  const evaluatePolynomial = (poly, x) => {
    const xNorm = 2 * (x - poly.xMin) / poly.xRange - 1;
    let result = 0;
    for (let i = 0; i < poly.coeffs.length; i++) {
      result += poly.coeffs[i] * Math.pow(xNorm, i);
    }
    return result;
  };
  
  const findLocalMinima = (poly, xMin, xMax, samples = 200) => {
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
      if (y < yPrev && y < yNext && y < yPrev2 && y < yNext2) {
        minima.push({ x, y });
      }
    }
    
    return minima;
  };
  
  const fitQuadraticAtMinimum = (poly, minX, windowSize = 0.15) => {
    const samples = [];
    const xMin = Math.max(0, minX - windowSize);
    const xMax = Math.min(1, minX + windowSize);
    
    for (let i = 0; i <= 20; i++) {
      const x = xMin + (xMax - xMin) * i / 20;
      const y = evaluatePolynomial(poly, x);
      samples.push({ x, y });
    }
    
    return fitPolynomial(samples, 2);
  };
  
  const findValidRange = (poly, quad, minX, tolerance = 0.05) => {
    let leftX = minX;
    let rightX = minX;
    const step = 0.01;
    
    // Find left boundary
    for (let x = minX; x >= 0; x -= step) {
      const diff = Math.abs(evaluatePolynomial(poly, x) - evaluatePolynomial(quad, x));
      if (diff > tolerance) break;
      leftX = x;
    }
    
    // Find right boundary
    for (let x = minX; x <= 1; x += step) {
      const diff = Math.abs(evaluatePolynomial(poly, x) - evaluatePolynomial(quad, x));
      if (diff > tolerance) break;
      rightX = x;
    }
    
    return { left: leftX, right: rightX };
  };
  
  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - padding) / (width - 2 * padding);
    const y = (e.clientY - rect.top - padding) / (height - 2 * padding);
    
    if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
      setIsDrawing(true);
      setPoints([{ x, y }]);
      setPolynomial(null);
      setQuadratic(null);
      setMinimum(null);
      setValidRange(null);
      setSimulating(false);
      setError('');
    }
  };
  
  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    
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
      setError('Draw a longer curve!');
      return;
    }
    
    // Sort points by x
    const sortedPoints = [...points].sort((a, b) => a.x - b.x);
    
    // Fit polynomial
    const poly = fitPolynomial(sortedPoints, 8);
    if (!poly) {
      setError('Failed to fit polynomial');
      return;
    }
    
    // Find local minima
    const minima = findLocalMinima(poly, 0, 1);
    if (minima.length === 0) {
      setError('No local minimum found! Draw a curve with at least one valley.');
      return;
    }
    
    // Choose deepest minimum
    const deepestMin = minima.reduce((a, b) => a.y < b.y ? a : b);
    
    // Fit quadratic at minimum
    const quad = fitQuadraticAtMinimum(poly, deepestMin.x);
    
    // Find valid range
    const range = findValidRange(poly, quad, deepestMin.x);
    
    setPolynomial(poly);
    setQuadratic(quad);
    setMinimum(deepestMin);
    setValidRange(range);
    setParticlePos(deepestMin.x);
    setParticleVel(0);
  };
  
  const simulate = () => {
    if (!quadratic || !validRange) return;
    
    const dt = 0.016;
    const g = 0.5; // gravity constant
    
    setParticlePos(prev => {
      const x = prev + particleVel * dt;
      
      // Check bounds
      if (x <= validRange.left || x >= validRange.right) {
        setSimulating(false);
        return prev;
      }
      
      // Calculate force from quadratic potential
      const dx = 0.001;
      const dV = evaluatePolynomial(quadratic, x + dx) - evaluatePolynomial(quadratic, x - dx);
      const force = -dV / (2 * dx);
      
      setParticleVel(v => v + force * g * dt);
      
      return x;
    });
  };
  
  useEffect(() => {
    if (simulating) {
      animationRef.current = setInterval(simulate, 16);
    } else {
      if (animationRef.current) clearInterval(animationRef.current);
    }
    return () => {
      if (animationRef.current) clearInterval(animationRef.current);
    };
  }, [simulating, particleVel, quadratic, validRange]);
  
  const reset = () => {
    setPoints([]);
    setPolynomial(null);
    setQuadratic(null);
    setMinimum(null);
    setValidRange(null);
    setSimulating(false);
    setParticlePos(null);
    setParticleVel(0);
    setError('');
  };
  
  const drawCanvas = (canvas, showParticle = false) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const isZoom = canvas === zoomCanvasRef.current;
    const w = isZoom ? zoomWidth : width;
    const h = isZoom ? zoomHeight : height;
    
    ctx.clearRect(0, 0, w, h);
    
    // Background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h);
    
    // Grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const x = padding + (w - 2 * padding) * i / 10;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, h - padding);
      ctx.stroke();
      
      const y = padding + (h - 2 * padding) * i / 10;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(w - padding, y);
      ctx.stroke();
    }
    
    // Axes
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, h - padding);
    ctx.lineTo(w - padding, h - padding);
    ctx.stroke();
    
    // Labels
    ctx.fillStyle = '#000';
    ctx.font = '12px sans-serif';
    ctx.fillText('Position', w / 2, h - 10);
    ctx.save();
    ctx.translate(15, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Potential', 0, 0);
    ctx.restore();
    
    const toCanvasX = (x) => padding + (w - 2 * padding) * x;
    const toCanvasY = (y) => padding + (h - 2 * padding) * y;
    
    // Zoom window calculation
    let zoomXMin = 0, zoomXMax = 1;
    if (isZoom && validRange) {
      const center = (validRange.left + validRange.right) / 2;
      const range = (validRange.right - validRange.left) * 1.5;
      zoomXMin = Math.max(0, center - range / 2);
      zoomXMax = Math.min(1, center + range / 2);
    }
    
    // Draw user's raw drawing (only on main canvas)
    if (!isZoom && points.length > 1 && !polynomial) {
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
    
    // Draw polynomial
    if (polynomial) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 200; i++) {
        const x = isZoom ? zoomXMin + (zoomXMax - zoomXMin) * i / 200 : i / 200;
        const y = evaluatePolynomial(polynomial, x);
        const canvasX = toCanvasX(isZoom ? (x - zoomXMin) / (zoomXMax - zoomXMin) : x);
        const canvasY = toCanvasY(y);
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
        const canvasX = toCanvasX(isZoom ? (x - zoomXMin) / (zoomXMax - zoomXMin) : x);
        const canvasY = toCanvasY(y);
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
    
    // Draw particle
    if (showParticle && particlePos !== null && validRange) {
      const y = evaluatePolynomial(quadratic, particlePos);
      const canvasX = toCanvasX(isZoom ? (particlePos - zoomXMin) / (zoomXMax - zoomXMin) : particlePos);
      const canvasY = toCanvasY(y);
      
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 6, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // Draw minimum marker
    if (minimum && !isZoom) {
      ctx.fillStyle = '#8b5cf6';
      ctx.beginPath();
      ctx.arc(toCanvasX(minimum.x), toCanvasY(minimum.y), 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  };
  
  useEffect(() => {
    drawCanvas(canvasRef.current, true);
  }, [points, polynomial, quadratic, minimum, validRange, particlePos]);
  
  useEffect(() => {
    drawCanvas(zoomCanvasRef.current, true);
  }, [polynomial, quadratic, validRange, particlePos]);
  
  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Potential Well Simulator</h2>
      
      {showInfo && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Instructions:</strong> Draw a potential energy curve by clicking and dragging. 
                Make sure it has at least one valley (local minimum).
              </p>
              <p className="text-sm text-gray-600">
                The simulation will fit a polynomial (blue), find the deepest minimum, 
                fit a quadratic approximation (red dashed), and simulate a particle sliding in the well.
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
      
      {polynomial && quadratic && (
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
          onClick={() => setSimulating(!simulating)}
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
      
      {polynomial && (
        <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="inline-block w-4 h-4 bg-blue-600 mr-2"></span>
              <strong>Blue:</strong> 8th degree polynomial fit
            </div>
            <div>
              <span className="inline-block w-4 h-4 bg-red-600 mr-2"></span>
              <strong>Red (dashed):</strong> Quadratic approximation
            </div>
            <div>
              <span className="inline-block w-4 h-4 bg-purple-600 rounded-full mr-2"></span>
              <strong>Purple:</strong> Local minimum
            </div>
            <div>
              <span className="inline-block w-4 h-4 bg-green-600 rounded-full mr-2"></span>
              <strong>Green:</strong> Particle
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PotentialSimulator;