import { useState, useRef } from "react";

const GREEK = ["alpha", "beta", "gamma", "delta", "epsilon", "theta", "lambda", "mu", "pi", "sigma", "omega", "Delta", "Sigma", "Omega", "phi", "rho", "tau"].map((_, i) =>
  ["\u03B1", "\u03B2", "\u03B3", "\u03B4", "\u03B5", "\u03B8", "\u03BB", "\u03BC", "\u03C0", "\u03C3", "\u03C9", "\u0394", "\u03A3", "\u03A9", "\u03C6", "\u03C1", "\u03C4"][i]
);

const OPERATORS = ["\u00B1", "\u00D7", "\u00F7", "\u00B7", "\u2248", "\u2260", "\u2264", "\u2265", "\u221E", "\u221A", "\u222B", "\u2202", "\u2211", "\u220F", "\u2192", "\u21D2"];

const supMap = {
  "0": "\u2070", "1": "\u00B9", "2": "\u00B2", "3": "\u00B3", "4": "\u2074",
  "5": "\u2075", "6": "\u2076", "7": "\u2077", "8": "\u2078", "9": "\u2079",
  "n": "\u207F", "i": "\u2071", "+": "\u207A", "-": "\u207B", "(": "\u207D", ")": "\u207E",
  "a": "\u1D43", "b": "\u1D47", "c": "\u1D9C", "d": "\u1D48", "e": "\u1D49",
  "f": "\u1DA0", "g": "\u1D4D", "h": "\u02B0", "j": "\u02B2", "k": "\u1D4F",
  "l": "\u02E1", "m": "\u1D50", "o": "\u1D52", "p": "\u1D56", "r": "\u02B3",
  "s": "\u02E2", "t": "\u1D57", "u": "\u1D58", "v": "\u1D5B", "w": "\u02B7",
  "x": "\u02E3", "y": "\u02B8", "z": "\u1DBB"
};

const subMap = {
  "0": "\u2080", "1": "\u2081", "2": "\u2082", "3": "\u2083", "4": "\u2084",
  "5": "\u2085", "6": "\u2086", "7": "\u2087", "8": "\u2088", "9": "\u2089",
  "a": "\u2090", "e": "\u2091", "h": "\u2095", "i": "\u1D62", "j": "\u2C7C",
  "k": "\u2096", "l": "\u2097", "m": "\u2098", "n": "\u2099", "o": "\u2092",
  "p": "\u209A", "r": "\u1D63", "s": "\u209B", "t": "\u209C", "u": "\u1D64",
  "v": "\u1D65", "x": "\u2093", "+": "\u208A", "-": "\u208B", "(": "\u208D", ")": "\u208E"
};

export default function EqBuilder({ onInsert, onClose }) {
  const [eq, setEq] = useState("");
  const inputRef = useRef(null);
  const [showFrac, setShowFrac] = useState(false);
  const [fracNum, setFracNum] = useState("");
  const [fracDen, setFracDen] = useState("");
  const [supMode, setSupMode] = useState(false);
  const [subMode, setSubMode] = useState(false);

  const insert = (ch) => {
    setEq(p => p + ch);
    inputRef.current?.focus();
  };

  const handleKey = (e) => {
    if (supMode && supMap[e.key]) {
      e.preventDefault();
      setEq(p => p + supMap[e.key]);
      return;
    }
    if (subMode && subMap[e.key]) {
      e.preventDefault();
      setEq(p => p + subMap[e.key]);
      return;
    }
  };

  const bs = {
    padding: "3px 7px",
    background: "transparent",
    border: "1px solid #2a2a3a",
    borderRadius: 3,
    color: "#bbb",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
    minWidth: 28,
    textAlign: "center"
  };

  const bsA = {
    ...bs,
    background: "rgba(126,184,255,0.15)",
    borderColor: "#7eb8ff",
    color: "#7eb8ff"
  };

  return (
    <div style={{ padding: 10, borderBottom: "1px solid #2a2a3a", background: "rgba(126,184,255,0.03)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#999" }}>Equation Builder</span>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 12 }}
        >
          X
        </button>
      </div>

      {/* Greek letters */}
      <div style={{ display: "flex", gap: 2, flexWrap: "wrap", marginBottom: 6 }}>
        <span style={{ fontSize: 9, color: "#555", width: "100%", marginBottom: 2 }}>Greek</span>
        {GREEK.map(g => (
          <button key={g} onClick={() => insert(g)} style={bs}>{g}</button>
        ))}
      </div>

      {/* Operators */}
      <div style={{ display: "flex", gap: 2, flexWrap: "wrap", marginBottom: 6 }}>
        <span style={{ fontSize: 9, color: "#555", width: "100%", marginBottom: 2 }}>Operators</span>
        {OPERATORS.map(o => (
          <button key={o} onClick={() => insert(o)} style={bs}>{o}</button>
        ))}
      </div>

      {/* Mode toggles */}
      <div style={{ display: "flex", gap: 3, marginBottom: 6 }}>
        <button
          onClick={() => { setSupMode(!supMode); setSubMode(false); }}
          style={supMode ? bsA : bs}
        >
          x<sup style={{ fontSize: 8 }}>n</sup>
        </button>
        <button
          onClick={() => { setSubMode(!subMode); setSupMode(false); }}
          style={subMode ? bsA : bs}
        >
          x<sub style={{ fontSize: 8 }}>n</sub>
        </button>
        <button
          onClick={() => setShowFrac(!showFrac)}
          style={showFrac ? bsA : bs}
        >
          / Frac
        </button>
        <span style={{
          fontSize: 9,
          color: supMode ? "#7eb8ff" : subMode ? "#7eb8ff" : "#444",
          marginLeft: 4,
          alignSelf: "center"
        }}>
          {supMode ? "Type for superscript (letters+digits)" : subMode ? "Type for subscript (letters+digits)" : ""}
        </span>
      </div>

      {/* Fraction builder */}
      {showFrac && (
        <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 6 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            <input
              value={fracNum}
              onChange={e => setFracNum(e.target.value)}
              placeholder="num"
              style={{
                width: 60,
                padding: "3px 5px",
                background: "#0e0e16",
                border: "1px solid #2a2a3a",
                borderRadius: 3,
                color: "#e0e0e8",
                fontSize: 12,
                fontFamily: "serif",
                textAlign: "center"
              }}
            />
            <div style={{ width: 50, height: 1, background: "#999" }} />
            <input
              value={fracDen}
              onChange={e => setFracDen(e.target.value)}
              placeholder="den"
              style={{
                width: 60,
                padding: "3px 5px",
                background: "#0e0e16",
                border: "1px solid #2a2a3a",
                borderRadius: 3,
                color: "#e0e0e8",
                fontSize: 12,
                fontFamily: "serif",
                textAlign: "center"
              }}
            />
          </div>
          <button
            onClick={() => {
              if (fracNum && fracDen) {
                insert(`(${fracNum})/(${fracDen})`);
                setFracNum("");
                setFracDen("");
                setShowFrac(false);
              }
            }}
            style={{ ...bs, color: "#7eb8ff", borderColor: "#7eb8ff" }}
          >
            Add
          </button>
        </div>
      )}

      {/* Main input */}
      <div style={{ display: "flex", gap: 4 }}>
        <input
          ref={inputRef}
          value={eq}
          onChange={e => setEq(e.target.value)}
          onKeyDown={handleKey}
          style={{
            flex: 1,
            padding: "6px 8px",
            background: "#0e0e16",
            border: "1px solid #2a2a3a",
            borderRadius: 4,
            color: "#e0e0e8",
            fontSize: 14,
            fontFamily: "'Cambria Math','Times New Roman',serif",
            outline: "none"
          }}
          placeholder="Build equation here..."
        />
        <button
          onClick={() => {
            if (eq.trim()) {
              onInsert(eq.trim());
              setEq("");
            }
          }}
          style={{
            padding: "6px 14px",
            background: "#2a5fad",
            border: "none",
            borderRadius: 4,
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit"
          }}
        >
          Insert
        </button>
      </div>
    </div>
  );
}
