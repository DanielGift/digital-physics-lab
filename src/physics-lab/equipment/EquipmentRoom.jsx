import { useState } from "react";
import { EQUIPMENT, ICON_MAP } from "./equipmentData";

export default function EquipmentRoom({ dispatch }) {
  const [selected, setSelected] = useState([]); // Array of selected equipment types

  // Get equipment objects for selected types
  const selectedEq = selected.map(type => EQUIPMENT.find(e => e.type === type)).filter(Boolean);
  const singleEq = selectedEq.length === 1 ? selectedEq[0] : null;

  const handleClick = (e, type) => {
    e.stopPropagation();

    // Ctrl/Cmd + click for multi-select
    if (e.ctrlKey || e.metaKey) {
      setSelected(prev =>
        prev.includes(type)
          ? prev.filter(t => t !== type)
          : [...prev, type]
      );
    } else {
      // Regular click - single select or deselect
      setSelected(prev =>
        prev.length === 1 && prev[0] === type ? [] : [type]
      );
    }
  };

  const addAllToTray = () => {
    selected.forEach(type => {
      dispatch({ type: "BRING", eqType: type });
    });
    setSelected([]);
  };

  return (
    <div style={{
      flex: 1,
      display: "flex",
      position: "relative",
      overflow: "hidden",
      background: "linear-gradient(135deg,#0d0d14,#12121c,#0d0d14)"
    }}>
      {/* Main grid area */}
      <div
        style={{ flex: 1, padding: "16px 24px", display: "flex", flexDirection: "column", overflow: "auto" }}
        onClick={() => selected.length > 0 && setSelected([])}
      >
        <h2 style={{
          fontSize: 20,
          fontWeight: 700,
          color: "#e0e0e8",
          margin: "0 0 2px",
          letterSpacing: "-0.02em"
        }}>
          Equipment Room
        </h2>
        <p style={{ fontSize: 12, color: "#555", margin: "0 0 12px" }}>
          Click to inspect • Ctrl/Cmd+click for multi-select
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))",
          gap: 10,
          alignContent: "start"
        }}>
          {EQUIPMENT.map(e => {
            const Icon = ICON_MAP[e.type];
            const isSelected = selected.includes(e.type);
            return (
              <button
                key={e.type}
                onClick={(ev) => handleClick(ev, e.type)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "12px 10px",
                  background: isSelected
                    ? "linear-gradient(180deg,#1a1a30,#161628)"
                    : "linear-gradient(180deg,#1a1a26,#16161f)",
                  border: `1px solid ${isSelected ? "#7eb8ff" : "#2a2a3a"}`,
                  borderRadius: 10,
                  cursor: "pointer",
                  transition: "all 0.25s",
                  fontFamily: "inherit",
                  gap: 4,
                  boxShadow: isSelected ? "0 0 20px rgba(126,184,255,0.08)" : "none",
                  transform: isSelected ? "translateY(-2px)" : "none"
                }}
              >
                <div style={{ height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {Icon && <Icon />}
                </div>
                <div style={{ color: "#d0d0d8", fontSize: 11, fontWeight: 600, textAlign: "center" }}>
                  {e.name}
                </div>
                <div style={{
                  color: "#555",
                  fontSize: 9,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em"
                }}>
                  {e.category}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sliding info panel */}
      <div style={{
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        width: 320,
        background: "linear-gradient(180deg,#15151f,#111118)",
        borderLeft: "1px solid #2a2a3a",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.4)",
        zIndex: 10,
        transform: selected.length > 0 ? "translateX(0)" : "translateX(100%)",
        opacity: selected.length > 0 ? 1 : 0
      }}>
        {selected.length > 0 && (
          <>
            {/* Scrollable content area */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 12
            }}>
              {/* Single item view */}
              {singleEq && (
                <>
                  {/* Header */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    paddingBottom: 10,
                    borderBottom: "1px solid #2a2a3a"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", transform: "scale(0.85)" }}>
                      {(() => { const Icon = ICON_MAP[singleEq.type]; return Icon ? <Icon /> : null; })()}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#e0e0e8" }}>
                        {singleEq.name}
                      </h3>
                      <span style={{
                        fontSize: 9,
                        color: "#7eb8ff",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em"
                      }}>
                        {singleEq.category}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <h4 style={{
                      margin: "0 0 3px",
                      fontSize: 9,
                      fontWeight: 700,
                      color: "#666",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em"
                    }}>
                      Description
                    </h4>
                    <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: "#b0b0bc" }}>
                      {singleEq.description}
                    </p>
                  </div>

                  {/* How to Use */}
                  <div>
                    <h4 style={{
                      margin: "0 0 3px",
                      fontSize: 9,
                      fontWeight: 700,
                      color: "#666",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em"
                    }}>
                      How to Use
                    </h4>
                    <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: "#b0b0bc" }}>
                      {singleEq.usage}
                    </p>
                  </div>
                </>
              )}

              {/* Multi-select view */}
              {selectedEq.length > 1 && (
                <>
                  <div style={{
                    paddingBottom: 10,
                    borderBottom: "1px solid #2a2a3a"
                  }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#e0e0e8" }}>
                      {selectedEq.length} Items Selected
                    </h3>
                    <span style={{
                      fontSize: 9,
                      color: "#7eb8ff",
                      fontWeight: 600
                    }}>
                      Ready to add to tray
                    </span>
                  </div>

                  {/* List of selected items */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {selectedEq.map(eq => {
                      const Icon = ICON_MAP[eq.type];
                      return (
                        <div
                          key={eq.type}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "6px 10px",
                            background: "rgba(126,184,255,0.05)",
                            border: "1px solid #2a2a3a",
                            borderRadius: 6
                          }}
                        >
                          <div style={{ transform: "scale(0.5)", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {Icon && <Icon />}
                          </div>
                          <span style={{ fontSize: 11, color: "#d0d0d8", fontWeight: 500 }}>
                            {eq.name}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected(prev => prev.filter(t => t !== eq.type));
                            }}
                            style={{
                              marginLeft: "auto",
                              width: 18,
                              height: 18,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "transparent",
                              border: "none",
                              color: "#666",
                              fontSize: 10,
                              cursor: "pointer",
                              borderRadius: 3
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Fixed button area at bottom */}
            <div style={{
              padding: "12px 18px",
              borderTop: "1px solid #2a2a3a",
              background: "linear-gradient(180deg,#13131b,#0f0f15)",
              flexShrink: 0
            }}>
              <button
                onClick={addAllToTray}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  background: "linear-gradient(135deg,#3b7ddb,#2a5fad)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit"
                }}
              >
                + Add {selectedEq.length > 1 ? `All ${selectedEq.length} Items` : ""} to Lab Tray
              </button>
            </div>

            {/* Close button */}
            <button
              onClick={() => setSelected([])}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                width: 24,
                height: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid #2a2a3a",
                borderRadius: 5,
                color: "#888",
                fontSize: 10,
                cursor: "pointer",
                fontFamily: "inherit"
              }}
            >
              X
            </button>
          </>
        )}
      </div>
    </div>
  );
}
