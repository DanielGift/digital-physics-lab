import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Info } from 'lucide-react';
import { prepareStroke, buildCurve, analyzeCurve, quadY, initialState, stepState } from './potentialMath.js';

const PotentialSimulator = () => {
  const [points, setPoints] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');
  const [showInfo, setShowInfo] = useState(true);
  const [polynomialDegree, setPolynomialDegree] = useState('none');
  const [simulating, setSimulating] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [particles, setParticles] = useState(null);  // { quad, real } x positions

  const canvasRef = useRef(null);
  const zoomCanvasRef = useRef(null);
  const animationRef = useRef(null);
  // Refs so rapid mouse events never read stale React state mid-stroke.
  const drawingRef = useRef(false);
  const strokeRef = useRef([]);
  const preparedRef = useRef(null);
  const simRef = useRef(null);

  const width = 600;
  const height = 300;
  const zoomWidth = 600;
  const zoomHeight = 200;
  const padding = 40;

  const stopAnimation = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
  };

  const runAnalysis = (prepared, degree) => {
    simRef.current = null;
    setParticles(null);
    const curve = buildCurve(prepared, degree);
    if (!curve) {
      setAnalysis(null);
      setError(`Could not fit a ${degree}-degree polynomial to your curve. Try drawing again.`);
      return;
    }
    const result = analyzeCurve(curve);
    if (result.error) {
      setAnalysis(null);
      setError(result.error);
      return;
    }
    setAnalysis(result);
    setError('');
  };

  // Canvas pixel -> normalized plot coordinates, correct even if CSS scales the canvas.
  const toPlot = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (canvas.width / rect.width);
    const py = (e.clientY - rect.top) * (canvas.height / rect.height);
    return {
      x: (px - padding) / (width - 2 * padding),
      y: (py - padding) / (height - 2 * padding),
    };
  };

  const handleMouseDown = (e) => {
    if (simulating) return;
    const p = toPlot(e);
    if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) return;
    stopAnimation();
    drawingRef.current = true;
    setIsDrawing(true);
    strokeRef.current = [p];
    preparedRef.current = null;
    simRef.current = null;
    setPoints([p]);
    setAnalysis(null);
    setParticles(null);
    setError('');
  };

  const handleMouseMove = (e) => {
    if (!drawingRef.current) return;
    const p = toPlot(e);
    // Clamp rather than drop, so drawing along the edges of the plot works.
    strokeRef.current.push({ x: Math.min(1, Math.max(0, p.x)), y: Math.min(1, Math.max(0, p.y)) });
    setPoints([...strokeRef.current]);
  };

  const handleMouseUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    setIsDrawing(false);
    const prepared = prepareStroke(strokeRef.current);
    if (prepared.error) {
      setError(prepared.error);
      return;
    }
    preparedRef.current = prepared;
    runAnalysis(prepared, polynomialDegree);
  };

  const handleDegreeChange = (value) => {
    setPolynomialDegree(value);
    // Refit the existing drawing instead of making the student redraw it.
    if (preparedRef.current) runAnalysis(preparedRef.current, value);
  };

  const reset = () => {
    stopAnimation();
    drawingRef.current = false;
    strokeRef.current = [];
    preparedRef.current = null;
    simRef.current = null;
    setPoints([]);
    setAnalysis(null);
    setParticles(null);
    setSimulating(false);
    setIsDrawing(false);
    setError('');
  };

  const toggleSimulation = () => {
    if (simulating) {
      setSimulating(false);
      return;
    }
    // Resume where the particles were if paused; otherwise release them fresh.
    if (!simRef.current) {
      simRef.current = initialState(analysis);
      setParticles({ quad: simRef.current.quad.x, real: simRef.current.real.x, amp: simRef.current.amp });
    }
    setSimulating(true);
  };

  // Animation loop, stepped by real elapsed time so speed doesn't depend on frame rate.
  useEffect(() => {
    if (!simulating || !analysis) return;
    let last = performance.now();
    const animate = (now) => {
      const sim = simRef.current;
      if (!sim) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (dt > 0) {
        simRef.current = stepState(analysis, sim, dt);
        setParticles({ quad: simRef.current.quad.x, real: simRef.current.real.x, amp: simRef.current.amp });
      }
      // Each particle parks at its release point after two full oscillations;
      // the run ends once both are home.
      if (simRef.current.done) {
        simRef.current = null;  // next Start replays from the release point
        setSimulating(false);
        return;
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return stopAnimation;
  }, [simulating, analysis]);

  const drawCanvas = (canvas, isZoom) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, h - padding);
    ctx.lineTo(w - padding, h - padding);
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, h - padding);
    ctx.stroke();

    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.fillText('Position', w / 2 - 20, h - 10);
    ctx.save();
    ctx.translate(15, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Potential Energy', 0, 0);
    ctx.restore();

    const curve = analysis?.curve;

    // View window: the whole plot, or a zoom around the valid range.
    let x0v = 0, x1v = 1, y0v = 0, y1v = 1;
    if (isZoom) {
      if (!analysis) return;
      const { left, right } = analysis.range;
      const center = (left + right) / 2;
      const span = (right - left) * 1.5;
      x0v = Math.max(curve.xa, center - span / 2);
      x1v = Math.min(curve.xb, center + span / 2);
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i <= 100; i++) {
        const y = curve.y(x0v + (x1v - x0v) * i / 100);
        lo = Math.min(lo, y); hi = Math.max(hi, y);
      }
      const pad = Math.max((hi - lo) * 0.2, 0.01);
      y0v = lo - pad;
      y1v = hi + pad;
    }
    const cx = (x) => padding + (w - 2 * padding) * (x - x0v) / (x1v - x0v);
    const cy = (y) => padding + (h - 2 * padding) * (y - y0v) / (y1v - y0v);

    const plotFn = (f, xa, xb, steps) => {
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const x = xa + (xb - xa) * i / steps;
        if (i === 0) ctx.moveTo(cx(x), cy(f(x)));
        else ctx.lineTo(cx(x), cy(f(x)));
      }
      ctx.stroke();
    };

    // Clip the curves to the plotting area (matters for the zoom view).
    ctx.save();
    ctx.beginPath();
    ctx.rect(padding, padding, w - 2 * padding, h - 2 * padding);
    ctx.clip();

    // The student's drawing: solid while drawing, faint underneath the fit after.
    if (!isZoom && points.length > 1) {
      ctx.strokeStyle = analysis ? '#cbd5e1' : '#64748b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      points.forEach((p, i) => (i === 0 ? ctx.moveTo(cx(p.x), cy(p.y)) : ctx.lineTo(cx(p.x), cy(p.y))));
      ctx.stroke();
    }

    if (analysis) {
      const { range } = analysis;

      if (!isZoom) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
        ctx.fillRect(cx(range.left), padding, cx(range.right) - cx(range.left), h - 2 * padding);
      }

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      plotFn((x) => curve.y(x), Math.max(x0v, curve.xa), Math.min(x1v, curve.xb), 300);

      // Dashed parabola over the valid range, extended to the green particle's swing.
      const amp = particles ? particles.amp : 0;
      ctx.strokeStyle = '#ef4444';
      ctx.setLineDash([5, 5]);
      plotFn((x) => quadY(analysis, x), Math.min(range.left, analysis.x0 - amp), Math.max(range.right, analysis.x0 + amp), 100);
      ctx.setLineDash([]);

      const dot = (x, y, r, color) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx(x), cy(y), r, 0, 2 * Math.PI);
        ctx.fill();
      };
      if (particles) {
        dot(particles.quad, quadY(analysis, particles.quad), 6, '#10b981');
        dot(particles.real, curve.y(particles.real), 6, '#f97316');
      }
      dot(analysis.minimum.x, analysis.minimum.y, 4, '#06b6d4');
    }
    ctx.restore();
  };

  useEffect(() => {
    drawCanvas(canvasRef.current, false);
    drawCanvas(zoomCanvasRef.current, true);
  });

  const degreeOption = (value, label) => (
    <label className="flex items-center">
      <input
        type="radio"
        value={value}
        checked={polynomialDegree === value}
        onChange={(e) => handleDegreeChange(e.target.value)}
        disabled={isDrawing || simulating}
        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg text-gray-800">
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
          {degreeOption('none', 'No polynomial fit')}
          {degreeOption('8', '8-degree')}
          {degreeOption('16', '16-degree')}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Optional: Fit a high-degree polynomial to your entire curve (will replace the smoothed curve as the blue line)
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2 text-gray-800">Full Potential</h3>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ maxWidth: '100%', height: 'auto' }}
          className="border border-gray-300 rounded cursor-crosshair"
        />
      </div>

      {analysis && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2 text-gray-800">Zoomed View (Valid Range)</h3>
          <canvas
            ref={zoomCanvasRef}
            width={zoomWidth}
            height={zoomHeight}
            style={{ maxWidth: '100%', height: 'auto' }}
            className="border border-gray-300 rounded"
          />
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={toggleSimulation}
          disabled={!analysis}
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

      {analysis && (
        <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-800">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="inline-block w-4 h-4 bg-blue-600 mr-2"></span>
              <strong>Blue:</strong> {polynomialDegree !== 'none' ? `${polynomialDegree}-degree polynomial` : 'Original (with some smoothing)'}
            </div>
            <div>
              <span className="inline-block w-4 h-4 bg-red-600 mr-2"></span>
              <strong>Red (dashed):</strong> Quadratic approximation
            </div>
            <div>
              <span className="inline-block w-4 h-4 bg-cyan-500 rounded-full mr-2"></span>
              <strong>Cyan dot:</strong> Local minimum
            </div>
            <div>
              <span className="inline-block w-4 h-4 bg-green-600 rounded-full mr-2"></span>
              <strong>Green:</strong> Quadratic particle
            </div>
            <div>
              <span className="inline-block w-4 h-4 bg-orange-600 rounded-full mr-2"></span>
              <strong>Orange:</strong> {polynomialDegree !== 'none' ? `${polynomialDegree}-degree particle` : 'Original particle'}
            </div>
            <div>
              <span className="inline-block w-4 h-4 bg-slate-300 mr-2"></span>
              <strong>Gray:</strong> Your drawing
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PotentialSimulator;
