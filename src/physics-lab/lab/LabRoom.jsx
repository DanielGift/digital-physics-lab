import { useState, useRef, useEffect, useCallback } from "react";
import { step, detReading, deriv, findTrack, surfY, TBL_Y } from "./physics";
import { drawItem, drawBackground, drawTable, drawTrack } from "./drawing";
import { getAttachPoints } from "../state/attachPoints";
import { EQUIPMENT, ICON_MAP } from "../equipment/equipmentData";
import LQDisplay from "../labquest/LQDisplay";

export default function LabRoom({ labItems, strings, selectedId, dispatch, canvasRef, nbOpen, lqRef }) {
  const ctnRef = useRef(null);
  const animRef = useRef(null);
  const lastT = useRef(null);

  const [drag, setDrag] = useState(null);
  const [footDr, setFootDr] = useState(null);
  const [push, setPush] = useState(null);
  const [rec, setRec] = useState(false);
  const [recData, setRecData] = useState(null);
  const [liveR, setLiveR] = useState(null);
  const [stringMode, setStringMode] = useState(null);
  const [attachMenu, setAttachMenu] = useState(null);
  const [trayDrag, setTrayDrag] = useState(null);
  const [ctxMenu, setCtxMenu] = useState(null);
  const [msRotate, setMsRotate] = useState(null); // Meter stick rotation drag
  // Zoom state: null = no zoom, or { minX, maxX, minY, maxY } in logical coords
  const [zoomRegion, setZoomRegion] = useState(null);
  const [zoomSelectMode, setZoomSelectMode] = useState(false);
  const [zoomDrag, setZoomDrag] = useState(null); // { startX, startY, currentX, currentY } in logical coords
  const [stringDraw, setStringDraw] = useState(null); // { id, points: [{x,y}], drawing: bool }

  const recStart = useRef(null);
  const recBuf = useRef([]);
  const recDetId = useRef(null);

  // Logical coordinate system for physics (fixed)
  const LOGICAL_W = 1000;
  const LOGICAL_H = 400;

  // Display size tracking
  const [displayW, setDisplayW] = useState(1000);
  const [displayH, setDisplayH] = useState(400);
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  // For compatibility with existing code
  const cw = LOGICAL_W;
  const ch = LOGICAL_H;

  // Resize observer - track actual container size
  useEffect(() => {
    const updateSize = () => {
      if (ctnRef.current) {
        const rect = ctnRef.current.getBoundingClientRect();
        // Account for tray height (56px) if items in tray
        const trayH = labItems.some(i => i.props.inTray) ? 56 : 0;
        const availH = rect.height - trayH;
        if (rect.width > 0 && availH > 0) {
          setDisplayW(Math.floor(rect.width));
          setDisplayH(Math.floor(availH));
        }
      }
    };

    const obs = new ResizeObserver(updateSize);
    if (ctnRef.current) obs.observe(ctnRef.current);
    updateSize();
    return () => obs.disconnect();
  }, [labItems]);

  const finishRec = useCallback(() => {
    const d = recBuf.current;
    if (d.length > 1) {
      const ts = d.map(x => x.time);
      const ps = d.map(x => x.pos || 0);
      const vs = deriv(ps, ts);
      const as = deriv(vs, ts);
      setRecData({ times: ts, positions: ps, velocities: vs, accelerations: as });
    }
    setRec(false);
  }, []);

  const startRec = useCallback((id) => {
    recBuf.current = [];
    recStart.current = performance.now();
    recDetId.current = id;
    setRec(true);
    setRecData(null);
  }, []);

  // Physics + render loop
  useEffect(() => {
    let run = true;
    lastT.current = performance.now();

    const loop = (now) => {
      if (!run) return;

      const dt = Math.min((now - lastT.current) / 1000, 0.05);
      lastT.current = now;

      const upd = step(labItems, dt, strings, cw);

      // Check each item for any changes (position, velocity, or track props)
      upd.forEach(it => {
        const o = labItems.find(l => l.id === it.id);
        if (!o) return;

        const posChanged = it.x !== o.x || it.y !== o.y;
        const velChanged = it.props.velocity !== o.props.velocity || it.props.velocityY !== o.props.velocityY;
        const trackChanged = it.type === "track" && (
          it.props.initialTilt !== o.props.initialTilt ||
          it.props.angularVelocity !== o.props.angularVelocity
        );

        if (posChanged || velChanged || trackChanged) {
          dispatch({ type: "UPD", id: it.id, u: { x: it.x, y: it.y, props: it.props } });
        }
      });

      // Motion detector reading
      const det = labItems.find(i => i.type === "motionDetector");
      if (det) {
        const r = detReading(det, labItems);
        setLiveR(r);

        if (rec && recDetId.current === det.id) {
          const el = (now - recStart.current) / 1000;
          recBuf.current.push({ time: el, pos: r });
          if (el >= (det.props.recordDuration || 5)) finishRec();
        }
      }

      // Draw
      const cv = canvasRef.current;
      if (cv) {
        const ctx = cv.getContext("2d");

        // Set canvas internal resolution to match display size × devicePixelRatio
        const canvasW = Math.floor(displayW * dpr);
        const canvasH = Math.floor(displayH * dpr);

        if (cv.width !== canvasW || cv.height !== canvasH) {
          cv.width = canvasW;
          cv.height = canvasH;
        }

        // Clear and set up scaling
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
        ctx.clearRect(0, 0, canvasW, canvasH);

        // Determine the logical region to render
        let viewMinX = 0, viewMaxX = LOGICAL_W, viewMinY = 0, viewMaxY = LOGICAL_H;
        if (zoomRegion) {
          viewMinX = zoomRegion.minX;
          viewMaxX = zoomRegion.maxX;
          viewMinY = zoomRegion.minY;
          viewMaxY = zoomRegion.maxY;
        }
        const viewW = Math.max(1, viewMaxX - viewMinX);
        const viewH = Math.max(1, viewMaxY - viewMinY);

        // Scale to fit the view region into the display
        if (displayW <= 0 || displayH <= 0) return; // Skip rendering if no size yet
        const scaleX = displayW / viewW;
        const scaleY = displayH / viewH;
        const scale = Math.min(scaleX, scaleY);

        // Center the content if aspect ratios don't match
        const offsetX = (displayW - viewW * scale) / 2;
        const offsetY = (displayH - viewH * scale) / 2;

        // Apply DPR scaling, then translate to center, then scale and translate for zoom region
        ctx.scale(dpr, dpr);
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);
        ctx.translate(-viewMinX, -viewMinY);

        // Use logical dimensions for drawing
        const w = LOGICAL_W, h = LOGICAL_H;

        drawBackground(ctx, w, h);
        drawTable(ctx, w);

        // Draw placed items
        const placed = labItems.filter(i => !i.props.inTray);
        for (const item of placed) {
          if (item.type === "track") {
            drawTrack(ctx, item, footDr);
          } else {
            drawItem(ctx, item, placed);
          }
        }

        // Draw connected strings
        const stringItems = placed.filter(i => i.type === "string");
        const pulleys = placed.filter(i => i.type === "pulley");

        for (const si of stringItems) {
          const endA = strings.find(st => st.stringOwnerId === si.id && st.end === "A");
          const endB = strings.find(st => st.stringOwnerId === si.id && st.end === "B");
          if (!endA || !endB) continue;

          const aiItem = labItems.find(i => i.id === endA.targetId);
          const biItem = labItems.find(i => i.id === endB.targetId);
          if (!aiItem || !biItem || aiItem.props.inTray || biItem.props.inTray) continue;

          const aPts = getAttachPoints(aiItem);
          const bPts = getAttachPoints(biItem);
          const aPt = aPts.find(p => p.key === endA.targetPoint);
          const bPt = bPts.find(p => p.key === endB.targetPoint);
          if (!aPt || !bPt) continue;

          const a = aPt.getXY();
          const b = bPt.getXY();

          // Check for explicit pulley attachment
          let pulley = null;
          if (endA.targetPoint === "over") pulley = aiItem;
          else if (endB.targetPoint === "over") pulley = biItem;

          // Auto-detect pulley in path if not explicitly attached
          if (!pulley) {
            for (const p of pulleys) {
              if (p.id === aiItem.id || p.id === biItem.id) continue;
              const pcx = p.x + (p.props.width || 28) / 2;
              const pcy = p.y + (p.props.height || 28) / 2;
              const pr = (p.props.width || 28) / 2;

              // Check if the pulley is horizontally between the two endpoints
              const minX = Math.min(a.x, b.x);
              const maxX = Math.max(a.x, b.x);
              if (pcx >= minX - pr && pcx <= maxX + pr) {
                // Check if string would pass through/near the pulley
                // The pulley should be above the straight line between endpoints
                const lineY = a.y + (b.y - a.y) * ((pcx - a.x) / (b.x - a.x || 1));
                if (pcy <= lineY + 20 && pcy >= Math.min(a.y, b.y) - 50) {
                  pulley = p;
                  break;
                }
              }
            }
          }

          ctx.strokeStyle = "#bb9944";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([]);
          ctx.lineCap = "round";

          if (pulley) {
            const pcx = pulley.x + (pulley.props.width || 28) / 2;
            const pcy = pulley.y + (pulley.props.height || 28) / 2;
            const pr = (pulley.props.width || 28) / 2 - 2;

            // Determine which point is on each side of the pulley
            const leftPt = a.x < b.x ? a : b;
            const rightPt = a.x < b.x ? b : a;

            // Draw string from left point to left side of pulley
            ctx.beginPath();
            ctx.moveTo(leftPt.x, leftPt.y);
            ctx.lineTo(pcx - pr, pcy);
            ctx.stroke();

            // Draw arc over the pulley (top half)
            ctx.beginPath();
            ctx.arc(pcx, pcy, pr, Math.PI, 0, false);
            ctx.stroke();

            // Draw string from right side of pulley to right point
            ctx.beginPath();
            ctx.moveTo(pcx + pr, pcy);
            ctx.lineTo(rightPt.x, rightPt.y);
            ctx.stroke();
          } else {
            // Simple catenary curve if no pulley
            const mx = (a.x + b.x) / 2;
            const my = Math.max(a.y, b.y) + 15;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.quadraticCurveTo(mx, my, b.x, b.y);
            ctx.stroke();
          }

          ctx.lineCap = "butt";
          ctx.fillStyle = "#997733";
          ctx.beginPath();
          ctx.arc(a.x, a.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw attachment point markers in string-picking mode
        if (stringMode?.pickingEnd) {
          for (const it of placed) {
            if (it.type === "string") continue;
            const pts = getAttachPoints(it);
            for (const pt of pts) {
              const { x: px, y: py } = pt.getXY();
              ctx.fillStyle = "rgba(126,184,255,0.25)";
              ctx.beginPath();
              ctx.arc(px, py, 7, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = "#7eb8ff";
              ctx.lineWidth = 1.5;
              ctx.setLineDash([3, 3]);
              ctx.beginPath();
              ctx.arc(px, py, 7, 0, Math.PI * 2);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          }
        }

        // Highlight selected item
        if (selectedId) {
          const sel = placed.find(i => i.id === selectedId);
          if (sel) {
            ctx.strokeStyle = "rgba(126,184,255,0.5)";
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.roundRect(sel.x - 3, sel.y - 3, (sel.props.width || 40) + 6, (sel.props.height || 30) + 6, 6);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }

        // Push arrow
        if (push) {
          const pdx = push.cx - push.sx;
          const pdy = push.cy - push.sy;
          const plen = Math.sqrt(pdx * pdx + pdy * pdy);

          if (plen > 5) {
            ctx.shadowColor = "#ff8844";
            ctx.shadowBlur = 6;
            ctx.strokeStyle = "#ff8844";
            ctx.lineWidth = 2.5;
            ctx.setLineDash([8, 5]);
            ctx.beginPath();
            ctx.moveTo(push.sx, push.sy);
            ctx.lineTo(push.cx, push.cy);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.shadowBlur = 0;

            const nx = pdx / plen;
            const ny = pdy / plen;
            ctx.fillStyle = "#ff8844";
            ctx.beginPath();
            ctx.moveTo(push.cx, push.cy);
            ctx.lineTo(push.cx - nx * 12 - ny * 6, push.cy - ny * 12 + nx * 6);
            ctx.lineTo(push.cx - nx * 12 + ny * 6, push.cy - ny * 12 - nx * 6);
            ctx.fill();

            const force = Math.round(plen * 0.3);
            ctx.fillStyle = "rgba(255,136,68,0.8)";
            ctx.font = "bold 10px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(`${force} N`, (push.sx + push.cx) / 2, (push.sy + push.cy) / 2 - 10);
            ctx.textAlign = "start";
          }
        }

        // String drawing preview
        if (stringDraw?.drawing && stringDraw.points.length > 0) {
          ctx.strokeStyle = "#bb9944";
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(stringDraw.points[0].x, stringDraw.points[0].y);
          for (let i = 1; i < stringDraw.points.length; i++) {
            ctx.lineTo(stringDraw.points[i].x, stringDraw.points[i].y);
          }
          ctx.stroke();
          ctx.setLineDash([]);

          // Calculate and show current length
          let totalLen = 0;
          for (let i = 1; i < stringDraw.points.length; i++) {
            const dx = stringDraw.points[i].x - stringDraw.points[i - 1].x;
            const dy = stringDraw.points[i].y - stringDraw.points[i - 1].y;
            totalLen += Math.sqrt(dx * dx + dy * dy);
          }
          const lenCm = Math.round(totalLen / 4); // 400px per meter, so /4 for cm
          ctx.fillStyle = "rgba(170,120,50,0.9)";
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "center";
          const lastPt = stringDraw.points[stringDraw.points.length - 1];
          ctx.fillText(`${lenCm} cm`, lastPt.x, lastPt.y - 12);
          ctx.textAlign = "start";

          // Draw endpoints
          ctx.fillStyle = "#997733";
          ctx.beginPath();
          ctx.arc(stringDraw.points[0].x, stringDraw.points[0].y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      run = false;
      cancelAnimationFrame(animRef.current);
    };
  });

  const placed = labItems.filter(i => !i.props.inTray);

  function canvasXY(e) {
    const r = canvasRef.current.getBoundingClientRect();

    // Determine the logical region being viewed
    let viewMinX = 0, viewMaxX = LOGICAL_W, viewMinY = 0, viewMaxY = LOGICAL_H;
    if (zoomRegion) {
      viewMinX = zoomRegion.minX;
      viewMaxX = zoomRegion.maxX;
      viewMinY = zoomRegion.minY;
      viewMaxY = zoomRegion.maxY;
    }
    const viewW = viewMaxX - viewMinX;
    const viewH = viewMaxY - viewMinY;

    // Calculate the same scale and offset used in rendering
    const scaleX = displayW / viewW;
    const scaleY = displayH / viewH;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (displayW - viewW * scale) / 2;
    const offsetY = (displayH - viewH * scale) / 2;

    // Get position relative to canvas element
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;

    // Remove offset, reverse scale, and add view offset to get logical coordinates
    return {
      x: viewMinX + (px - offsetX) / scale,
      y: viewMinY + (py - offsetY) / scale
    };
  }

  function itemAt(x, y) {
    for (let i = placed.length - 1; i >= 0; i--) {
      const it = placed[i];
      const iw = it.props.width || 40;
      const ih = it.type === "track" ? 40 : (it.props.height || 30);
      const iy = it.type === "track" ? it.y - 15 : it.y;
      if (x >= it.x && x <= it.x + iw && y >= iy && y <= iy + ih) return it;
    }
    return null;
  }

  // Check if two items overlap (returns overlap amount if they do)
  function itemsOverlap(item1, item2) {
    if (!item1 || !item2 || item1.id === item2.id) return null;
    // Don't check collision with tracks, strings, or items in tray
    if (item1.type === "track" || item2.type === "track") return null;
    if (item1.type === "string" || item2.type === "string") return null;
    if (item1.props.inTray || item2.props.inTray) return null;

    const x1 = item1.x, y1 = item1.y;
    const w1 = item1.props.width || 40, h1 = item1.props.height || 30;
    const x2 = item2.x, y2 = item2.y;
    const w2 = item2.props.width || 40, h2 = item2.props.height || 30;

    // Check bounding box overlap
    const overlapX = Math.max(0, Math.min(x1 + w1, x2 + w2) - Math.max(x1, x2));
    const overlapY = Math.max(0, Math.min(y1 + h1, y2 + h2) - Math.max(y1, y2));

    if (overlapX > 0 && overlapY > 0) {
      return { x: overlapX, y: overlapY };
    }
    return null;
  }

  // Find position to resolve collision (push item away from other)
  function resolveCollision(item, other) {
    const overlap = itemsOverlap(item, other);
    if (!overlap) return null;

    const itemCx = item.x + (item.props.width || 40) / 2;
    const otherCx = other.x + (other.props.width || 40) / 2;

    // Push horizontally (smaller overlap dimension usually)
    if (overlap.x < overlap.y) {
      // Push left or right
      const pushDir = itemCx < otherCx ? -1 : 1;
      return { x: item.x + pushDir * (overlap.x + 2), y: item.y };
    } else {
      // Push up or down
      const itemCy = item.y + (item.props.height || 30) / 2;
      const otherCy = other.y + (other.props.height || 30) / 2;
      const pushDir = itemCy < otherCy ? -1 : 1;
      return { x: item.x, y: item.y + pushDir * (overlap.y + 2) };
    }
  }

  function footAt(x, y) {
    const BASE_FOOT_LENGTH = 40;
    for (const it of labItems) {
      if (it.type !== "track" || it.props.inTray) continue;
      const tw = it.props.width || 480;
      for (const side of ["left", "right"]) {
        const lx = side === "left" ? 20 : tw - 20;
        const fx = it.x + lx;
        const footAdj = side === "left"
          ? (it.props.leftFootHeight || 0)
          : (it.props.rightFootHeight || 0);
        const footLen = Math.max(10, BASE_FOOT_LENGTH + footAdj);
        const attachY = surfY(it, lx) + 2;
        const knobY = attachY + footLen;
        // Check if click is near the knob
        if (Math.abs(x - fx) < 12 && Math.abs(y - knobY) < 12) {
          return { tid: it.id, side };
        }
      }
    }
    return null;
  }

  function meterStickHandleAt(x, y) {
    // Check meter sticks
    for (const it of labItems) {
      if (it.type !== "meterStick" || it.props.inTray) continue;
      const msw = it.props.width || 400;
      const msh = it.props.height || 10;
      const cx = it.x + msw / 2;
      const cy = it.y + msh / 2;
      const rotation = it.props.rotation || 0;

      // Calculate handle positions (ends of the rotated stick)
      const leftX = cx + Math.cos(rotation) * (-msw / 2);
      const leftY = cy + Math.sin(rotation) * (-msw / 2);
      const rightX = cx + Math.cos(rotation) * (msw / 2);
      const rightY = cy + Math.sin(rotation) * (msw / 2);

      // Check if clicking near either handle (within 12px)
      if (Math.sqrt((x - leftX) ** 2 + (y - leftY) ** 2) < 12) {
        return { msId: it.id, cx, cy, handle: "left" };
      }
      if (Math.sqrt((x - rightX) ** 2 + (y - rightY) ** 2) < 12) {
        return { msId: it.id, cx, cy, handle: "right" };
      }
    }

    // Check protractors
    for (const it of labItems) {
      if (it.type !== "protractor" || it.props.inTray) continue;
      const pw = it.props.width || 100;
      const ph = it.props.height || 55;
      const cx = it.x + pw / 2;
      const cy = it.y + ph; // Center is at bottom of protractor
      const rotation = it.props.rotation || 0;
      const radius = pw / 2;

      // Calculate handle positions (ends of the baseline)
      const leftX = cx + Math.cos(rotation + Math.PI) * radius;
      const leftY = cy + Math.sin(rotation + Math.PI) * radius;
      const rightX = cx + Math.cos(rotation) * radius;
      const rightY = cy + Math.sin(rotation) * radius;

      // Check if clicking near either handle (within 12px)
      if (Math.sqrt((x - leftX) ** 2 + (y - leftY) ** 2) < 12) {
        return { msId: it.id, cx, cy, handle: "left" };
      }
      if (Math.sqrt((x - rightX) ** 2 + (y - rightY) ** 2) < 12) {
        return { msId: it.id, cx, cy, handle: "right" };
      }
    }

    return null;
  }

  const onDown = (e) => {
    const { x, y } = canvasXY(e);
    setAttachMenu(null);

    // String-picking mode
    if (stringMode?.pickingEnd) {
      const it = itemAt(x, y);
      if (it && it.type !== "string") {
        const pts = getAttachPoints(it);
        if (pts.length > 0) {
          setAttachMenu({ itemId: it.id, screenX: e.clientX, screenY: e.clientY, points: pts });
        }
      }
      return;
    }

    const f = footAt(x, y);
    if (f) {
      setFootDr({ ...f, sy: y });
      return;
    }

    // Check for meter stick rotation handle
    const msHandle = meterStickHandleAt(x, y);
    if (msHandle) {
      setMsRotate(msHandle);
      return;
    }

    const it = itemAt(x, y);
    if (!it) {
      dispatch({ type: "DESELECT" });
      return;
    }

    dispatch({ type: "SELECT", id: it.id });

    if (it.type === "cart" && e.shiftKey) {
      setPush({ cid: it.id, sx: x, sy: y, cx: x, cy: y });
      return;
    }

    setDrag({ iid: it.id, ox: x - it.x, oy: y - it.y, sx: x, sy: y });
    // Set isDragging for all items including tracks
    dispatch({
      type: "UPD",
      id: it.id,
      u: { props: { ...it.props, isDragging: true, velocity: 0, velocityY: 0, onSurface: it.type === "track" ? it.props.onSurface : null } }
    });
  };

  const onMove = (e) => {
    const { x, y } = canvasXY(e);

    if (footDr) {
      const t = labItems.find(i => i.id === footDr.tid);
      if (!t) return;
      // Dragging down (y increases) should extend foot (increase footHeight)
      const dy = y - footDr.sy;
      const prop = footDr.side === "left" ? "leftFootHeight" : "rightFootHeight";
      dispatch({
        type: "UPD",
        id: t.id,
        u: { props: { ...t.props, [prop]: Math.max(-30, Math.min(60, (t.props[prop] || 0) + dy * 0.5)) } }
      });
      setFootDr({ ...footDr, sy: y });
      return;
    }

    if (push) {
      setPush({ ...push, cx: x, cy: y });
      return;
    }

    // Meter stick rotation
    if (msRotate) {
      const ms = labItems.find(i => i.id === msRotate.msId);
      if (ms) {
        // Calculate angle from center to mouse position
        const angle = Math.atan2(y - msRotate.cy, x - msRotate.cx);
        // Adjust angle based on which handle is being dragged
        const newRotation = msRotate.handle === "right" ? angle : angle + Math.PI;
        dispatch({
          type: "UPD",
          id: ms.id,
          u: { props: { ...ms.props, rotation: newRotation } }
        });
      }
      return;
    }

    if (!drag) return;

    const newX = x - drag.ox;
    const newY = y - drag.oy;
    const draggedItem = labItems.find(i => i.id === drag.iid);

    // If dragging a track, also move items that are on it
    if (draggedItem && draggedItem.type === "track") {
      const dx = newX - draggedItem.x;
      const dy = newY - draggedItem.y;

      // Move items that are on this track
      for (const item of labItems) {
        if (item.id === drag.iid) continue;
        if (item.props.inTray) continue;

        // Check if item is on this track (onSurface === "track" or onTrack, and within track bounds)
        const isOnTrack = item.props.onSurface === "track" || item.props.onTrack ||
                         (item.props.clampedToTrack === draggedItem.id);
        const itemCx = item.x + (item.props.width || 40) / 2;
        const withinBounds = itemCx >= draggedItem.x && itemCx <= draggedItem.x + (draggedItem.props.width || 480);

        if (isOnTrack && withinBounds) {
          dispatch({ type: "UPD", id: item.id, u: { x: item.x + dx, y: item.y + dy } });
        }
      }
    }

    dispatch({ type: "UPD", id: drag.iid, u: { x: newX, y: newY } });
  };

  const onUp = (e) => {
    if (footDr) {
      setFootDr(null);
      return;
    }

    if (msRotate) {
      setMsRotate(null);
      return;
    }

    if (push) {
      const c = labItems.find(i => i.id === push.cid);
      if (c) {
        dispatch({
          type: "UPD",
          id: c.id,
          u: { props: { ...c.props, velocity: (push.cx - push.sx) * 3 } }
        });
      }
      setPush(null);
      return;
    }

    if (!drag) return;

    const it = labItems.find(i => i.id === drag.iid);

    // Snap pulley to track end
    if (it?.type === "pulley") {
      const tracks = labItems.filter(i => i.type === "track" && !i.props.inTray);
      let clamped = false;

      for (const tr of tracks) {
        const tw = tr.props.width || 480;
        const pcx = it.x + (it.props.width || 28) / 2;

        if (Math.abs(pcx - tr.x) < 25 && Math.abs(it.y - tr.y) < 30) {
          dispatch({
            type: "UPD",
            id: it.id,
            u: {
              x: tr.x - (it.props.width || 28) / 2,
              y: tr.y - 6,
              props: { ...it.props, isDragging: false, velocity: 0, velocityY: 0, onSurface: "track", clampedToTrack: tr.id }
            }
          });
          clamped = true;
          break;
        }

        if (Math.abs(pcx - (tr.x + tw)) < 25 && Math.abs(it.y - tr.y) < 30) {
          dispatch({
            type: "UPD",
            id: it.id,
            u: {
              x: tr.x + tw - (it.props.width || 28) / 2,
              y: tr.y - 6,
              props: { ...it.props, isDragging: false, velocity: 0, velocityY: 0, onSurface: "track", clampedToTrack: tr.id }
            }
          });
          clamped = true;
          break;
        }
      }

      if (!clamped) {
        dispatch({ type: "UPD", id: it.id, u: { props: { ...it.props, isDragging: false, clampedToTrack: null } } });
      }
    }
    // Snap bubble level, motion detector, mass hanger onto track surface
    else if (it?.type === "bubbleLevel" || it?.type === "motionDetector" || it?.type === "massHanger") {
      const tr = findTrack({ ...it, type: "cart", props: { ...it.props, height: it.props.height || 14 } }, labItems);
      if (tr) {
        const lx = (it.x + (it.props.width || 40) / 2) - tr.x;
        const sy = surfY(tr, lx);
        dispatch({
          type: "UPD",
          id: it.id,
          u: { y: sy - (it.props.height || 14), props: { ...it.props, isDragging: false, velocity: 0, velocityY: 0, onSurface: "track" } }
        });
      } else {
        dispatch({ type: "UPD", id: it.id, u: { props: { ...it.props, isDragging: false } } });
      }
    } else if (it?.type === "track") {
      // Clear isDragging for track
      dispatch({ type: "UPD", id: it.id, u: { props: { ...it.props, isDragging: false, velocity: 0, velocityY: 0 } } });
    } else {
      dispatch({ type: "UPD", id: it.id, u: { props: { ...it.props, isDragging: false } } });
    }

    // Check for collisions with other items and resolve them
    if (it && it.type !== "track" && it.type !== "string") {
      const currentIt = labItems.find(i => i.id === it.id);
      if (currentIt) {
        for (const other of labItems) {
          if (other.id === it.id || other.props.inTray) continue;
          const newPos = resolveCollision(currentIt, other);
          if (newPos) {
            dispatch({ type: "UPD", id: it.id, u: { x: newPos.x, y: newPos.y } });
            break; // Only resolve one collision at a time
          }
        }
      }
    }

    setDrag(null);
  };

  // Tray items
  const trayItems = labItems.filter(i => i.props.inTray);

  const onTrayMouseDown = (e, it) => {
    e.preventDefault();
    setTrayDrag({ id: it.id, type: it.type, mouseX: e.clientX, mouseY: e.clientY, props: it.props });
  };

  useEffect(() => {
    if (!trayDrag) return;

    const onMM = (e) => setTrayDrag(p => p ? { ...p, mouseX: e.clientX, mouseY: e.clientY } : null);

    const onMU = (e) => {
      if (!trayDrag) return;
      const cv = canvasRef.current;
      if (cv) {
        const r = cv.getBoundingClientRect();

        // Calculate scale and offset (same as canvasXY and rendering)
        let viewMinX = 0, viewMaxX = LOGICAL_W, viewMinY = 0, viewMaxY = LOGICAL_H;
        if (zoomRegion) {
          viewMinX = zoomRegion.minX;
          viewMaxX = zoomRegion.maxX;
          viewMinY = zoomRegion.minY;
          viewMaxY = zoomRegion.maxY;
        }
        const viewW = viewMaxX - viewMinX;
        const viewH = viewMaxY - viewMinY;
        const scaleX = displayW / viewW;
        const scaleY = displayH / viewH;
        const scale = Math.min(scaleX, scaleY);
        const offsetX = (displayW - viewW * scale) / 2;
        const offsetY = (displayH - viewH * scale) / 2;

        // Convert to logical coordinates
        const px = e.clientX - r.left;
        const py = e.clientY - r.top;
        const cx = viewMinX + (px - offsetX) / scale;
        const cy = viewMinY + (py - offsetY) / scale;

        if (cx >= 0 && cy >= 0 && cx <= LOGICAL_W && cy <= LOGICAL_H) {
          // For strings, enter drawing mode instead of placing directly
          if (trayDrag.type === "string") {
            setStringDraw({ id: trayDrag.id, points: [{ x: cx, y: cy }], drawing: true });
          } else {
            dispatch({
              type: "PLACE",
              id: trayDrag.id,
              x: cx - (trayDrag.props.width || 40) / 2,
              y: cy - (trayDrag.props.height || 20) / 2
            });
          }
        }
      }
      setTrayDrag(null);
    };

    window.addEventListener('mousemove', onMM);
    window.addEventListener('mouseup', onMU);
    return () => {
      window.removeEventListener('mousemove', onMM);
      window.removeEventListener('mouseup', onMU);
    };
  }, [trayDrag?.id]);

  const ctxBtnS = {
    display: "block",
    width: "100%",
    padding: "5px 12px",
    background: "transparent",
    border: "none",
    color: "#ddd",
    fontSize: 11,
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "inherit",
    borderRadius: 4
  };

  const onCtx = (e) => {
    e.preventDefault();
    const { x, y } = canvasXY(e);
    const it = itemAt(x, y);
    if (it) {
      setCtxMenu({
        id: it.id,
        x: e.clientX,
        y: e.clientY,
        name: EQUIPMENT.find(eq => eq.type === it.type)?.name || it.type
      });
    }
  };

  const det = labItems.find(i => i.type === "motionDetector" && !i.props.inTray);

  return (
    <div
      ref={ctnRef}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        background: "#d8dce2",
        flex: 1,
        minHeight: 0,
        overflow: "hidden"
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: displayW,
          height: displayH,
          cursor: zoomSelectMode ? "crosshair" : (stringDraw?.drawing ? "crosshair" : "default"),
          display: "block",
          flexShrink: 0
        }}
        onMouseDown={(e) => {
          const { x, y } = canvasXY(e);
          if (stringDraw?.drawing) {
            // Finish string drawing on click
            const finalPoints = [...stringDraw.points, { x, y }];

            // Calculate total path length
            let totalLength = 0;
            for (let i = 1; i < finalPoints.length; i++) {
              const dx = finalPoints[i].x - finalPoints[i - 1].x;
              const dy = finalPoints[i].y - finalPoints[i - 1].y;
              totalLength += Math.sqrt(dx * dx + dy * dy);
            }

            // Ensure minimum string length of 50 pixels (~12.5cm)
            totalLength = Math.max(50, totalLength);

            // Place the string with the fixed length
            const midIdx = Math.floor(finalPoints.length / 2);
            const midPoint = finalPoints[midIdx];
            dispatch({
              type: "PLACE",
              id: stringDraw.id,
              x: midPoint.x - 30,
              y: midPoint.y - 3,
              fixedLength: totalLength
            });
            setStringDraw(null);
            return;
          }
          if (zoomSelectMode) {
            // Start rectangular zoom selection
            setZoomDrag({ startX: x, startY: y, currentX: x, currentY: y });
            return;
          } else {
            onDown(e);
          }
        }}
        onMouseMove={(e) => {
          if (stringDraw?.drawing) {
            // Add point to string path as mouse moves
            const { x, y } = canvasXY(e);
            // Only add point if it's far enough from the last one
            const lastPt = stringDraw.points[stringDraw.points.length - 1];
            const dist = Math.sqrt((x - lastPt.x) ** 2 + (y - lastPt.y) ** 2);
            if (dist > 5) {
              setStringDraw(prev => ({
                ...prev,
                points: [...prev.points, { x, y }]
              }));
            }
            return;
          }
          if (zoomSelectMode && zoomDrag) {
            // Update zoom selection rectangle
            const { x, y } = canvasXY(e);
            setZoomDrag(prev => prev ? { ...prev, currentX: x, currentY: y } : null);
            return;
          } else if (zoomSelectMode) {
            // Just tracking mouse position before drag starts
            return;
          } else {
            onMove(e);
          }
        }}
        onMouseUp={(e) => {
          if (zoomSelectMode && zoomDrag) {
            // Complete zoom selection
            const minX = Math.min(zoomDrag.startX, zoomDrag.currentX);
            const maxX = Math.max(zoomDrag.startX, zoomDrag.currentX);
            const minY = Math.min(zoomDrag.startY, zoomDrag.currentY);
            const maxY = Math.max(zoomDrag.startY, zoomDrag.currentY);

            // Only zoom if selection is large enough (at least 20 logical units)
            if (maxX - minX > 20 && maxY - minY > 20) {
              setZoomRegion({ minX, maxX, minY, maxY });
            }
            setZoomDrag(null);
            setZoomSelectMode(false);
            return;
          }
          onUp(e);
        }}
        onMouseLeave={() => { onUp(); if (zoomSelectMode) setZoomDrag(null); }}
        onContextMenu={(e) => {
          if (stringDraw?.drawing) {
            // Cancel string drawing on right-click
            e.preventDefault();
            setStringDraw(null);
            return;
          }
          onCtx(e);
        }}
      />

      {/* Zoom selection rectangle */}
      {zoomSelectMode && zoomDrag && displayW > 0 && displayH > 0 && (() => {
        // Convert logical coords to screen coords for display
        let viewMinX = 0, viewMaxX = LOGICAL_W, viewMinY = 0, viewMaxY = LOGICAL_H;
        if (zoomRegion) {
          viewMinX = zoomRegion.minX;
          viewMaxX = zoomRegion.maxX;
          viewMinY = zoomRegion.minY;
          viewMaxY = zoomRegion.maxY;
        }
        const viewW = Math.max(1, viewMaxX - viewMinX);
        const viewH = Math.max(1, viewMaxY - viewMinY);
        const scaleX = displayW / viewW;
        const scaleY = displayH / viewH;
        const scale = Math.min(scaleX, scaleY);
        const offsetX = (displayW - viewW * scale) / 2;
        const offsetY = (displayH - viewH * scale) / 2;

        const screenX1 = offsetX + (zoomDrag.startX - viewMinX) * scale;
        const screenY1 = offsetY + (zoomDrag.startY - viewMinY) * scale;
        const screenX2 = offsetX + (zoomDrag.currentX - viewMinX) * scale;
        const screenY2 = offsetY + (zoomDrag.currentY - viewMinY) * scale;

        const left = Math.min(screenX1, screenX2);
        const top = Math.min(screenY1, screenY2);
        const width = Math.abs(screenX2 - screenX1);
        const height = Math.abs(screenY2 - screenY1);

        return (
          <div style={{
            position: "absolute",
            left,
            top,
            width,
            height,
            border: "2px dashed #7eb8ff",
            background: "rgba(126,184,255,0.15)",
            pointerEvents: "none",
            zIndex: 100
          }} />
        );
      })()}

      {/* Help text - positioned above tray */}
      <div style={{
        position: "absolute",
        bottom: trayItems.length > 0 ? 66 : 10,
        left: "50%",
        transform: "translateX(-50%)",
        fontSize: 10,
        color: "#666",
        fontFamily: "sans-serif",
        pointerEvents: "none",
        background: "rgba(255,255,255,0.8)",
        padding: "3px 10px",
        borderRadius: 4,
        zIndex: 5
      }}>
        {stringDraw?.drawing
          ? "Draw the string path - Click to finish, Right-click to cancel"
          : zoomSelectMode
            ? "Drag a rectangle to zoom into that region"
            : "Shift+click cart to push - Drag knobs to level track - Drag meter stick ends to rotate - Right-click to return"}
      </div>

      {/* Zoom controls */}
      <div style={{
        position: "absolute",
        top: 10,
        left: 10,
        display: "flex",
        gap: 4,
        alignItems: "center",
        background: "rgba(20,20,30,0.9)",
        padding: "4px 8px",
        borderRadius: 6,
        zIndex: 15
      }}>
        <button
          onClick={() => {
            if (zoomSelectMode) {
              setZoomSelectMode(false);
              setZoomDrag(null);
            } else {
              setZoomSelectMode(true);
            }
          }}
          style={{
            padding: "4px 10px",
            background: zoomSelectMode ? "rgba(126,184,255,0.3)" : "rgba(255,255,255,0.1)",
            border: "1px solid " + (zoomSelectMode ? "#7eb8ff" : "#3a3a4a"),
            borderRadius: 4,
            color: zoomSelectMode ? "#7eb8ff" : "#aaa",
            fontSize: 10,
            cursor: "pointer",
            fontWeight: 500
          }}
        >
          {zoomSelectMode ? "Cancel" : "Zoom In"}
        </button>
        {zoomRegion && (
          <>
            <span style={{ fontSize: 10, color: "#7eb8ff", minWidth: 50, textAlign: "center" }}>
              {Math.round(LOGICAL_W / (zoomRegion.maxX - zoomRegion.minX) * 100)}%
            </span>
            <button
              onClick={() => setZoomRegion(null)}
              style={{
                padding: "4px 10px",
                background: "rgba(126,184,255,0.2)",
                border: "1px solid #7eb8ff",
                borderRadius: 4,
                color: "#7eb8ff",
                fontSize: 10,
                cursor: "pointer",
                fontWeight: 500
              }}
            >
              Reset
            </button>
          </>
        )}
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setCtxMenu(null)} />
          <div style={{
            position: "fixed",
            left: ctxMenu.x,
            top: ctxMenu.y,
            background: "#1a1a22",
            border: "1px solid #3a3a4a",
            borderRadius: 6,
            padding: 4,
            zIndex: 100,
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            minWidth: 160,
            maxHeight: 300,
            overflowY: "auto"
          }}>
            <button
              onClick={() => { dispatch({ type: "RETURN", id: ctxMenu.id }); setCtxMenu(null); }}
              style={ctxBtnS}
              onMouseEnter={e => e.target.style.background = "rgba(126,184,255,0.1)"}
              onMouseLeave={e => e.target.style.background = "transparent"}
            >
              Return to tray
            </button>
            {strings.filter(st => st.targetId === ctxMenu.id).map(st => {
              return (
                <button
                  key={st.id}
                  onClick={() => { dispatch({ type: "DEL_STRING", id: st.id }); setCtxMenu(null); }}
                  style={{ ...ctxBtnS, color: "#ff8866" }}
                  onMouseEnter={e => e.target.style.background = "rgba(255,100,80,0.1)"}
                  onMouseLeave={e => e.target.style.background = "transparent"}
                >
                  Detach string (end {st.end})
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* String tying panel */}
      {(() => {
        const selStr = selectedId ? placed.find(i => i.id === selectedId && i.type === "string") : null;
        if (!selStr) return null;

        const endA = strings.find(st => st.stringOwnerId === selStr.id && st.end === "A");
        const endB = strings.find(st => st.stringOwnerId === selStr.id && st.end === "B");
        const endAItem = endA ? labItems.find(i => i.id === endA.targetId) : null;
        const endBItem = endB ? labItems.find(i => i.id === endB.targetId) : null;
        const endAName = endAItem
          ? (EQUIPMENT.find(e => e.type === endAItem.type)?.name || endAItem.type) + " -> " + endA.targetPoint
          : "Not tied";
        const endBName = endBItem
          ? (EQUIPMENT.find(e => e.type === endBItem.type)?.name || endBItem.type) + " -> " + endB.targetPoint
          : "Not tied";
        const picking = stringMode?.pickingEnd;

        return (
          <div style={{
            position: "absolute",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(20,20,30,0.95)",
            border: "1px solid #3a3a4a",
            borderRadius: 8,
            padding: "10px 16px",
            zIndex: 25,
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            minWidth: 220
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#e0e0e8", marginBottom: 8 }}>
              String Connections
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, color: "#888", fontWeight: 600, width: 40 }}>End A:</span>
                <span style={{ fontSize: 10, color: endA ? "#7eb8ff" : "#555", flex: 1 }}>{endAName}</span>
                <button
                  onClick={() => {
                    if (endA) {
                      dispatch({ type: "DEL_STRING", id: endA.id });
                    } else {
                      setStringMode({ stringId: selStr.id, pickingEnd: "A" });
                    }
                  }}
                  style={{
                    padding: "2px 8px",
                    background: picking === "A" ? "rgba(126,184,255,0.2)" : "transparent",
                    border: "1px solid " + (picking === "A" ? "#7eb8ff" : "#3a3a4a"),
                    borderRadius: 4,
                    color: endA ? "#ff8866" : picking === "A" ? "#7eb8ff" : "#aaa",
                    fontSize: 9,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontWeight: 600
                  }}
                >
                  {endA ? "Detach" : picking === "A" ? "Click an item..." : "Tie"}
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, color: "#888", fontWeight: 600, width: 40 }}>End B:</span>
                <span style={{ fontSize: 10, color: endB ? "#7eb8ff" : "#555", flex: 1 }}>{endBName}</span>
                <button
                  onClick={() => {
                    if (endB) {
                      dispatch({ type: "DEL_STRING", id: endB.id });
                    } else {
                      setStringMode({ stringId: selStr.id, pickingEnd: "B" });
                    }
                  }}
                  style={{
                    padding: "2px 8px",
                    background: picking === "B" ? "rgba(126,184,255,0.2)" : "transparent",
                    border: "1px solid " + (picking === "B" ? "#7eb8ff" : "#3a3a4a"),
                    borderRadius: 4,
                    color: endB ? "#ff8866" : picking === "B" ? "#7eb8ff" : "#aaa",
                    fontSize: 9,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontWeight: 600
                  }}
                >
                  {endB ? "Detach" : picking === "B" ? "Click an item..." : "Tie"}
                </button>
              </div>
            </div>
            {picking && (
              <div style={{ marginTop: 6, fontSize: 9, color: "#7eb8ff", textAlign: "center" }}>
                Click on an item in the lab to see attachment points
              </div>
            )}
          </div>
        );
      })()}

      {/* Attachment point popup */}
      {attachMenu && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 98 }} onClick={() => setAttachMenu(null)} />
          <div style={{
            position: "fixed",
            left: attachMenu.screenX,
            top: attachMenu.screenY,
            background: "#1a1a22",
            border: "1px solid #3a3a4a",
            borderRadius: 6,
            padding: 4,
            zIndex: 100,
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            minWidth: 150
          }}>
            <div style={{ padding: "3px 10px", fontSize: 9, color: "#666", fontWeight: 600 }}>ATTACH TO:</div>
            {attachMenu.points.map(pt => (
              <button
                key={pt.key}
                onClick={() => {
                  dispatch({
                    type: "ADD_STRING",
                    str: {
                      stringOwnerId: stringMode.stringId,
                      end: stringMode.pickingEnd,
                      targetId: attachMenu.itemId,
                      targetPoint: pt.key
                    }
                  });
                  setAttachMenu(null);
                  setStringMode(null);
                }}
                style={ctxBtnS}
                onMouseEnter={e => e.target.style.background = "rgba(126,184,255,0.1)"}
                onMouseLeave={e => e.target.style.background = "transparent"}
              >
                {pt.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Item Tray */}
      {trayItems.length > 0 && (
        <div style={{
          height: 56,
          flexShrink: 0,
          background: "linear-gradient(180deg,rgba(20,20,28,0.95),rgba(14,14,20,0.98))",
          borderTop: "1px solid #3a3a4a",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: 6,
          overflowX: "auto",
          zIndex: 15
        }}>
          <span style={{
            fontSize: 9,
            color: "#666",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginRight: 4,
            flexShrink: 0
          }}>
            Tray
          </span>
          {trayItems.map(it => {
            const eq = EQUIPMENT.find(e => e.type === it.type);
            const Icon = ICON_MAP[it.type];
            return (
              <div
                key={it.id}
                onMouseDown={e => onTrayMouseDown(e, it)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  background: trayDrag?.id === it.id ? "rgba(126,184,255,0.15)" : "rgba(255,255,255,0.05)",
                  border: "1px solid #2a2a3a",
                  borderRadius: 6,
                  cursor: "grab",
                  flexShrink: 0,
                  transition: "all 0.15s",
                  userSelect: "none"
                }}
              >
                <div style={{ transform: "scale(0.5)", transformOrigin: "center", height: 20, display: "flex", alignItems: "center" }}>
                  {Icon && <Icon />}
                </div>
                <span style={{ fontSize: 10, color: "#bbb", fontWeight: 500, whiteSpace: "nowrap" }}>
                  {eq?.name || it.type}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Ghost preview while dragging from tray */}
      {trayDrag && (
        <div style={{
          position: "fixed",
          left: trayDrag.mouseX - (trayDrag.props.width || 40) / 2,
          top: trayDrag.mouseY - (trayDrag.props.height || 20) / 2,
          width: trayDrag.props.width || 40,
          height: trayDrag.props.height || 20,
          opacity: 0.5,
          pointerEvents: "none",
          zIndex: 200
        }}>
          <canvas
            ref={el => {
              if (!el) return;
              const tw = trayDrag.props.width || 40;
              const th = trayDrag.props.height || 20;
              el.width = tw + 20;
              el.height = th + 20;
              const ctx = el.getContext("2d");
              ctx.globalAlpha = 0.6;

              if (trayDrag.type === "track") {
                ctx.fillStyle = "#8a8a98";
                ctx.beginPath();
                ctx.roundRect(10, 10, tw, th, 3);
                ctx.fill();
                ctx.strokeStyle = "#6a6a78";
                ctx.lineWidth = 1;
                ctx.stroke();
              } else if (trayDrag.type === "cart") {
                ctx.fillStyle = "#d03535";
                ctx.beginPath();
                ctx.roundRect(10, 10, tw, th, 4);
                ctx.fill();
              } else if (trayDrag.type === "motionDetector") {
                ctx.fillStyle = "#344d66";
                ctx.beginPath();
                ctx.roundRect(10, 10, tw, th, 5);
                ctx.fill();
              } else if (trayDrag.type === "bubbleLevel") {
                ctx.fillStyle = "#7a8a7a";
                ctx.beginPath();
                ctx.roundRect(10, 10, tw, th, th / 2);
                ctx.fill();
              } else if (trayDrag.type === "pulley") {
                ctx.fillStyle = "#888";
                ctx.beginPath();
                ctx.arc(10 + tw / 2, 10 + th / 2, tw / 2 - 2, 0, Math.PI * 2);
                ctx.fill();
              } else if (trayDrag.type === "string") {
                ctx.strokeStyle = "#bb9944";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(10, 10 + th / 2);
                ctx.lineTo(10 + tw, 10 + th / 2);
                ctx.stroke();
              } else if (trayDrag.type === "massHanger") {
                ctx.fillStyle = "#6a6a78";
                ctx.fillRect(10 + 2, 10, tw - 4, th);
              } else if (trayDrag.type === "meterStick") {
                ctx.fillStyle = "#ccaa55";
                ctx.beginPath();
                ctx.roundRect(10, 10, tw, th, 2);
                ctx.fill();
              }
            }}
            width={(trayDrag.props.width || 40) + 20}
            height={(trayDrag.props.height || 20) + 20}
            style={{ width: (trayDrag.props.width || 40) + 20, height: (trayDrag.props.height || 20) + 20 }}
          />
        </div>
      )}

      {/* Mass hanger slider */}
      {(() => {
        const mh = placed.find(i => i.type === "massHanger" && i.id === selectedId);
        if (!mh) return null;

        return (
          <div
            style={{
              position: "absolute",
              left: mh.x - 40,
              top: mh.y - 30,
              background: "rgba(20,20,30,0.92)",
              border: "1px solid #3a3a4a",
              borderRadius: 6,
              padding: "4px 8px",
              zIndex: 18,
              boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              pointerEvents: "auto"
            }}
            onMouseDown={e => e.stopPropagation()}
          >
            <span style={{ fontSize: 8, color: "#888", fontWeight: 600, whiteSpace: "nowrap" }}>
              {Math.round((mh.props.totalMass || 0.1) * 1000)}g
            </span>
            <input
              type="range"
              min="50"
              max="500"
              step="10"
              value={Math.round((mh.props.totalMass || 0.1) * 1000)}
              onChange={e => {
                dispatch({
                  type: "UPD",
                  id: mh.id,
                  u: { props: { ...mh.props, totalMass: parseInt(e.target.value) / 1000 } }
                });
              }}
              style={{ width: 80, height: 8, cursor: "pointer", accentColor: "#7eb8ff" }}
            />
            <span style={{ fontSize: 8, color: "#888" }}>500g</span>
          </div>
        );
      })()}

      {/* LabQuest Display */}
      {det && (
        <LQDisplay
          ref={lqRef}
          live={liveR}
          recording={rec}
          data={recData}
          onStart={() => startRec(det.id)}
          onStop={finishRec}
          dir={det.props.direction}
        />
      )}
    </div>
  );
}
