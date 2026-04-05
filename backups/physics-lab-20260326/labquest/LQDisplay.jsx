import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";

const LQDisplay = forwardRef(function LQDisplay({ live, recording, data, onStart, onStop, dir }, ref) {
  const [mode, setMode] = useState("live");
  const [gt, setGt] = useState("position");
  const [zoom, setZoom] = useState(null); // { tMin, tMax, vMin, vMax } or null for auto
  const [dragZoom, setDragZoom] = useState(null); // { startX, startY, currentX, currentY }
  const gRef = useRef(null);
  const containerRef = useRef(null);

  // Position and size state for draggable/resizable window
  const [pos, setPos] = useState({ x: null, y: null }); // null = default position
  const [size, setSize] = useState({ w: 270, h: null }); // null height = auto
  const [dragging, setDragging] = useState(null); // { startX, startY, origX, origY }
  const [resizing, setResizing] = useState(null); // { startX, startY, origW, origH }

  // Expose the graph canvas and container to parent for screenshot capture
  useImperativeHandle(ref, () => ({
    getGraphCanvas: () => gRef.current,
    getContainer: () => containerRef.current
  }));

  // Handle window dragging
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const dx = e.clientX - dragging.startX;
      const dy = e.clientY - dragging.startY;
      setPos({ x: dragging.origX + dx, y: dragging.origY + dy });
    };
    const onUp = () => setDragging(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  // Handle window resizing
  useEffect(() => {
    if (!resizing) return;
    const onMove = (e) => {
      const dx = e.clientX - resizing.startX;
      const dy = e.clientY - resizing.startY;
      setSize({
        w: Math.max(200, resizing.origW + dx),
        h: resizing.origH ? Math.max(150, resizing.origH + dy) : null
      });
    };
    const onUp = () => setResizing(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing]);

  const startDrag = (e) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragging({
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x ?? rect.left,
      origY: pos.y ?? rect.top
    });
  };

  const startResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setResizing({
      startX: e.clientX,
      startY: e.clientY,
      origW: size.w,
      origH: size.h ?? rect.height
    });
  };

  const m = {
    position: { d: data?.positions, l: "Position", u: "m", c: "#44ff88" },
    velocity: { d: data?.velocities, l: "Velocity", u: "m/s", c: "#ffaa44" },
    acceleration: { d: data?.accelerations, l: "Accel", u: "m/s²", c: "#ff4488" }
  };

  // Graph layout constants
  const pL = 42, pR = 6, pT = 16, pB = 22;

  // Calculate data bounds
  const getDataBounds = useCallback(() => {
    if (!data) return null;
    const { d: dd } = m[gt];
    if (!dd || dd.length < 2) return null;

    const t = data.times;
    const filt = dd.filter(v => v != null && isFinite(v));
    if (!filt.length) return null;

    return {
      mnV: Math.min(...filt),
      mxV: Math.max(...filt),
      mnT: t[0],
      mxT: t[t.length - 1]
    };
  }, [data, gt]);

  // Convert canvas coords to data coords
  const canvasToData = useCallback((cx, cy, w, h) => {
    const bounds = zoom || getDataBounds();
    if (!bounds) return null;

    const { mnV, mxV, mnT, mxT } = bounds;
    const rV = mxV - mnV || 1;
    const rT = mxT - mnT || 1;
    const pW = w - pL - pR;
    const pH = h - pT - pB;

    const t = mnT + ((cx - pL) / pW) * rT;
    const v = mxV - ((cy - pT) / pH) * rV;
    return { t, v };
  }, [zoom, getDataBounds]);

  // Draw graph
  useEffect(() => {
    if (!data || mode !== "graph") return;

    const c = gRef.current;
    if (!c) return;

    const ctx = c.getContext("2d");
    const w = c.width, h = c.height;

    ctx.fillStyle = "#0a1a0a";
    ctx.fillRect(0, 0, w, h);

    const { d: dd, l, u, c: col } = m[gt];
    if (!dd || dd.length < 2) return;

    const t = data.times;
    const filt = dd.filter(v => v != null && isFinite(v));
    if (!filt.length) return;

    // Use zoom bounds or auto-calculate
    let mnV, mxV, mnT, mxT;
    if (zoom) {
      mnV = zoom.mnV;
      mxV = zoom.mxV;
      mnT = zoom.mnT;
      mxT = zoom.mxT;
    } else {
      mnV = Math.min(...filt);
      mxV = Math.max(...filt);
      mnT = t[0];
      mxT = t[t.length - 1];
    }

    const rV = mxV - mnV || 1;
    const rT = mxT - mnT || 1;
    const pW = w - pL - pR;
    const pH = h - pT - pB;

    // Grid lines
    ctx.strokeStyle = "#1a3a1a";
    ctx.lineWidth = 0.5;
    ctx.font = "7px monospace";
    ctx.fillStyle = "#4a6a4a";

    for (let i = 0; i <= 4; i++) {
      const y = pT + pH * i / 4;
      ctx.beginPath();
      ctx.moveTo(pL, y);
      ctx.lineTo(pL + pW, y);
      ctx.stroke();
      ctx.textAlign = "right";
      ctx.fillText((mxV - rV * i / 4).toFixed(2), pL - 3, y + 3);
    }

    ctx.textAlign = "center";
    for (let i = 0; i <= 4; i++) {
      ctx.fillText((mnT + rT * i / 4).toFixed(1) + "s", pL + pW * i / 4, h - 5);
    }

    // Data line
    ctx.save();
    ctx.beginPath();
    ctx.rect(pL, pT, pW, pH);
    ctx.clip();

    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let started = false;

    for (let i = 0; i < dd.length; i++) {
      if (dd[i] == null || !isFinite(dd[i])) continue;
      const x = pL + ((t[i] - mnT) / rT) * pW;
      const y = pT + (1 - (dd[i] - mnV) / rV) * pH;
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.restore();

    // Label
    ctx.fillStyle = col;
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`${l} (${u})`, pL + 3, pT + 10);

    // Zoom indicator
    if (zoom) {
      ctx.fillStyle = "#88bbee";
      ctx.font = "7px monospace";
      ctx.textAlign = "right";
      ctx.fillText("ZOOMED", w - 4, pT + 8);
    }

    // Draw zoom selection rectangle
    if (dragZoom) {
      ctx.strokeStyle = "#88bbee";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      const x = Math.min(dragZoom.startX, dragZoom.currentX);
      const y = Math.min(dragZoom.startY, dragZoom.currentY);
      const w2 = Math.abs(dragZoom.currentX - dragZoom.startX);
      const h2 = Math.abs(dragZoom.currentY - dragZoom.startY);
      ctx.strokeRect(x, y, w2, h2);
      ctx.setLineDash([]);
    }
  }, [data, gt, mode, zoom, dragZoom]);

  // Export to CSV
  const exportCSV = () => {
    if (!data) return;

    let csv = "Time (s),Position (m),Velocity (m/s),Acceleration (m/s²)\n";
    for (let i = 0; i < data.times.length; i++) {
      csv += `${data.times[i].toFixed(4)},`;
      csv += `${(data.positions[i] ?? "").toString()},`;
      csv += `${(data.velocities[i] ?? "").toString()},`;
      csv += `${(data.accelerations[i] ?? "").toString()}\n`;
    }

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `labquest_data_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Save graph as image
  const saveGraphImage = () => {
    const c = gRef.current;
    if (!c) return;

    const url = c.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `labquest_graph_${gt}_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.png`;
    a.click();
  };

  // Handle mouse events for zoom selection
  const handleMouseDown = (e) => {
    const c = gRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (c.width / rect.width);
    const y = (e.clientY - rect.top) * (c.height / rect.height);
    setDragZoom({ startX: x, startY: y, currentX: x, currentY: y });
  };

  const handleMouseMove = (e) => {
    if (!dragZoom) return;
    const c = gRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (c.width / rect.width);
    const y = (e.clientY - rect.top) * (c.height / rect.height);
    setDragZoom(prev => ({ ...prev, currentX: x, currentY: y }));
  };

  const handleMouseUp = () => {
    if (!dragZoom) return;

    const c = gRef.current;
    if (!c) { setDragZoom(null); return; }

    const w = c.width, h = c.height;
    const x1 = Math.min(dragZoom.startX, dragZoom.currentX);
    const x2 = Math.max(dragZoom.startX, dragZoom.currentX);
    const y1 = Math.min(dragZoom.startY, dragZoom.currentY);
    const y2 = Math.max(dragZoom.startY, dragZoom.currentY);

    // Only zoom if selection is large enough
    if (x2 - x1 > 10 && y2 - y1 > 10) {
      const bounds = zoom || getDataBounds();
      if (bounds) {
        const { mnV, mxV, mnT, mxT } = bounds;
        const rV = mxV - mnV || 1;
        const rT = mxT - mnT || 1;
        const pW = w - pL - pR;
        const pH = h - pT - pB;

        // Convert pixel coords to data coords
        const newMnT = mnT + ((x1 - pL) / pW) * rT;
        const newMxT = mnT + ((x2 - pL) / pW) * rT;
        const newMxV = mxV - ((y1 - pT) / pH) * rV;
        const newMnV = mxV - ((y2 - pT) / pH) * rV;

        setZoom({ mnT: newMnT, mxT: newMxT, mnV: newMnV, mxV: newMxV });
      }
    }

    setDragZoom(null);
  };

  const btnStyle = {
    padding: "3px 6px",
    background: "transparent",
    border: "1px solid #2a3a4a",
    borderRadius: 3,
    color: "#88bbee",
    fontSize: 8,
    cursor: "pointer",
    fontFamily: "inherit"
  };

  // Calculate graph canvas size based on container width
  const graphW = size.w - 12; // padding
  const graphH = Math.max(80, Math.floor(graphW * 0.5));

  return (
    <div
      ref={containerRef}
      data-labquest="true"
      style={{
        position: pos.x !== null ? "fixed" : "absolute",
        top: pos.y ?? 10,
        left: pos.x,
        right: pos.x !== null ? undefined : 10,
        width: size.w,
        background: "#0a0a0a",
        border: "2px solid #333",
        borderRadius: 8,
        overflow: "hidden",
        fontFamily: "'Courier New',monospace",
        boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
        zIndex: dragging || resizing ? 100 : 20,
        userSelect: dragging || resizing ? "none" : "auto"
      }}
    >
      {/* Header - draggable */}
      <div
        onMouseDown={startDrag}
        style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "4px 8px",
        background: "#1a2a3a",
        borderBottom: "1px solid #2a3a4a",
        cursor: dragging ? "grabbing" : "grab"
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#88bbee", cursor: "inherit" }}>LabQuest</span>
        <div style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: recording ? "#ff4444" : "#44ff88"
        }} />
      </div>

      {/* Mode tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #1a1a1a" }}>
        {["live", "graph", "table"].map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              flex: 1,
              padding: "4px 0",
              background: "transparent",
              border: "none",
              color: mode === m ? "#88bbee" : "#555",
              fontSize: 10,
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 600,
              borderBottom: mode === m ? "2px solid #88bbee" : "2px solid transparent"
            }}
          >
            {m[0].toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      {mode === "live" ? (
        <div style={{ padding: "12px", textAlign: "center" }}>
          <div style={{
            fontSize: 9,
            color: "#556",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 2
          }}>
            Position
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#44ff88", lineHeight: 1 }}>
            {live != null ? live.toFixed(4) : "---"}
            <span style={{ fontSize: 12, color: "#44aa66" }}> m</span>
          </div>
          <div style={{ fontSize: 9, color: "#444", marginTop: 6 }}>
            Facing: {dir === "right" ? "→" : "←"}
          </div>
        </div>
      ) : mode === "graph" ? (
        <div style={{ padding: "6px" }}>
          <div style={{ display: "flex", gap: 2, marginBottom: 4, alignItems: "center" }}>
            {["position", "velocity", "acceleration"].map(g => (
              <button
                key={g}
                onClick={() => { setGt(g); setZoom(null); }}
                style={{
                  flex: 1,
                  padding: "2px 0",
                  background: "transparent",
                  border: `1px solid ${gt === g ? "#44aa66" : "#222"}`,
                  borderRadius: 3,
                  color: gt === g ? "#44ff88" : "#555",
                  fontSize: 8,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontWeight: 600
                }}
              >
                {g[0].toUpperCase() + g.slice(1, 3) + "."}
              </button>
            ))}
            {zoom && (
              <button
                onClick={() => setZoom(null)}
                style={{
                  ...btnStyle,
                  background: "#1a2a3a",
                  color: "#88bbee",
                  marginLeft: 2
                }}
                title="Reset Zoom"
              >
                ⟲
              </button>
            )}
          </div>
          <canvas
            ref={gRef}
            width={graphW}
            height={graphH}
            style={{
              width: "100%",
              height: graphH,
              borderRadius: 3,
              background: "#0a1a0a",
              cursor: "crosshair"
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => setDragZoom(null)}
          />
          {!data && (
            <div style={{ padding: 12, textAlign: "center", fontSize: 9, color: "#444" }}>
              No data. Press Start.
            </div>
          )}
          {data && (
            <div style={{ display: "flex", gap: 4, marginTop: 4, justifyContent: "flex-end" }}>
              <button onClick={saveGraphImage} style={btnStyle} title="Save graph as image">
                📷 Save
              </button>
              <button onClick={exportCSV} style={btnStyle} title="Export data to CSV">
                📁 CSV
              </button>
            </div>
          )}
          <div style={{ fontSize: 7, color: "#444", marginTop: 2, textAlign: "center" }}>
            Drag to zoom • Click Reset (⟲) to unzoom
          </div>
        </div>
      ) : (
        /* Table mode */
        <div style={{ padding: "6px" }}>
          {!data ? (
            <div style={{ padding: 12, textAlign: "center", fontSize: 9, color: "#444" }}>
              No data. Press Start.
            </div>
          ) : (
            <>
              <div style={{
                maxHeight: 160,
                overflowY: "auto",
                border: "1px solid #1a2a1a",
                borderRadius: 3,
                background: "#050a05"
              }}>
                <table style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 8,
                  fontFamily: "monospace"
                }}>
                  <thead>
                    <tr style={{ background: "#0a1a0a", position: "sticky", top: 0 }}>
                      <th style={{ padding: "3px 4px", color: "#88bbee", textAlign: "right", borderBottom: "1px solid #1a3a1a" }}>t(s)</th>
                      <th style={{ padding: "3px 4px", color: "#44ff88", textAlign: "right", borderBottom: "1px solid #1a3a1a" }}>x(m)</th>
                      <th style={{ padding: "3px 4px", color: "#ffaa44", textAlign: "right", borderBottom: "1px solid #1a3a1a" }}>v(m/s)</th>
                      <th style={{ padding: "3px 4px", color: "#ff4488", textAlign: "right", borderBottom: "1px solid #1a3a1a" }}>a(m/s²)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.times.map((t, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? "#050a05" : "#0a0f0a" }}>
                        <td style={{ padding: "2px 4px", color: "#667", textAlign: "right" }}>{t.toFixed(2)}</td>
                        <td style={{ padding: "2px 4px", color: "#44aa66", textAlign: "right" }}>
                          {data.positions[i]?.toFixed(3) ?? "—"}
                        </td>
                        <td style={{ padding: "2px 4px", color: "#aa7733", textAlign: "right" }}>
                          {data.velocities[i]?.toFixed(3) ?? "—"}
                        </td>
                        <td style={{ padding: "2px 4px", color: "#aa3366", textAlign: "right" }}>
                          {data.accelerations[i]?.toFixed(3) ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 4, justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 8, color: "#555" }}>{data.times.length} pts</span>
                <button onClick={exportCSV} style={btnStyle} title="Export data to CSV">
                  📁 Export CSV
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Controls */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 8px",
        borderTop: "1px solid #1a1a1a"
      }}>
        {!recording ? (
          <button
            onClick={onStart}
            style={{
              padding: "5px 14px",
              background: "#1a3a1a",
              border: "1px solid #2a5a2a",
              borderRadius: 4,
              color: "#44ff88",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit"
            }}
          >
            Start
          </button>
        ) : (
          <button
            onClick={onStop}
            style={{
              padding: "5px 14px",
              background: "#3a1a1a",
              border: "1px solid #5a2a2a",
              borderRadius: 4,
              color: "#ff4444",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit"
            }}
          >
            Stop
          </button>
        )}
        {recording && (
          <span style={{ fontSize: 10, color: "#ff4444", fontWeight: 700 }}>● REC</span>
        )}
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={startResize}
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: 16,
          height: 16,
          cursor: "nwse-resize",
          background: "linear-gradient(135deg, transparent 50%, #444 50%, #444 60%, transparent 60%, transparent 70%, #444 70%, #444 80%, transparent 80%)",
          borderRadius: "0 0 6px 0"
        }}
      />
    </div>
  );
});

export default LQDisplay;
