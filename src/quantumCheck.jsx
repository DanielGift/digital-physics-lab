import React, { useState, useRef, useEffect } from 'react';

const QuantumVectorGrid = () => {
  const canvasRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  
  const CANVAS_SIZE = 500;
  const GRID_LIMIT = 2;
  const SCALE = CANVAS_SIZE / (2 * GRID_LIMIT);
  const MARGIN = 0.1;
  
  // Convert canvas coordinates to grid coordinates
  const canvasToGrid = (canvasX, canvasY) => {
    const x = (canvasX - CANVAS_SIZE / 2) / SCALE;
    const y = -(canvasY - CANVAS_SIZE / 2) / SCALE;
    return { x, y };
  };
  
  // Convert grid coordinates to canvas coordinates
  const gridToCanvas = (gridX, gridY) => {
    const x = gridX * SCALE + CANVAS_SIZE / 2;
    const y = -gridY * SCALE + CANVAS_SIZE / 2;
    return { x, y };
  };
  
  const handleMouseMove = (e) => {
    if (selected) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    
    const gridPos = canvasToGrid(canvasX, canvasY);
    
    // Clamp to grid limits
    gridPos.x = Math.max(-GRID_LIMIT, Math.min(GRID_LIMIT, gridPos.x));
    gridPos.y = Math.max(-GRID_LIMIT, Math.min(GRID_LIMIT, gridPos.y));
    
    setMousePos(gridPos);
  };
  
  const handleClick = () => {
    if (selected) return;
    
    setSelected({ ...mousePos });
    
    // Calculate probabilities
    const magnitude = Math.sqrt(mousePos.x ** 2 + mousePos.y ** 2);
    const normalization = magnitude ** 2;
    
    const prob1 = (mousePos.x ** 2) / normalization;
    const prob2 = (mousePos.y ** 2) / normalization;
    
    // Check if correct (should be at ±1/√2, ±1/√2 with margin of error)
    const invSqrt2 = 1 / Math.sqrt(2);
    const correctPositions = [
      { x: invSqrt2, y: invSqrt2 },
      { x: invSqrt2, y: -invSqrt2 },
      { x: -invSqrt2, y: invSqrt2 },
      { x: -invSqrt2, y: -invSqrt2 }
    ];
    
    const isCorrect = correctPositions.some(pos => 
      Math.abs(mousePos.x - pos.x) <= MARGIN && 
      Math.abs(mousePos.y - pos.y) <= MARGIN
    );
    
    setResult({
      magnitude,
      normalization,
      prob1,
      prob2,
      isCorrect
    });
  };
  
  const handleReset = () => {
    setSelected(null);
    setResult(null);
    setMousePos({ x: 0, y: 0 });
  };
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    for (let i = -GRID_LIMIT; i <= GRID_LIMIT; i++) {
      // Vertical lines
      const xCanvas = gridToCanvas(i, 0).x;
      ctx.beginPath();
      ctx.moveTo(xCanvas, 0);
      ctx.lineTo(xCanvas, CANVAS_SIZE);
      ctx.stroke();
      
      // Horizontal lines
      const yCanvas = gridToCanvas(0, i).y;
      ctx.beginPath();
      ctx.moveTo(0, yCanvas);
      ctx.lineTo(CANVAS_SIZE, yCanvas);
      ctx.stroke();
    }
    
    // Draw axes
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_SIZE / 2);
    ctx.lineTo(CANVAS_SIZE, CANVAS_SIZE / 2);
    ctx.stroke();
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(CANVAS_SIZE / 2, 0);
    ctx.lineTo(CANVAS_SIZE / 2, CANVAS_SIZE);
    ctx.stroke();
    
    // Draw axis labels
    ctx.fillStyle = '#000';
    ctx.font = '14px sans-serif';
    ctx.fillText('x', CANVAS_SIZE - 20, CANVAS_SIZE / 2 - 10);
    ctx.fillText('y', CANVAS_SIZE / 2 + 10, 20);
    

    
    // Draw vector arrow
    const pos = selected || mousePos;
    const canvasPos = gridToCanvas(pos.x, pos.y);
    const origin = gridToCanvas(0, 0);
    
    ctx.strokeStyle = selected ? (result?.isCorrect ? '#00AA00' : '#AA0000') : '#0066CC';
    ctx.fillStyle = selected ? (result?.isCorrect ? '#00AA00' : '#AA0000') : '#0066CC';
    ctx.lineWidth = 3;
    
    // Draw arrow line
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(canvasPos.x, canvasPos.y);
    ctx.stroke();
    
    // Draw arrowhead
    const angle = Math.atan2(canvasPos.y - origin.y, canvasPos.x - origin.x);
    const headLength = 15;
    
    ctx.beginPath();
    ctx.moveTo(canvasPos.x, canvasPos.y);
    ctx.lineTo(
      canvasPos.x - headLength * Math.cos(angle - Math.PI / 6),
      canvasPos.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      canvasPos.x - headLength * Math.cos(angle + Math.PI / 6),
      canvasPos.y - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
    
    // Draw point at tip
    ctx.beginPath();
    ctx.arc(canvasPos.x, canvasPos.y, 5, 0, 2 * Math.PI);
    ctx.fill();
    
  }, [mousePos, selected, result]);
  
  const magnitude = Math.sqrt(mousePos.x ** 2 + mousePos.y ** 2);
  
  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-gray-50 min-h-screen">
      <div className="max-w-3xl w-full bg-white rounded-lg shadow-lg p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-3 leading-relaxed">
          Let the x and y components of this vector be coefficients of a quantum superposition state. 
          Choose a vector that represents a normalized combination of coefficients where each of the 2 states 
          has a 50/50 chance of being measured.
        </h2>
        
        <div className="flex justify-center mb-3">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            onMouseMove={handleMouseMove}
            onClick={handleClick}
            className="border-2 border-gray-300 cursor-crosshair"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>
        
        <div className="bg-blue-50 p-3 rounded-lg mb-3">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm text-gray-600">x-component</div>
              <div className="text-lg font-mono font-semibold text-blue-700">
                {(selected ? selected.x : mousePos.x).toFixed(3)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">y-component</div>
              <div className="text-lg font-mono font-semibold text-blue-700">
                {(selected ? selected.y : mousePos.y).toFixed(3)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Magnitude</div>
              <div className="text-lg font-mono font-semibold text-blue-700">
                {magnitude.toFixed(3)}
              </div>
            </div>
          </div>
        </div>
        
        {result && (
          <div className={`p-6 rounded-lg ${result.isCorrect ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500'}`}>
            <h3 className={`text-2xl font-bold mb-4 ${result.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
              {result.isCorrect ? '✓ Correct!' : '✗ Incorrect'}
            </h3>
            
            <div className="space-y-3 text-gray-800">
              <div className="flex items-start gap-2">
                <span className={`text-xl font-bold ${Math.abs(result.normalization - 1) <= 0.1 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(result.normalization - 1) <= 0.1 ? '✓' : '✗'}
                </span>
                <div>
                  <strong>Normalization:</strong> |ψ|² = x² + y² = {selected.x.toFixed(3)}² + {selected.y.toFixed(3)}² = {result.normalization.toFixed(4)}
                  {Math.abs(result.normalization - 1) <= 0.1 ? ' (correctly normalized to 1)' : ' (should equal 1)'}
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <span className={`text-xl font-bold ${Math.abs(result.prob1 - 0.5) <= 0.05 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(result.prob1 - 0.5) <= 0.05 ? '✓' : '✗'}
                </span>
                <div>
                  <strong>Probability of State 1:</strong> P₁ = x²/|ψ|² = {selected.x.toFixed(3)}²/{result.normalization.toFixed(4)} = {(result.prob1 * 100).toFixed(2)}%
                  {Math.abs(result.prob1 - 0.5) <= 0.05 ? ' (correct 50%)' : ' (should be 50%)'}
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <span className={`text-xl font-bold ${Math.abs(result.prob2 - 0.5) <= 0.05 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(result.prob2 - 0.5) <= 0.05 ? '✓' : '✗'}
                </span>
                <div>
                  <strong>Probability of State 2:</strong> P₂ = y²/|ψ|² = {selected.y.toFixed(3)}²/{result.normalization.toFixed(4)} = {(result.prob2 * 100).toFixed(2)}%
                  {Math.abs(result.prob2 - 0.5) <= 0.05 ? ' (correct 50%)' : ' (should be 50%)'}
                </div>
              </div>
              
              <div className="pt-3 border-t border-gray-300">
                {result.isCorrect ? (
                  <div className="text-green-700">
                    ✓ Both states have equal probability (~50% each) and the state is properly normalized (|ψ|² = 1).
                  </div>
                ) : (
                  <div className="text-red-700 space-y-2">
                    <div className="font-semibold">Issues with your answer:</div>
                    {Math.abs(result.prob1 - 0.5) > 0.05 || Math.abs(result.prob2 - 0.5) > 0.05 ? (
                      <div>✗ The probabilities are not 50/50. For equal probabilities, |x| and |y| must be equal in magnitude.</div>
                    ) : (
                      <div>✓ The probabilities are correctly 50/50 (|x| = |y|).</div>
                    )}
                    {Math.abs(result.normalization - 1) > 0.1 ? (
                      <div>✗ The normalization |ψ|² = {result.normalization.toFixed(4)} is not equal to 1. The magnitude needs adjustment.</div>
                    ) : (
                      <div>✓ The normalization is correct (|ψ|² = 1).</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <button
              onClick={handleReset}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
        
        {!selected && (
          <div className="text-sm text-gray-600 text-center mt-4">
            Move your mouse to adjust the vector, then click to submit your answer.
          </div>
        )}
      </div>
    </div>
  );
}

export default QuantumVectorGrid;