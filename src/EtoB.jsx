import React, { useState, useEffect } from 'react';

const RelativisticWireSimulation = () => {
  const [observerVelocity, setObserverVelocity] = useState(0);
  const [time, setTime] = useState(0);
  
  // Physical constants (in normalized units where c = 1)
  const c = 1; // Speed of light
  const particleVelocity = 0.6; // Velocity of test particle (60% of c)
  const wireCurrentVelocity = 0.5; // Drift velocity of electrons in wire (50% of c)
  const lambda0 = 1; // Proper linear charge density
  const q = 1; // Test charge
  const d = 80; // Distance from wire to particle
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(t => t + 0.05);
    }, 50);
    return () => clearInterval(interval);
  }, []);
  
  // Lorentz factor
  const gamma = (v) => 1 / Math.sqrt(1 - v * v / (c * c));
  
  // Calculate fields and forces in the observer's frame
  const calculateFields = () => {
    // Velocities in observer frame
    const v_test = particleVelocity - observerVelocity;
    const v_electrons = wireCurrentVelocity - observerVelocity;
    const v_protons = -observerVelocity; // Protons stationary in lab frame
    
    // Gammas in observer frame
    const gamma_electrons = gamma(v_electrons);
    const gamma_protons = gamma(v_protons);
    
    // Lab frame gammas
    const gamma_electrons_lab = gamma(wireCurrentVelocity); // γ(0.5) ≈ 1.155
    const gamma_protons_lab = 1; // γ(0) = 1
    
    // REAL PHYSICS APPROACH:
    // In the lab frame, the wire is electrically neutral
    // This means: λ_electrons_lab + λ_protons_lab = 0
    // 
    // The proper charge densities (in rest frame of each species) are:
    // λ_electrons_proper = -λ₀
    // λ_protons_proper = +λ₀
    //
    // Transform to lab frame:
    // λ_electrons_lab = λ_electrons_proper × γ_electrons_lab = -λ₀ × γ(0.5)
    // λ_protons_lab = λ_protons_proper × γ_protons_lab = +λ₀ × 1
    //
    // For neutrality: λ_electrons_lab + λ_protons_lab = 0
    // So: -λ₀ × γ(0.5) + λ₀ × 1 = 0
    // This is NOT zero! We need: λ_protons_proper = λ₀ × γ(0.5)
    
    const lambda_electrons_proper = -lambda0;
    const lambda_protons_proper = lambda0 * gamma_electrons_lab; // Ensures lab neutrality
    
    // Now transform to observer frame
    // λ_obs = λ_proper × γ_obs
    const lambda_electrons = lambda_electrons_proper * gamma_electrons;
    const lambda_protons = lambda_protons_proper * gamma_protons;
    const lambda_net = lambda_electrons + lambda_protons;
    
    // Verification at v_obs = 0 (lab frame):
    // γ_electrons = γ(0.5) = 1.155
    // γ_protons = γ(0) = 1
    // λ_electrons = -λ₀ × 1.155
    // λ_protons = λ₀ × 1.155 × 1 = λ₀ × 1.155
    // λ_net = 0 ✓
    
    // Electric field from net charge density (Gauss's law)
    const E = (lambda_net) / (2 * Math.PI * d);
    
    // Current in observer frame (Ampere's law)
    const I = lambda_electrons * v_electrons + lambda_protons * v_protons;
    
    // Magnetic field from Ampere's law
    const B = I / (2 * Math.PI * d * c * c);
    
    // Forces on test charge
    const F_electric = q * E;
    const F_magnetic = q * v_test * B;
    const F_total = F_electric + F_magnetic;
    
    return { E, B, F_electric, F_magnetic, F_total, v_test, lambda_net, I };
  };
  
  const fields = calculateFields();
  
  // Visualization parameters
  const width = 800;
  const height = 400; // Reduced from 600 to 400 (2/3 size)
  const wireY = height / 2;
  const particleY = wireY - d;
  const wireLength = width;
  
  // Render moving charges in the wire
  const renderCharges = () => {
    const charges = [];
    
    // Calculate velocities in observer frame
    const v_electrons = wireCurrentVelocity - observerVelocity;
    const v_protons = -observerVelocity;
    
    const gamma_electrons = gamma(v_electrons);
    const gamma_protons = gamma(v_protons);
    
    // In LAB FRAME, wire is neutral (same density)
    const baseSpacing = 100;
    
    // Use REAL physics - no exaggeration
    // Proper frame spacing (very wide to make changes visible)
    const properSpacing = 150;
    
    // Transform to observer frame: spacing_obs = properSpacing / γ_obs
    // In lab frame, we want both to have the same spacing for neutrality
    // So we adjust the proton proper spacing
    
    const gamma_electrons_lab = gamma(wireCurrentVelocity);
    const gamma_protons_lab = 1;
    
    // In lab frame:
    // electron_spacing_lab = properSpacing_e / γ_e_lab
    // proton_spacing_lab = properSpacing_p / γ_p_lab
    // For equal spacing: properSpacing_e / γ_e_lab = properSpacing_p / γ_p_lab
    // So: properSpacing_p = properSpacing_e × γ_p_lab / γ_e_lab
    
    const electronProperSpacing = properSpacing;
    const protonProperSpacing = properSpacing * gamma_protons_lab / gamma_electrons_lab;
    
    // Transform to observer frame
    const electronSpacing = electronProperSpacing / gamma_electrons;
    const protonSpacing = protonProperSpacing / gamma_protons;
    
    // Calculate enough particles to fill multiple screens
    const numElectronsVisible = Math.ceil(wireLength * 2 / electronSpacing) + 5;
    const numProtonsVisible = Math.ceil(wireLength * 2 / protonSpacing) + 5;
    
    console.log(`===== Frame: v_obs = ${observerVelocity.toFixed(3)}c =====`);
    console.log(`Electrons: v = ${v_electrons.toFixed(3)}c, γ = ${gamma_electrons.toFixed(3)}, spacing = ${electronSpacing.toFixed(1)}px`);
    console.log(`Protons:   v = ${v_protons.toFixed(3)}c, γ = ${gamma_protons.toFixed(3)}, spacing = ${protonSpacing.toFixed(1)}px`);
    console.log(`Spacing ratio: ${(electronSpacing/protonSpacing).toFixed(3)} (should be 1.0 at v=0)`);
    
    // Electrons (moving in lab frame) - positioned above center
    const electronOffset = (time * v_electrons * 50) % electronSpacing;
    for (let i = -5; i < numElectronsVisible; i++) {
      const baseX = i * electronSpacing - electronOffset;
      if (baseX >= -20 && baseX <= wireLength + 20) {
        charges.push(
          <g key={`e-${i}`}>
            <circle
              cx={baseX}
              cy={wireY - 10}
              r={6}
              fill="#3b82f6"
              stroke="#1e40af"
              strokeWidth={2}
            />
            <text x={baseX - 3.5} y={wireY - 6} fontSize="11" fill="white" fontWeight="bold">−</text>
          </g>
        );
      }
    }
    
    // Protons (stationary in lab frame) - positioned below center with different phase
    const protonPhaseOffset = 0.37 * protonSpacing;
    const protonOffset = (time * v_protons * 50) % protonSpacing;
    for (let i = -5; i < numProtonsVisible; i++) {
      const baseX = i * protonSpacing + protonPhaseOffset - protonOffset;
      if (baseX >= -20 && baseX <= wireLength + 20) {
        charges.push(
          <g key={`p-${i}`}>
            <circle
              cx={baseX}
              cy={wireY + 10}
              r={6}
              fill="#ef4444"
              stroke="#991b1b"
              strokeWidth={2}
            />
            <text x={baseX - 3.5} y={wireY + 14} fontSize="11" fill="white" fontWeight="bold">+</text>
          </g>
        );
      }
    }
    
    return charges;
  };
  
  // Render test particle
  const particleX = (width / 2 + time * (particleVelocity - observerVelocity) * 50) % width;
  
  // Render field lines
  const renderFieldLines = () => {
    const lines = [];
    const numLines = 12;
    
    // Electric field lines (radial from wire)
    if (Math.abs(fields.E) > 0.01) {
      for (let i = 0; i < numLines; i++) {
        const angle = (i / numLines) * Math.PI * 2;
        const startR = 20;
        const endR = 100;
        const x1 = width / 2 + startR * Math.cos(angle);
        const y1 = wireY + startR * Math.sin(angle);
        const x2 = width / 2 + endR * Math.cos(angle);
        const y2 = wireY + endR * Math.sin(angle);
        
        const color = fields.lambda_net > 0 ? '#ef4444' : '#3b82f6';
        const opacity = Math.min(Math.abs(fields.E) * 2, 0.6);
        
        lines.push(
          <line
            key={`e-line-${i}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={color}
            strokeWidth={2}
            opacity={opacity}
            markerEnd={fields.lambda_net > 0 ? "url(#arrowhead-red)" : "url(#arrowhead-blue)"}
          />
        );
      }
    }
    
    // Magnetic field circles (into/out of page)
    if (Math.abs(fields.B) > 0.01) {
      const numCircles = 3;
      for (let i = 1; i <= numCircles; i++) {
        const r = 30 * i;
        const color = fields.B > 0 ? '#10b981' : '#8b5cf6';
        const opacity = Math.min(Math.abs(fields.B) * 5, 0.4);
        
        lines.push(
          <circle
            key={`b-circle-${i}`}
            cx={width / 2}
            cy={wireY}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            opacity={opacity}
            strokeDasharray="5,5"
          />
        );
      }
    }
    
    return lines;
  };
  
  // Render force vectors
  const renderForceVectors = () => {
    const vectors = [];
    // Use MASSIVE scaling - the forces are very small!
    const scale = 10000; // Double it again! Was 5000
    const offsetX = 50;
    
    // Calculate actual lengths WITHOUT minimum clamps
    const fElectricLength = Math.abs(fields.F_electric) * scale;
    const fMagneticLength = Math.abs(fields.F_magnetic) * scale;
    const fTotalLength = Math.abs(fields.F_total) * scale;
    
    // Only use minimum for display if VERY tiny (< 1px)
    const fElectricDisplay = Math.max(fElectricLength, 2);
    const fMagneticDisplay = Math.max(fMagneticLength, 2);
    const fTotalDisplay = Math.max(fTotalLength, 2);
    
    console.log(`===== FORCES =====`);
    console.log(`F_E = ${fields.F_electric.toFixed(6)} → ${fElectricLength.toFixed(1)}px`);
    console.log(`F_B = ${fields.F_magnetic.toFixed(6)} → ${fMagneticLength.toFixed(1)}px`);
    console.log(`F_total = ${fields.F_total.toFixed(6)} → ${fTotalLength.toFixed(1)}px`);
    console.log(`Ratio F_E/F_B = ${(Math.abs(fields.F_electric) / Math.abs(fields.F_magnetic)).toFixed(3)}`);
    
    // Electric force (red) - offset to the left
    vectors.push(
      <g key="f-electric">
        <line
          x1={particleX - offsetX}
          y1={particleY}
          x2={particleX - offsetX}
          y2={particleY + fElectricDisplay}
          stroke="#ef4444"
          strokeWidth={Math.max(fElectricLength / 5, 0.5)}
          markerEnd="url(#arrowhead-red)"
          opacity={fElectricLength < 3 ? 0.3 : 1}
        />
        <rect
          x={particleX - offsetX - 38}
          y={particleY + Math.max(fElectricDisplay/2, 10) - 10}
          width={35}
          height={20}
          fill="white"
          stroke="#ef4444"
          strokeWidth={1.5}
          rx={3}
        />
        <text x={particleX - offsetX - 33} y={particleY + Math.max(fElectricDisplay/2, 10) + 4} fill="#ef4444" fontSize="13" fontWeight="bold">
          F_E
        </text>
      </g>
    );
    
    // Magnetic force (green) - offset to the right
    vectors.push(
      <g key="f-magnetic">
        <line
          x1={particleX + offsetX}
          y1={particleY}
          x2={particleX + offsetX}
          y2={particleY + fMagneticDisplay}
          stroke="#10b981"
          strokeWidth={Math.max(fMagneticLength / 5, 0.5)}
          markerEnd="url(#arrowhead-green)"
          opacity={fMagneticLength < 3 ? 0.3 : 1}
        />
        <rect
          x={particleX + offsetX + 5}
          y={particleY + Math.max(fMagneticDisplay/2, 10) - 10}
          width={35}
          height={20}
          fill="white"
          stroke="#10b981"
          strokeWidth={1.5}
          rx={3}
        />
        <text x={particleX + offsetX + 10} y={particleY + Math.max(fMagneticDisplay/2, 10) + 4} fill="#10b981" fontSize="13" fontWeight="bold">
          F_B
        </text>
      </g>
    );
    
    // Total force (purple) - at center with dashed line
    vectors.push(
      <g key="f-total">
        <line
          x1={particleX}
          y1={particleY}
          x2={particleX}
          y2={particleY + fTotalDisplay}
          stroke="#8b5cf6"
          strokeWidth={Math.max(fTotalLength / 5, 1)}
          strokeDasharray="6,3"
          markerEnd="url(#arrowhead-purple)"
        />
        <rect
          x={particleX - 30}
          y={particleY + Math.max(fTotalDisplay/2, 15) - 12}
          width={60}
          height={24}
          fill="white"
          stroke="#8b5cf6"
          strokeWidth={2}
          rx={3}
        />
        <text x={particleX - 25} y={particleY + Math.max(fTotalDisplay/2, 15) + 5} fill="#8b5cf6" fontSize="14" fontWeight="bold">
          F_total
        </text>
      </g>
    );
    
    return vectors;
  };
  
  // Render field vectors at particle location
  const renderFieldVectors = () => {
    const vectors = [];
    const scale = 2000; // Very large scale to see changes
    const fieldOffset = 60;
    const minLength = 3;
    
    // Electric field (red) - should be ~0 at v=0 (lab frame) and grow
    const eLength = Math.abs(fields.E) * scale;
    const eDisplayLength = Math.max(eLength, minLength);
    const startY = particleY - fieldOffset;
    const eDirection = fields.E >= 0 ? -1 : 1;
    
    console.log(`===== FIELDS =====`);
    console.log(`E = ${fields.E.toFixed(6)} → ${eLength.toFixed(1)}px`);
    console.log(`B = ${fields.B.toFixed(6)}`);
    console.log(`λ_net = ${fields.lambda_net.toFixed(6)}`);
    
    vectors.push(
      <g key="e-field">
        <line
          x1={particleX - 60}
          y1={startY}
          x2={particleX - 60}
          y2={startY + eDirection * eDisplayLength}
          stroke="#ef4444"
          strokeWidth={Math.max(eLength / 15, 2)}
          strokeDasharray="5,2"
          markerEnd="url(#arrowhead-red)"
          opacity={eLength < 5 ? 0.4 : 1}
        />
        <rect
          x={particleX - 92}
          y={startY + eDirection * Math.max(eDisplayLength/2, 10) - 10}
          width={28}
          height={18}
          fill="white"
          stroke="#ef4444"
          strokeWidth={1}
          rx={3}
        />
        <text x={particleX - 88} y={startY + eDirection * Math.max(eDisplayLength/2, 10) + 3} fill="#ef4444" fontSize="12" fontWeight="bold">
          E
        </text>
      </g>
    );
    
    // Magnetic field (green) - size proportional to B magnitude
    const bMagnitude = Math.abs(fields.B);
    const bSize = Math.max(bMagnitude * scale * 0.15, 5); 
    const symbol = fields.B > 0 ? "⊙" : "⊗";
    
    console.log(`B circle size = ${bSize.toFixed(1)}px`);
    
    vectors.push(
      <g key="b-field">
        <circle
          cx={particleX + 60}
          cy={startY}
          r={bSize}
          fill="#e6f7f0"
          stroke="#10b981"
          strokeWidth={Math.max(bSize / 10, 2)}
          opacity={bSize < 8 ? 0.4 : 1}
        />
        <text x={particleX + 60 - 8} y={startY + 8} fill="#10b981" fontSize="24" fontWeight="bold">
          {symbol}
        </text>
        <rect
          x={particleX + 60 + bSize + 5}
          y={startY - 10}
          width={28}
          height={18}
          fill="white"
          stroke="#10b981"
          strokeWidth={1}
          rx={3}
        />
        <text x={particleX + 60 + bSize + 10} y={startY + 2} fill="#10b981" fontSize="12" fontWeight="bold">
          B
        </text>
      </g>
    );
    
    return vectors;
  };
  
  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-gray-50 rounded-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        Relativistic Electromagnetic Force Invariance
      </h2>
      
      <div className="mb-6 bg-white p-4 rounded shadow">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Observer Velocity (relative to lab frame): {(observerVelocity * c).toFixed(2)}c
        </label>
        <input
          type="range"
          min="0"
          max={particleVelocity}
          step="0.01"
          value={observerVelocity}
          onChange={(e) => setObserverVelocity(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0c (Lab frame)</span>
          <span>{(particleVelocity * c).toFixed(2)}c (Particle frame)</span>
        </div>
      </div>
      
      <svg width={width} height={height} className="bg-white border border-gray-300 rounded mb-4">
        <defs>
          <marker id="arrowhead-red" markerWidth="30" markerHeight="30" refX="25" refY="15" orient="auto">
            <path d="M 0 15 L 25 15 M 15 5 L 25 15 L 15 25" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </marker>
          <marker id="arrowhead-blue" markerWidth="30" markerHeight="30" refX="25" refY="15" orient="auto">
            <path d="M 0 15 L 25 15 M 15 5 L 25 15 L 15 25" stroke="#3b82f6" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </marker>
          <marker id="arrowhead-green" markerWidth="30" markerHeight="30" refX="25" refY="15" orient="auto">
            <path d="M 0 15 L 25 15 M 15 5 L 25 15 L 15 25" stroke="#10b981" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </marker>
          <marker id="arrowhead-purple" markerWidth="30" markerHeight="30" refX="25" refY="15" orient="auto">
            <path d="M 0 15 L 25 15 M 15 5 L 25 15 L 15 25" stroke="#8b5cf6" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </marker>
        </defs>
        
        {/* Field lines */}
        {renderFieldLines()}
        
        {/* Field vectors at particle */}
        {renderFieldVectors()}
        
        {/* Wire */}
        <line x1={0} y1={wireY} x2={wireLength} y2={wireY} stroke="#374151" strokeWidth={4} />
        
        {/* Charges in wire */}
        {renderCharges()}
        
        {/* Test particle */}
        <circle cx={particleX} cy={particleY} r={8} fill="#fbbf24" stroke="#f59e0b" strokeWidth={2} />
        <text x={particleX - 5} y={particleY + 25} fill="#f59e0b" fontSize="12" fontWeight="bold">+</text>
        
        {/* Force vectors */}
        {renderForceVectors()}
        
        {/* Labels */}
        <text x={10} y={wireY - 10} fontSize="14" fill="#374151" fontWeight="bold">
          Wire (e⁻ moving, p⁺ stationary in lab)
        </text>
      </svg>
      
      <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded shadow">
        <div>
          <h3 className="font-bold text-gray-700 mb-2">Fields in Observer Frame:</h3>
          <div className="space-y-1 text-sm">
            <p>E-field: <span className="font-mono text-red-600">{fields.E.toFixed(4)}</span></p>
            <p>B-field: <span className="font-mono text-green-600">{fields.B.toFixed(4)}</span></p>
            <p>Net charge density λ: <span className="font-mono">{fields.lambda_net.toFixed(4)}</span></p>
            <p>Current I: <span className="font-mono">{fields.I.toFixed(4)}</span></p>
            <p className="text-xs text-gray-500 mt-2">γ_e⁻ = {gamma(wireCurrentVelocity - observerVelocity).toFixed(3)}</p>
            <p className="text-xs text-gray-500">γ_p⁺ = {gamma(-observerVelocity).toFixed(3)}</p>
          </div>
        </div>
        
        <div>
          <h3 className="font-bold text-gray-700 mb-2">Forces on Test Particle:</h3>
          <div className="space-y-1 text-sm">
            <p>Electric force: <span className="font-mono text-red-600">{fields.F_electric.toFixed(4)}</span></p>
            <p>Magnetic force: <span className="font-mono text-green-600">{fields.F_magnetic.toFixed(4)}</span></p>
            <p className="text-lg mt-2">
              <strong>Total force: <span className="font-mono text-purple-600">{fields.F_total.toFixed(4)}</span></strong>
            </p>
            <p className="text-xs text-gray-600 mt-1">Particle velocity: {fields.v_test.toFixed(3)}c</p>
            <p className="text-xs text-gray-600">v_e⁻ = {(wireCurrentVelocity - observerVelocity).toFixed(3)}c</p>
            <p className="text-xs text-gray-600">v_p⁺ = {(-observerVelocity).toFixed(3)}c</p>
          </div>
        </div>
      </div>
      
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm text-gray-700">
          <strong>Key insight:</strong> As you change reference frames, the electric and magnetic fields transform 
          according to special relativity. Length contraction changes the charge densities seen in each frame. 
          However, the <strong className="text-purple-600">total electromagnetic force remains invariant</strong> across 
          all reference frames, demonstrating the deep unity of electricity and magnetism.
        </p>
      </div>
      
      <div className="mt-4 space-y-2 text-xs text-gray-600">
        <p><span className="inline-block w-4 h-4 bg-blue-500 rounded-full mr-2 text-center text-white text-xs leading-4">−</span><strong>Blue (−):</strong> Electrons (moving at 0.5c in lab frame)</p>
        <p><span className="inline-block w-4 h-4 bg-red-500 rounded-full mr-2 text-center text-white text-xs leading-4">+</span><strong>Red (+):</strong> Protons (stationary in lab frame)</p>
        <p><span className="inline-block w-4 h-4 bg-yellow-400 rounded-full mr-2"></span><strong>Yellow:</strong> Positive test particle (moving at 0.6c in lab frame)</p>
        <p className="mt-3"><strong>Forces:</strong> F_E (red) = electric force, F_B (green) = magnetic force, F_total (purple dashed) = sum</p>
        <p><strong>Fields:</strong> E (red dashed) = electric field, B (green circle with ⊙/⊗) = magnetic field (out/into page)</p>
      </div>
    </div>
  );
};

export default RelativisticWireSimulation;