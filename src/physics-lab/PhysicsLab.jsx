import { useReducer, useRef, useState, useEffect } from "react";
import { reducer, initialState } from "./state/reducer";
import EquipmentRoom from "./equipment/EquipmentRoom";
import LabRoom from "./lab/LabRoom";
import NbEditor from "./notebook/NbEditor";

const TABS = [
  { id: "lab", label: "Lab Room" },
  { id: "equipment", label: "Equipment Room" },
  { id: "notebook", label: "Lab Notebook" }
];

export default function PhysicsLab() {
  const [s, dispatch] = useReducer(reducer, initialState);
  const cvRef = useRef(null);
  const lqRef = useRef(null);
  const containerRef = useRef(null);

  // Notebook panel width (percentage of container)
  const [nbWidth, setNbWidth] = useState(40);
  const [dividerDrag, setDividerDrag] = useState(null);

  // Handle divider dragging
  useEffect(() => {
    if (!dividerDrag) return;

    const onMove = (e) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = ((rect.width - x) / rect.width) * 100;
      setNbWidth(Math.max(20, Math.min(60, pct)));
    };

    const onUp = () => setDividerDrag(null);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dividerDrag]);

  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      background: "#0a0a0f",
      color: "#e0e0e8",
      fontFamily: "'Segoe UI','Helvetica Neue',system-ui,sans-serif",
      overflow: "hidden"
    }}>
      {/* Navigation */}
      <nav style={{
        display: "flex",
        alignItems: "center",
        height: 36,
        background: "linear-gradient(180deg,#16161e,#111118)",
        borderBottom: "1px solid #2a2a3a",
        padding: "0 12px",
        flexShrink: 0,
        gap: 8
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", width: 130 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: "#7eb8ff", letterSpacing: "-0.02em" }}>
            PhysLab
          </span>
        </div>

        {/* Tab buttons */}
        <div style={{ display: "flex", gap: 2, flex: 1, justifyContent: "center" }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => dispatch({ type: "TAB", tab: t.id })}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "7px 18px",
                border: "none",
                background: s.activeTab === t.id ? "rgba(126,184,255,0.1)" : "transparent",
                color: s.activeTab === t.id ? "#7eb8ff" : "#888",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                borderRadius: 7,
                transition: "all 0.2s",
                fontFamily: "inherit"
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Notebook toggle (only shown in lab view) */}
        <div style={{ display: "flex", alignItems: "center", width: 130, justifyContent: "flex-end" }}>
          {s.activeTab === "lab" && (
            <button
              onClick={() => dispatch({ type: "NB_TOG" })}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 12px",
                border: `1px solid ${s.nbPanel ? "#7eb8ff" : "#2a2a3a"}`,
                background: s.nbPanel ? "rgba(126,184,255,0.12)" : "transparent",
                color: s.nbPanel ? "#7eb8ff" : "#888",
                fontSize: 11,
                cursor: "pointer",
                borderRadius: 5,
                fontFamily: "inherit"
              }}
            >
              Notebook
            </button>
          )}
        </div>
      </nav>

      {/* Main content area */}
      <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>
        {/* Equipment Room */}
        <div style={{ display: s.activeTab === "equipment" ? "flex" : "none", flex: 1, minHeight: 0 }}>
          <EquipmentRoom dispatch={dispatch} />
        </div>

        {/* Lab Room */}
        <div
          ref={containerRef}
          style={{
            display: s.activeTab === "lab" ? "flex" : "none",
            flex: 1,
            minHeight: 0,
            userSelect: dividerDrag ? "none" : "auto"
          }}
        >
          <LabRoom
            labItems={s.labItems}
            strings={s.strings}
            selectedId={s.selectedId}
            dispatch={dispatch}
            canvasRef={cvRef}
            nbOpen={s.nbPanel}
            lqRef={lqRef}
          />

          {/* Draggable divider */}
          {s.nbPanel && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                setDividerDrag(true);
              }}
              style={{
                width: 6,
                flexShrink: 0,
                background: dividerDrag ? "#7eb8ff" : "#2a2a3a",
                cursor: "col-resize",
                transition: dividerDrag ? "none" : "background 0.2s"
              }}
              onMouseEnter={(e) => e.target.style.background = "#4a4a5a"}
              onMouseLeave={(e) => { if (!dividerDrag) e.target.style.background = "#2a2a3a"; }}
            />
          )}

          {/* Side panel notebook */}
          {s.nbPanel && (
            <div style={{
              width: `${nbWidth}%`,
              minWidth: 250,
              maxWidth: "60%",
              display: "flex",
              flexDirection: "column",
              background: "linear-gradient(180deg,#111118,#0e0e14)",
              overflow: "hidden",
              flexShrink: 0
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderBottom: "1px solid #2a2a3a",
                flexShrink: 0
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#e0e0e8" }}>Lab Notebook</span>
                <button
                  onClick={() => dispatch({ type: "NB_CLOSE" })}
                  style={{
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
              </div>
              <NbEditor entries={s.notebookEntries} dispatch={dispatch} labCanvasRef={cvRef} lqRef={lqRef} compact />
            </div>
          )}
        </div>

        {/* Full Notebook View */}
        <div style={{
          display: s.activeTab === "notebook" ? "flex" : "none",
          flex: 1,
          minHeight: 0,
          flexDirection: "column",
          background: "linear-gradient(135deg,#0d0d14,#12121c,#0d0d14)"
        }}>
          <div style={{
            padding: "22px 32px 14px",
            borderBottom: "1px solid #2a2a3a",
            display: "flex",
            alignItems: "baseline",
            gap: 10,
            flexShrink: 0
          }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#e0e0e8" }}>Lab Notebook</h2>
          </div>
          <div style={{ flex: 1, minHeight: 0, padding: "0 20px 20px", display: "flex", flexDirection: "column" }}>
            <NbEditor entries={s.notebookEntries} dispatch={dispatch} labCanvasRef={cvRef} lqRef={lqRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
