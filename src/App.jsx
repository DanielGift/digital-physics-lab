import EnergyGame from "./energy-game.jsx";
import PotentialSimulator from "./harmonic.jsx";
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/energy-game" element={<EnergyGame />} />
  <Route path="/harmonic" element={<Harmonic />} />   {/* ← NEW */}
</Routes>

export default function App() {
  return <EnergyGame />;
}
