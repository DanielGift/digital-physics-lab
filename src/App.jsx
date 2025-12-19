import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import EnergyGame from "./energy-game.jsx";
import PotentialSimulator from "./harmonic.jsx";
import CircuitWaterGame from "./circuit.jsx";

function Home() {
  return (
    <div>
      <header>
        <h1>Digital Physics Lab</h1>
        <p className="subtitle">by Daniel Gift</p>
      </header>

      <div className="simulations-grid">
        <Link to="/energy-game" className="sim-card">
          <div className="sim-icon">🔋</div>
          <h2 className="sim-title">Balance Your Energy Game</h2>
          <p className="sim-description">
            16-bit adventure to achieve the right amount of energy to escape!
          </p>
        </Link>

        <Link to="/harmonic" className="sim-card">
          <div className="sim-icon">📈</div>
          <h2 className="sim-title">Arbitrary Potential Simulator</h2>
          <p className="sim-description">
            See how any arbitrary potential with a local minimum can be
            approximated as a harmonic oscillator!
          </p>
        </Link>

        <a href="efield.html" className="sim-card">
          <div className="sim-icon">⚡️</div>
          <h2 className="sim-title">Extended Object E-Field Simulator</h2>
          <p className="sim-description">
            See the contributions to the electric field from parts of an
            extended object.
          </p>
        </a>
/*	<Link to="/circuit" className="sim-card">
 \\         <div className="sim-icon">💡</div>
 \\         <h2 className="sim-title">Circuit Flow Visualization</h2>
 \\         <p className="sim-description">
 \\           Build an analogy to the flow of current in a circuit with water!
 \\         </p>
 \\       </Link>	*/		
      </div>

      <footer>
        <p>© 2025 Digital Physics Lab. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/energy-game" element={<EnergyGame />} />
      <Route path="/harmonic" element={<PotentialSimulator />} />
      <Route path="/circuit" element={<CircuitWaterGame />} />
    </Routes>
  );
}
