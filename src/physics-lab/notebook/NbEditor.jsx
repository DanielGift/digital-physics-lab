import { useState, useRef, useEffect, useCallback } from "react";
import EqBuilder from "./EqBuilder";

export default function NbEditor({ entries, dispatch, labCanvasRef, lqRef, compact }) {
  const editorRef = useRef(null);
  const [showEqBuilder, setShowEqBuilder] = useState(false);
  const [showTableCreator, setShowTableCreator] = useState(false);
  const [tRows, setTRows] = useState(3);
  const [tCols, setTCols] = useState(3);
  const [ssMode, setSsMode] = useState(false);
  const [selBox, setSelBox] = useState(null);
  const ssStart = useRef(null);
  const resizeRef = useRef(null);

  const exec = (cmd, val) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  };

  // Image resize handling
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    const onImgDown = (e) => {
      if (e.target.tagName === 'IMG') {
        e.preventDefault();
        resizeRef.current = { img: e.target, startX: e.clientX, startW: e.target.offsetWidth };
      }
    };

    const onImgMove = (e) => {
      if (!resizeRef.current) return;
      const dx = e.clientX - resizeRef.current.startX;
      const newW = Math.max(50, resizeRef.current.startW + dx);
      resizeRef.current.img.style.width = newW + 'px';
    };

    const onImgUp = () => {
      if (resizeRef.current) {
        resizeRef.current = null;
        syncContent();
      }
    };

    el.addEventListener('mousedown', onImgDown);
    window.addEventListener('mousemove', onImgMove);
    window.addEventListener('mouseup', onImgUp);

    return () => {
      el.removeEventListener('mousedown', onImgDown);
      window.removeEventListener('mousemove', onImgMove);
      window.removeEventListener('mouseup', onImgUp);
    };
  });

  const syncContent = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      if (entries.length === 0 || entries[0].type !== "richtext") {
        dispatch({ type: "NB_ADD", entry: { type: "richtext", content: html } });
      } else {
        dispatch({ type: "NB_UPD", id: entries[0].id, u: { content: html } });
      }
    }
  }, [entries, dispatch]);

  // Set initial content from state
  useEffect(() => {
    if (editorRef.current && entries.length > 0 && entries[0].type === "richtext") {
      if (editorRef.current.innerHTML !== entries[0].content && !editorRef.current.matches(':focus')) {
        editorRef.current.innerHTML = entries[0].content;
      }
    }
  }, [entries]);

  const insertEquation = (eq) => {
    let html = eq;
    const fracMatch = eq.match(/^\((.+)\)\/\((.+)\)$/);

    if (fracMatch) {
      html = `<span contenteditable="false" style="display:inline-flex;flex-direction:column;align-items:center;padding:2px 6px;margin:0 3px;background:rgba(126,184,255,0.08);border:1px solid rgba(126,184,255,0.2);border-radius:4px;font-family:'Cambria Math','Times New Roman',serif;font-size:14px;color:#7eb8ff;vertical-align:middle;line-height:1.1;user-select:all"><span style="border-bottom:1px solid #7eb8ff;padding:0 2px 1px">${fracMatch[1]}</span><span style="padding:1px 2px 0">${fracMatch[2]}</span></span>&nbsp;`;
    } else {
      html = `<span contenteditable="false" style="display:inline-block;padding:2px 8px;margin:0 2px;background:rgba(126,184,255,0.08);border:1px solid rgba(126,184,255,0.2);border-radius:4px;font-family:'Cambria Math','Times New Roman',serif;font-size:15px;color:#7eb8ff;user-select:all">${eq}</span>&nbsp;`;
    }

    exec("insertHTML", html);
    setShowEqBuilder(false);
  };

  const insertTable = () => {
    let html = '<table style="width:100%;border-collapse:collapse;margin:8px 0;font-size:12px"><thead><tr>';
    for (let c = 0; c < tCols; c++) {
      html += `<th style="padding:4px 6px;border:1px solid #2a2a3a;background:rgba(126,184,255,0.05);color:#aaa;font-weight:600;text-align:left">Col ${c + 1}</th>`;
    }
    html += '</tr></thead><tbody>';
    for (let r = 0; r < tRows; r++) {
      html += '<tr>';
      for (let c = 0; c < tCols; c++) {
        html += `<td style="padding:4px 6px;border:1px solid #1e1e2e;color:#d0d0d8">&nbsp;</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table><p><br></p>';
    exec("insertHTML", html);
    setShowTableCreator(false);
  };

  const doScreenshot = () => setSsMode(true);

  const fontSizes = [
    { l: "S", v: "2" },
    { l: "M", v: "3" },
    { l: "L", v: "4" },
    { l: "XL", v: "5" }
  ];

  const tb = {
    padding: "3px 7px",
    background: "transparent",
    border: "1px solid #2a2a3a",
    borderRadius: 3,
    color: "#999",
    fontSize: 11,
    cursor: "pointer",
    fontFamily: "inherit",
    minWidth: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Formatting Toolbar */}
      <div style={{
        display: "flex",
        gap: 2,
        padding: "5px 8px",
        borderBottom: "1px solid #2a2a3a",
        background: "rgba(255,255,255,0.02)",
        flexShrink: 0,
        flexWrap: "wrap",
        alignItems: "center"
      }}>
        <button onClick={() => exec("bold")} style={tb} title="Bold"><b>B</b></button>
        <button onClick={() => exec("italic")} style={tb} title="Italic"><i>I</i></button>
        <button onClick={() => exec("underline")} style={tb} title="Underline"><u>U</u></button>

        <div style={{ width: 1, height: 18, background: "#2a2a3a", margin: "0 3px" }} />

        {fontSizes.map(f => (
          <button
            key={f.v}
            onClick={() => exec("fontSize", f.v)}
            style={{ ...tb, fontSize: 9 }}
            title={`Size ${f.l}`}
          >
            {f.l}
          </button>
        ))}

        <div style={{ width: 1, height: 18, background: "#2a2a3a", margin: "0 3px" }} />

        <button onClick={() => exec("insertUnorderedList")} style={tb} title="Bullets">*</button>
        <button onClick={() => exec("insertOrderedList")} style={tb} title="Numbered">1.</button>
        <button onClick={() => exec("indent")} style={tb} title="Indent">-&gt;</button>
        <button onClick={() => exec("outdent")} style={tb} title="Outdent">&lt;-</button>

        <div style={{ width: 1, height: 18, background: "#2a2a3a", margin: "0 3px" }} />

        {["#ff6666", "#66bbff", "#66ff88", "#ffcc44", "#cc88ff", "#ffffff"].map(c => (
          <button
            key={c}
            onClick={() => exec("foreColor", c)}
            style={{ ...tb, padding: 1, minWidth: 18, width: 18, height: 18 }}
          >
            <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
          </button>
        ))}

        <div style={{ width: 1, height: 18, background: "#2a2a3a", margin: "0 3px" }} />

        <button
          onClick={() => setShowEqBuilder(!showEqBuilder)}
          style={{
            ...tb,
            color: showEqBuilder ? "#7eb8ff" : "#999",
            borderColor: showEqBuilder ? "#7eb8ff" : "#2a2a3a"
          }}
          title="Insert Equation"
        >
          Eq
        </button>
        <button
          onClick={() => setShowTableCreator(!showTableCreator)}
          style={{
            ...tb,
            color: showTableCreator ? "#7eb8ff" : "#999",
            borderColor: showTableCreator ? "#7eb8ff" : "#2a2a3a"
          }}
          title="Insert Table"
        >
          Table
        </button>
        <button onClick={doScreenshot} style={tb} title="Capture Screenshot">Cam</button>
      </div>

      {/* Equation Builder Panel */}
      {showEqBuilder && <EqBuilder onInsert={insertEquation} onClose={() => setShowEqBuilder(false)} />}

      {/* Table Creator Panel */}
      {showTableCreator && (
        <div style={{
          padding: 8,
          borderBottom: "1px solid #2a2a3a",
          background: "rgba(126,184,255,0.03)",
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexShrink: 0
        }}>
          {[["Rows", tRows, setTRows], ["Cols", tCols, setTCols]].map(([l, v, s]) => (
            <label key={l} style={{ fontSize: 11, color: "#999", display: "flex", alignItems: "center", gap: 4 }}>
              {l}:
              <input
                type="number"
                min="1"
                max="20"
                value={v}
                onChange={e => s(parseInt(e.target.value) || 1)}
                style={{
                  width: 42,
                  padding: "3px 5px",
                  background: "#111118",
                  border: "1px solid #2a2a3a",
                  borderRadius: 3,
                  color: "#e0e0e8",
                  fontSize: 11,
                  fontFamily: "inherit"
                }}
              />
            </label>
          ))}
          <button
            onClick={insertTable}
            style={{
              padding: "4px 12px",
              background: "#2a5fad",
              border: "none",
              borderRadius: 4,
              color: "#fff",
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit"
            }}
          >
            Insert
          </button>
          <button
            onClick={() => setShowTableCreator(false)}
            style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 11 }}
          >
            X
          </button>
        </div>
      )}

      {/* Rich Text Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={syncContent}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: compact ? "10px 12px" : "16px 20px",
          color: "#d0d0d8",
          fontSize: 14,
          fontFamily: "'Segoe UI','Helvetica Neue',system-ui,sans-serif",
          lineHeight: 1.7,
          outline: "none",
          minHeight: 0,
          background: "transparent",
          cursor: "text"
        }}
        data-placeholder="Start typing your lab notes..."
      />

      {/* Screenshot overlay */}
      {ssMode && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.3)",
            zIndex: 1000,
            cursor: "crosshair",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 16
          }}
          onMouseDown={e => {
            ssStart.current = { x: e.clientX, y: e.clientY };
            setSelBox(null);
          }}
          onMouseMove={e => {
            if (!ssStart.current) return;
            const x = e.clientX, y = e.clientY;
            setSelBox({
              x: Math.min(ssStart.current.x, x),
              y: Math.min(ssStart.current.y, y),
              w: Math.abs(x - ssStart.current.x),
              h: Math.abs(y - ssStart.current.y)
            });
          }}
          onMouseUp={() => {
            if (selBox && selBox.w > 10 && selBox.h > 10) {
              let captured = false;

              // Check if selection is over LabQuest display
              if (lqRef?.current) {
                const lqContainer = lqRef.current.getContainer?.();
                const lqCanvas = lqRef.current.getGraphCanvas?.();

                if (lqContainer && lqCanvas) {
                  const lqRect = lqContainer.getBoundingClientRect();
                  const selCx = selBox.x + selBox.w / 2;
                  const selCy = selBox.y + selBox.h / 2;

                  // Check if selection center is within LabQuest bounds
                  if (selCx >= lqRect.left && selCx <= lqRect.right &&
                      selCy >= lqRect.top && selCy <= lqRect.bottom) {
                    // Capture the entire LabQuest graph
                    const dataUrl = lqCanvas.toDataURL("image/png");

                    if (editorRef.current) {
                      editorRef.current.focus();
                      exec("insertHTML", `<img src="${dataUrl}" style="max-width:100%;width:280px;border-radius:4px;margin:4px 0;cursor:nwse-resize;border:1px solid rgba(126,184,255,0.2)" draggable="true"/>`);
                    }
                    captured = true;
                  }
                }
              }

              // Fall back to main lab canvas capture
              if (!captured) {
                const cv = labCanvasRef?.current;
                if (cv) {
                  const cr = cv.getBoundingClientRect();
                  const ox = Math.max(selBox.x, cr.left);
                  const oy = Math.max(selBox.y, cr.top);
                  const ox2 = Math.min(selBox.x + selBox.w, cr.right);
                  const oy2 = Math.min(selBox.y + selBox.h, cr.bottom);

                  if (ox2 > ox && oy2 > oy) {
                    const scaleX = cv.width / cr.width;
                    const scaleY = cv.height / cr.height;
                    const sx = (ox - cr.left) * scaleX;
                    const sy = (oy - cr.top) * scaleY;
                    const sw = (ox2 - ox) * scaleX;
                    const sh = (oy2 - oy) * scaleY;

                    const tc = document.createElement("canvas");
                    tc.width = sw;
                    tc.height = sh;
                    tc.getContext("2d").drawImage(cv, sx, sy, sw, sh, 0, 0, sw, sh);
                    const dataUrl = tc.toDataURL("image/png");

                    if (editorRef.current) {
                      editorRef.current.focus();
                      exec("insertHTML", `<img src="${dataUrl}" style="max-width:100%;width:300px;border-radius:4px;margin:4px 0;cursor:nwse-resize;border:1px solid rgba(126,184,255,0.2)" draggable="true"/>`);
                    }
                  }
                }
              }
            }
            setSsMode(false);
            ssStart.current = null;
            setSelBox(null);
          }}
        >
          <div style={{
            background: "rgba(0,0,0,0.85)",
            color: "#7eb8ff",
            padding: "6px 14px",
            borderRadius: 5,
            fontSize: 12,
            fontWeight: 600,
            pointerEvents: "none",
            textAlign: "center"
          }}>
            Click and drag to select a region to capture
            <div style={{ fontSize: 10, color: "#88bbee", marginTop: 2 }}>
              Select over LabQuest to capture the graph
            </div>
          </div>

          {selBox && (
            <div style={{
              position: "fixed",
              left: selBox.x,
              top: selBox.y,
              width: selBox.w,
              height: selBox.h,
              border: "2px dashed #7eb8ff",
              background: "rgba(126,184,255,0.08)",
              pointerEvents: "none",
              zIndex: 1001
            }} />
          )}

          <button
            onClick={() => {
              setSsMode(false);
              ssStart.current = null;
              setSelBox(null);
            }}
            style={{
              position: "fixed",
              bottom: 16,
              padding: "6px 16px",
              background: "#333",
              border: "none",
              borderRadius: 5,
              color: "#ccc",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "inherit",
              zIndex: 1002
            }}
          >
            Cancel (Esc)
          </button>
        </div>
      )}

      <style>{`
        [contenteditable]:empty:before { content: attr(data-placeholder); color: #3a3a4a; pointer-events: none; }
        [contenteditable] ul, [contenteditable] ol { padding-left: 20px; margin: 4px 0; }
        [contenteditable] li { margin: 2px 0; }
        [contenteditable] table { border-collapse: collapse; }
        [contenteditable] td, [contenteditable] th { border: 1px solid #2a2a3a; padding: 4px 6px; }
        [contenteditable] img { max-width: 100%; resize: both; overflow: hidden; display: inline-block; }
        [contenteditable] img:hover { outline: 2px solid rgba(126,184,255,0.4); }
      `}</style>
    </div>
  );
}
