// Canvas Drawing Functions for Lab Items

import { tilt, surfY, TBL_Y, FLR_Y } from './physics';

// Main dispatch function
export function drawItem(ctx, item, all) {
  switch (item.type) {
    case "track": drawTrack(ctx, item); break;
    case "cart": drawCart(ctx, item); break;
    case "motionDetector": drawMD(ctx, item); break;
    case "bubbleLevel": drawLevel(ctx, item, all); break;
    case "pulley": drawPulley(ctx, item); break;
    case "string": drawString(ctx, item); break;
    case "massHanger": drawMassHanger(ctx, item); break;
    case "meterStick": drawMeterStick(ctx, item); break;
    case "protractor": drawProtractor(ctx, item); break;
  }
}

// Draw the track with adjustable feet
export function drawTrack(ctx, t, footDr) {
  const { width: tw = 480, height: th = 18 } = t.props;
  const a = tilt(t);

  ctx.save();
  ctx.translate(t.x + tw / 2, t.y);
  ctx.rotate(-a);

  // Track shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.roundRect(-tw / 2 + 3, -th + 3, tw, th, 3);
  ctx.fill();

  // Track body - aluminum extrusion gradient
  const tGr = ctx.createLinearGradient(0, -th, 0, 0);
  tGr.addColorStop(0, "#6a6a78");
  tGr.addColorStop(0.1, "#7a7a8a");
  tGr.addColorStop(0.3, "#8a8a98");
  tGr.addColorStop(0.5, "#9a9aa8");
  tGr.addColorStop(0.7, "#8a8a98");
  tGr.addColorStop(0.9, "#6a6a78");
  tGr.addColorStop(1, "#5a5a68");
  ctx.fillStyle = tGr;
  ctx.beginPath();
  ctx.roundRect(-tw / 2, -th, tw, th, 3);
  ctx.fill();

  // Top edge highlight
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-tw / 2 + 3, -th + 0.5);
  ctx.lineTo(tw / 2 - 3, -th + 0.5);
  ctx.stroke();

  // Bottom edge
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.moveTo(-tw / 2 + 3, -0.5);
  ctx.lineTo(tw / 2 - 3, -0.5);
  ctx.stroke();

  // V-groove channel
  ctx.strokeStyle = "#555568";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-tw / 2 + 12, -th * 0.35);
  ctx.lineTo(tw / 2 - 12, -th * 0.35);
  ctx.stroke();

  ctx.strokeStyle = "#4a4a58";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-tw / 2 + 12, -th * 0.65);
  ctx.lineTo(tw / 2 - 12, -th * 0.65);
  ctx.stroke();

  // Rail lips
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(-tw / 2 + 2, -th, tw - 4, 2);
  ctx.fillRect(-tw / 2 + 2, -2, tw - 4, 2);

  // End caps
  for (const side of [-1, 1]) {
    const ex = side === -1 ? -tw / 2 : tw / 2 - 8;
    const ecGr = ctx.createLinearGradient(ex, 0, ex + 8, 0);
    ecGr.addColorStop(0, "#5a5a68");
    ecGr.addColorStop(0.5, "#6a6a7a");
    ecGr.addColorStop(1, "#4a4a58");
    ctx.fillStyle = ecGr;
    ctx.fillRect(ex, -th, 8, th);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(ex, -th, 8, th);
  }

  // Ruler markings
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.font = "7px monospace";
  for (let cm = 0; cm <= 120; cm += 5) {
    const x = -tw / 2 + (cm / 120) * tw;
    const isMain = cm % 10 === 0;
    ctx.beginPath();
    ctx.moveTo(x, -2);
    ctx.lineTo(x, isMain ? -6 : -4);
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = isMain ? 0.8 : 0.4;
    ctx.stroke();
    if (cm % 20 === 0) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.textAlign = "center";
      ctx.fillText(`${cm}`, x, 8);
    }
  }
  ctx.textAlign = "start";
  ctx.restore();

  // Adjustable feet - drawn as part of the rotated track body
  // Feet extend straight down in world coordinates from the track
  const BASE_FOOT_LENGTH = 40;
  // Note: 'a' (tilt angle) is already defined at the top of this function

  for (const side of ["left", "right"]) {
    const lx = side === "left" ? 20 : tw - 20;
    const footAdj = side === "left"
      ? (t.props.leftFootHeight || 0)
      : (t.props.rightFootHeight || 0);

    // Fixed foot length
    const footLen = Math.max(10, BASE_FOOT_LENGTH + footAdj);

    // Attachment point on the tilted track (in world coords)
    const attachX = t.x + lx;
    const attachY = surfY(t, lx) + 2;

    // Foot extends straight down (world coordinates)
    const footBottomY = attachY + footLen;

    // Threaded rod (vertical in world)
    const rodW = 5;
    ctx.fillStyle = "#7a7a88";
    ctx.fillRect(attachX - rodW / 2, attachY, rodW, footLen);

    // Thread grooves
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 0.4;
    for (let ly = attachY + 2; ly < footBottomY - 6; ly += 2.5) {
      ctx.beginPath();
      ctx.moveTo(attachX - rodW / 2, ly);
      ctx.lineTo(attachX + rodW / 2, ly);
      ctx.stroke();
    }

    // Mounting bracket (tilted with track)
    ctx.save();
    ctx.translate(attachX, attachY);
    ctx.rotate(-a);
    ctx.fillStyle = "#5a5a68";
    ctx.fillRect(-8, -3, 16, 5);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(-8, -3, 16, 5);
    ctx.restore();

    // Adjustment knob at bottom of foot
    const knobY = footBottomY;
    const knobR = 7;
    const active = footDr?.tid === t.id && footDr?.side === side;

    const kGr = ctx.createRadialGradient(attachX - 1, knobY - 1, 0, attachX, knobY, knobR);
    kGr.addColorStop(0, active ? "#a0d0ff" : "#c0c0cc");
    kGr.addColorStop(0.7, active ? "#5090cc" : "#8a8a96");
    kGr.addColorStop(1, active ? "#3070aa" : "#5a5a68");
    ctx.fillStyle = kGr;
    ctx.beginPath();
    ctx.arc(attachX, knobY, knobR, 0, Math.PI * 2);
    ctx.fill();

    // Knurl lines
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 0.3;
    for (let ang = 0; ang < Math.PI * 2; ang += Math.PI / 6) {
      ctx.beginPath();
      ctx.moveTo(attachX + Math.cos(ang) * (knobR - 2), knobY + Math.sin(ang) * (knobR - 2));
      ctx.lineTo(attachX + Math.cos(ang) * knobR, knobY + Math.sin(ang) * knobR);
      ctx.stroke();
    }

    // Center dot
    ctx.fillStyle = active ? "#fff" : "#bbb";
    ctx.beginPath();
    ctx.arc(attachX, knobY, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawCart(ctx, c) {
  const { width: cw = 48, height: ch = 28 } = c.props;
  const cx = c.x, cy = c.y;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.roundRect(cx + 2, cy + 3, cw, ch, 4);
  ctx.fill();

  // Cart body gradient
  const bGr = ctx.createLinearGradient(cx, cy, cx, cy + ch);
  bGr.addColorStop(0, "#f05050");
  bGr.addColorStop(0.15, "#e84040");
  bGr.addColorStop(0.5, "#d03535");
  bGr.addColorStop(0.85, "#b82828");
  bGr.addColorStop(1, "#a02020");
  ctx.fillStyle = bGr;
  ctx.beginPath();
  ctx.roundRect(cx, cy, cw, ch, 4);
  ctx.fill();

  // Top highlight
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(cx + 4, cy + 1);
  ctx.lineTo(cx + cw - 4, cy + 1);
  ctx.stroke();

  // Side edge
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.roundRect(cx, cy, cw, ch, 4);
  ctx.stroke();

  // Label plate
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath();
  ctx.roundRect(cx + 8, cy + 6, cw - 16, ch - 14, 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "bold 8px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("CART", cx + cw / 2, cy + ch / 2 + 2);

  // Mass label
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "6px sans-serif";
  ctx.fillText("0.5 kg", cx + cw / 2, cy + ch - 3);
  ctx.textAlign = "start";

  // Bumper springs
  ctx.fillStyle = "#888";
  ctx.fillRect(cx - 2, cy + 5, 3, ch - 10);
  ctx.fillRect(cx + cw - 1, cy + 5, 3, ch - 10);

  // Wheels
  for (const wx of [cx + 10, cx + cw - 10]) {
    const wy = cy + ch + 1;

    // Tire
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(wx, wy, 5, 0, Math.PI * 2);
    ctx.fill();

    // Rim
    const rimGr = ctx.createRadialGradient(wx - 0.5, wy - 0.5, 0, wx, wy, 4);
    rimGr.addColorStop(0, "#888");
    rimGr.addColorStop(0.6, "#666");
    rimGr.addColorStop(1, "#444");
    ctx.fillStyle = rimGr;
    ctx.beginPath();
    ctx.arc(wx, wy, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Axle
    ctx.fillStyle = "#aaa";
    ctx.beginPath();
    ctx.arc(wx, wy, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Velocity indicator flag
  const v = c.props.velocity || 0;
  if (Math.abs(v) > 5) {
    const dir = v > 0 ? -1 : 1;
    ctx.fillStyle = "rgba(255,200,0,0.7)";
    ctx.beginPath();
    ctx.moveTo(cx + cw / 2, cy - 1);
    ctx.lineTo(cx + cw / 2, cy - 12);
    ctx.lineTo(cx + cw / 2 + dir * 10, cy - 8);
    ctx.lineTo(cx + cw / 2, cy - 5);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Pole
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + cw / 2, cy);
    ctx.lineTo(cx + cw / 2, cy - 12);
    ctx.stroke();
  }
}

export function drawMD(ctx, d) {
  const { width: dw = 32, height: dh = 38, direction: dir = "right" } = d.props;
  const dx = d.x, dy = d.y;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.roundRect(dx + 2, dy + 2, dw, dh, 5);
  ctx.fill();

  // Body gradient
  const bGr = ctx.createLinearGradient(dx, dy, dx + dw, dy);
  bGr.addColorStop(0, "#2a3e55");
  bGr.addColorStop(0.5, "#344d66");
  bGr.addColorStop(1, "#283a50");
  ctx.fillStyle = bGr;
  ctx.beginPath();
  ctx.roundRect(dx, dy, dw, dh, 5);
  ctx.fill();

  // Casing edge
  ctx.strokeStyle = "rgba(100,160,220,0.2)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(dx, dy, dw, dh, 5);
  ctx.stroke();

  // Top highlight
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(dx + 4, dy + 1);
  ctx.lineTo(dx + dw - 4, dy + 1);
  ctx.stroke();

  // Sensor face
  const faceX = dir === "right" ? dx + dw - 5 : dx + 1;
  const sfGr = ctx.createLinearGradient(faceX, dy + 6, faceX + 4, dy + 6);
  sfGr.addColorStop(0, "#cc9900");
  sfGr.addColorStop(0.5, "#ffcc33");
  sfGr.addColorStop(1, "#cc9900");
  ctx.fillStyle = sfGr;
  ctx.beginPath();
  ctx.roundRect(faceX, dy + 6, 4, dh - 12, 2);
  ctx.fill();

  // Sensor mesh lines
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 0.3;
  for (let sy = dy + 8; sy < dy + dh - 6; sy += 3) {
    ctx.beginPath();
    ctx.moveTo(faceX + 0.5, sy);
    ctx.lineTo(faceX + 3.5, sy);
    ctx.stroke();
  }

  // Detection cone
  ctx.fillStyle = "rgba(255,200,0,0.06)";
  ctx.beginPath();
  if (dir === "right") {
    ctx.moveTo(dx + dw, dy + dh / 2 - 10);
    ctx.lineTo(dx + dw + 50, dy + dh / 2 - 25);
    ctx.lineTo(dx + dw + 50, dy + dh / 2 + 25);
    ctx.lineTo(dx + dw, dy + dh / 2 + 10);
  } else {
    ctx.moveTo(dx, dy + dh / 2 - 10);
    ctx.lineTo(dx - 50, dy + dh / 2 - 25);
    ctx.lineTo(dx - 50, dy + dh / 2 + 25);
    ctx.lineTo(dx, dy + dh / 2 + 10);
  }
  ctx.fill();

  // Direction arrow
  ctx.fillStyle = "rgba(255,200,0,0.25)";
  ctx.beginPath();
  if (dir === "right") {
    ctx.moveTo(dx + dw, dy + dh / 2 - 8);
    ctx.lineTo(dx + dw + 14, dy + dh / 2);
    ctx.lineTo(dx + dw, dy + dh / 2 + 8);
  } else {
    ctx.moveTo(dx, dy + dh / 2 - 8);
    ctx.lineTo(dx - 14, dy + dh / 2);
    ctx.lineTo(dx, dy + dh / 2 + 8);
  }
  ctx.fill();

  // LED indicator
  ctx.fillStyle = "#44ff88";
  ctx.shadowColor = "#44ff88";
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.arc(dir === "right" ? dx + 5 : dx + dw - 5, dy + 5, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Label
  ctx.fillStyle = "rgba(170,212,255,0.6)";
  ctx.font = "bold 6px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("MOTION", dx + dw / 2, dy + dh / 2);
  ctx.fillText("DETECT", dx + dw / 2, dy + dh / 2 + 7);
  ctx.textAlign = "start";
}

export function drawLevel(ctx, lv, all) {
  const { width: lw = 72, height: lh = 14 } = lv.props;

  // Find tilt from track
  let t2 = 0;
  for (const i of all) {
    if (i.type !== "track") continue;
    if (lv.x + lw / 2 >= i.x && lv.x + lw / 2 <= i.x + (i.props.width || 480)) {
      t2 = tilt(i);
      break;
    }
  }

  const lx = lv.x, ly = lv.y;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.roundRect(lx + 1, ly + 1, lw, lh, lh / 2);
  ctx.fill();

  // Metal body gradient
  const bodyGr = ctx.createLinearGradient(lx, ly, lx, ly + lh);
  bodyGr.addColorStop(0, "#6a7a6a");
  bodyGr.addColorStop(0.3, "#8a9a8a");
  bodyGr.addColorStop(0.7, "#7a8a7a");
  bodyGr.addColorStop(1, "#5a6a5a");
  ctx.fillStyle = bodyGr;
  ctx.beginPath();
  ctx.roundRect(lx, ly, lw, lh, lh / 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.roundRect(lx, ly, lw, lh, lh / 2);
  ctx.stroke();

  // Glass tube
  const tubeL = lx + 8, tubeR = lx + lw - 8;
  const tubeT = ly + 2, tubeB = ly + lh - 2;
  const tubeW = tubeR - tubeL, tubeH = tubeB - tubeT;

  const glassGr = ctx.createLinearGradient(tubeL, tubeT, tubeL, tubeB);
  glassGr.addColorStop(0, "rgba(200,230,200,0.25)");
  glassGr.addColorStop(0.5, "rgba(180,220,180,0.15)");
  glassGr.addColorStop(1, "rgba(160,200,160,0.2)");
  ctx.fillStyle = glassGr;
  ctx.beginPath();
  ctx.roundRect(tubeL, tubeT, tubeW, tubeH, tubeH / 2);
  ctx.fill();

  // Liquid fill
  ctx.fillStyle = "rgba(120,200,100,0.12)";
  ctx.beginPath();
  ctx.roundRect(tubeL + 1, tubeT + 1, tubeW - 2, tubeH - 2, (tubeH - 2) / 2);
  ctx.fill();

  // Center calibration marks
  const cx = lx + lw / 2;
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(cx - 4, tubeT);
  ctx.lineTo(cx - 4, tubeB);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 4, tubeT);
  ctx.lineTo(cx + 4, tubeB);
  ctx.stroke();

  // Fine marks
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.moveTo(cx - 8, tubeT);
  ctx.lineTo(cx - 8, tubeB);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 8, tubeT);
  ctx.lineTo(cx + 8, tubeB);
  ctx.stroke();

  // Bubble
  const off = Math.max(-(lw / 2 - 16), Math.min(lw / 2 - 16, Math.sin(t2) * 200));
  const bubX = cx + off;
  const bubGr = ctx.createRadialGradient(bubX - 1, ly + lh / 2 - 1, 0, bubX, ly + lh / 2, 6);
  bubGr.addColorStop(0, "rgba(220,255,220,0.85)");
  bubGr.addColorStop(0.5, "rgba(180,240,180,0.6)");
  bubGr.addColorStop(1, "rgba(140,220,140,0.3)");
  ctx.fillStyle = bubGr;
  ctx.beginPath();
  ctx.ellipse(bubX, ly + lh / 2, 7, lh / 2 - 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bubble highlight
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(bubX - 2, ly + lh / 2 - 1, 2, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Glass reflection
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(tubeL + 4, tubeT + 1.5);
  ctx.lineTo(tubeR - 4, tubeT + 1.5);
  ctx.stroke();
}

export function drawPulley(ctx, p) {
  const px = p.x, py = p.y;
  const pw = p.props.width || 28, ph = p.props.height || 28;
  const cx = px + pw / 2, cy = py + ph / 2;
  const r = Math.min(pw, ph) / 2 - 2;

  // Clamp bracket
  ctx.fillStyle = "#444";
  ctx.fillRect(cx - 8, py - 2, 16, 6);
  ctx.fillStyle = "#555";
  ctx.fillRect(cx - 10, py - 4, 20, 4);

  // Clamp screws
  ctx.fillStyle = "#888";
  ctx.beginPath();
  ctx.arc(cx - 6, py - 2, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 6, py - 2, 2, 0, Math.PI * 2);
  ctx.fill();

  // Clamp jaw
  ctx.fillStyle = "#3a3a3a";
  ctx.fillRect(cx - 6, py + 4, 12, 3);

  // Axle mount
  ctx.fillStyle = "#666";
  ctx.beginPath();
  ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
  ctx.fill();

  // Wheel gradient
  const wGr = ctx.createRadialGradient(cx - 1, cy - 1, 0, cx, cy, r);
  wGr.addColorStop(0, "#bbb");
  wGr.addColorStop(0.6, "#999");
  wGr.addColorStop(1, "#666");
  ctx.fillStyle = wGr;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Groove
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
  ctx.stroke();

  // Axle center
  ctx.fillStyle = "#aaa";
  ctx.beginPath();
  ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#777";
  ctx.beginPath();
  ctx.arc(cx, cy, 1, 0, Math.PI * 2);
  ctx.fill();

  // Spokes
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 0.5;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 3, cy + Math.sin(a) * 3);
    ctx.lineTo(cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2));
    ctx.stroke();
  }

  // Clamped indicator
  if (p.props.clampedToTrack) {
    ctx.fillStyle = "rgba(126,184,255,0.2)";
    ctx.beginPath();
    ctx.roundRect(cx - 12, py - 6, 24, 8, 2);
    ctx.fill();
    ctx.strokeStyle = "#7eb8ff";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.roundRect(cx - 12, py - 6, 24, 8, 2);
    ctx.stroke();
  }
}

export function drawString(ctx, s) {
  const sx = s.x, sy = s.y;
  const sw = s.props.width || 60, sh = s.props.height || 6;

  // Coiled string look
  ctx.strokeStyle = "#bb9944";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(sx, sy + sh / 2);

  const segs = 6;
  for (let i = 1; i <= segs; i++) {
    const px2 = sx + (sw / segs) * i;
    const py2 = sy + sh / 2 + ((i % 2) ? -3 : 3) * Math.min(1, sh / 6);
    ctx.quadraticCurveTo(sx + (sw / segs) * (i - 0.5), py2, px2, sy + sh / 2);
  }
  ctx.stroke();

  // End knots
  ctx.fillStyle = "#997733";
  ctx.beginPath();
  ctx.arc(sx, sy + sh / 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(sx + sw, sy + sh / 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "butt";
}

export function drawMassHanger(ctx, mh) {
  const mx = mh.x, my = mh.y;
  const mw = mh.props.width || 24, mhh = mh.props.height || 50;
  const totalMass = mh.props.totalMass || 0.1;
  const cx = mx + mw / 2;

  // Hook
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, my + 6, 4, Math.PI, 0, false);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, my + 10);
  ctx.lineTo(cx, my + 16);
  ctx.stroke();

  // Hanger bar (always present, 50g)
  const barY = my + 16;
  ctx.fillStyle = "#5a5a68";
  ctx.beginPath();
  ctx.roundRect(mx + 2, barY, mw - 4, 6, 1);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(mx + 4, barY + 1);
  ctx.lineTo(mx + mw - 4, barY + 1);
  ctx.stroke();

  // Stem below hanger
  ctx.strokeStyle = "#777";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, barY + 6);
  ctx.lineTo(cx, barY + 10);
  ctx.stroke();

  // Stacked weights based on totalMass
  const extraMass = Math.round((totalMass - 0.05) * 1000);
  let wy = barY + 10;

  // Calculate weight slices
  const slices = [];
  let rem = extraMass;
  while (rem >= 200) { slices.push(200); rem -= 200; }
  while (rem >= 100) { slices.push(100); rem -= 100; }
  while (rem >= 50) { slices.push(50); rem -= 50; }
  while (rem >= 20) { slices.push(20); rem -= 20; }
  while (rem >= 10) { slices.push(10); rem -= 10; }

  for (const s of slices) {
    const sh = s >= 100 ? 7 : s >= 50 ? 5 : 3;
    const sw2 = s >= 100 ? mw - 4 : s >= 50 ? mw - 6 : mw - 10;
    const sx = cx - sw2 / 2;

    const slGr = ctx.createLinearGradient(sx, wy, sx, wy + sh);
    slGr.addColorStop(0, "#8a8a98");
    slGr.addColorStop(0.5, "#7a7a88");
    slGr.addColorStop(1, "#6a6a78");
    ctx.fillStyle = slGr;
    ctx.beginPath();
    ctx.roundRect(sx, wy, sw2, sh, 1);
    ctx.fill();

    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.roundRect(sx, wy, sw2, sh, 1);
    ctx.stroke();

    // Label
    if (sh >= 5) {
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "bold 4px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${s}g`, cx, wy + sh - 1);
      ctx.textAlign = "start";
    }

    wy += sh + 1;
  }

  // Total mass label
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.font = "bold 8px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${Math.round(totalMass * 1000)}g`, cx, Math.max(wy + 10, my + mhh - 2));
  ctx.textAlign = "start";
}

export function drawMeterStick(ctx, ms) {
  const mx = ms.x, my = ms.y;
  const msw = ms.props.width || 400, msh = ms.props.height || 10;
  const rotation = ms.props.rotation || 0;

  ctx.save();
  ctx.translate(mx + msw / 2, my + msh / 2);
  ctx.rotate(rotation);

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath();
  ctx.roundRect(-msw / 2 + 1, -msh / 2 + 1, msw, msh, 2);
  ctx.fill();

  // Wood body gradient
  const wGr = ctx.createLinearGradient(0, -msh / 2, 0, msh / 2);
  wGr.addColorStop(0, "#ccaa55");
  wGr.addColorStop(0.3, "#ddbb66");
  wGr.addColorStop(0.7, "#ccaa55");
  wGr.addColorStop(1, "#bb9944");
  ctx.fillStyle = wGr;
  ctx.beginPath();
  ctx.roundRect(-msw / 2, -msh / 2, msw, msh, 2);
  ctx.fill();

  ctx.strokeStyle = "#997733";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.roundRect(-msw / 2, -msh / 2, msw, msh, 2);
  ctx.stroke();

  // Centimeter marks
  ctx.strokeStyle = "#664422";
  ctx.fillStyle = "#664422";

  for (let cm = 0; cm <= 100; cm++) {
    const x = -msw / 2 + (cm / 100) * msw;
    const isMajor = cm % 10 === 0;
    const isMid = cm % 5 === 0;

    ctx.lineWidth = isMajor ? 0.8 : 0.3;
    ctx.beginPath();
    ctx.moveTo(x, -msh / 2);
    ctx.lineTo(x, -msh / 2 + (isMajor ? msh * 0.6 : isMid ? msh * 0.4 : msh * 0.25));
    ctx.stroke();

    if (isMajor && cm > 0 && cm < 100) {
      ctx.font = "5px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${cm}`, x, msh / 2 - 1);
      ctx.textAlign = "start";
    }
  }

  // Draw rotation handles at ends (small circles)
  ctx.fillStyle = "rgba(126,184,255,0.3)";
  ctx.beginPath();
  ctx.arc(-msw / 2, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(msw / 2, 0, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawProtractor(ctx, p) {
  const px = p.x, py = p.y;
  const pw = p.props.width || 100, ph = p.props.height || 55;
  const rotation = p.props.rotation || 0;
  const radius = pw / 2;

  ctx.save();
  ctx.translate(px + pw / 2, py + ph);
  ctx.rotate(rotation);

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  ctx.beginPath();
  ctx.arc(2, 2, radius, Math.PI, 0);
  ctx.lineTo(radius + 2, 2);
  ctx.lineTo(-radius + 2, 2);
  ctx.closePath();
  ctx.fill();

  // Protractor body - semi-transparent
  const pGr = ctx.createLinearGradient(0, -radius, 0, 0);
  pGr.addColorStop(0, "rgba(200,220,255,0.85)");
  pGr.addColorStop(1, "rgba(180,200,240,0.85)");
  ctx.fillStyle = pGr;
  ctx.beginPath();
  ctx.arc(0, 0, radius, Math.PI, 0);
  ctx.lineTo(radius, 0);
  ctx.lineTo(-radius, 0);
  ctx.closePath();
  ctx.fill();

  // Border
  ctx.strokeStyle = "#667788";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, radius, Math.PI, 0);
  ctx.lineTo(radius, 0);
  ctx.lineTo(-radius, 0);
  ctx.closePath();
  ctx.stroke();

  // Center mark
  ctx.fillStyle = "#445566";
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();

  // Baseline
  ctx.strokeStyle = "#445566";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-radius + 5, 0);
  ctx.lineTo(radius - 5, 0);
  ctx.stroke();

  // Degree marks
  ctx.strokeStyle = "#445566";
  ctx.fillStyle = "#334455";
  ctx.font = "6px sans-serif";
  ctx.textAlign = "center";

  for (let deg = 0; deg <= 180; deg += 5) {
    const rad = (180 - deg) * Math.PI / 180;
    const isMajor = deg % 30 === 0;
    const isMid = deg % 10 === 0;
    const innerR = radius - (isMajor ? 12 : isMid ? 8 : 5);
    const outerR = radius - 2;

    const x1 = Math.cos(rad) * innerR;
    const y1 = -Math.sin(rad) * innerR;
    const x2 = Math.cos(rad) * outerR;
    const y2 = -Math.sin(rad) * outerR;

    ctx.lineWidth = isMajor ? 0.8 : 0.4;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    if (isMajor) {
      const labelR = radius - 18;
      const lx = Math.cos(rad) * labelR;
      const ly = -Math.sin(rad) * labelR;
      ctx.fillText(`${deg}`, lx, ly + 2);
    }
  }

  // Rotation handles at ends
  ctx.fillStyle = "rgba(126,184,255,0.3)";
  ctx.beginPath();
  ctx.arc(-radius, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(radius, 0, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Draw background (walls, floor, table)
export function drawBackground(ctx, w, h) {
  // Background - light lab room
  ctx.fillStyle = "#d8dce2";
  ctx.fillRect(0, 0, w, h);

  // Wall gradient
  const wallGr = ctx.createLinearGradient(0, 0, 0, FLR_Y);
  wallGr.addColorStop(0, "#e2e6ec");
  wallGr.addColorStop(1, "#d0d4da");
  ctx.fillStyle = wallGr;
  ctx.fillRect(0, 0, w, FLR_Y);

  // Baseboard
  ctx.fillStyle = "#8a8a90";
  ctx.fillRect(0, FLR_Y - 5, w, 5);

  // Floor gradient
  const flGr = ctx.createLinearGradient(0, FLR_Y, 0, h);
  flGr.addColorStop(0, "#b8bcc4");
  flGr.addColorStop(1, "#a8acb4");
  ctx.fillStyle = flGr;
  ctx.fillRect(0, FLR_Y, w, h - FLR_Y);

  // Floor tile lines
  ctx.strokeStyle = "rgba(0,0,0,0.04)";
  ctx.lineWidth = 1;
  for (let tx = 0; tx < w; tx += 60) {
    ctx.beginPath();
    ctx.moveTo(tx, FLR_Y);
    ctx.lineTo(tx, h);
    ctx.stroke();
  }
  for (let ty = FLR_Y; ty < h; ty += 30) {
    ctx.beginPath();
    ctx.moveTo(0, ty);
    ctx.lineTo(w, ty);
    ctx.stroke();
  }

  // Floor line
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, FLR_Y);
  ctx.lineTo(w, FLR_Y);
  ctx.stroke();
}

// Draw table
export function drawTable(ctx, w) {
  // Table takes up ~65% of the room width, centered
  const tblW = Math.floor(w * 0.65);
  const tblL = Math.floor((w - tblW) / 2);
  const tblR = tblL + tblW;
  const tblThick = 10;
  const legW = 14, legInset = 30;

  // Table legs
  ctx.fillStyle = "#5a5a60";
  ctx.fillRect(tblL + legInset - legW / 2, TBL_Y + tblThick, legW, FLR_Y - TBL_Y - tblThick);
  ctx.fillRect(tblR - legInset - legW / 2, TBL_Y + tblThick, legW, FLR_Y - TBL_Y - tblThick);

  ctx.fillStyle = "#666";
  ctx.fillRect(tblL + legInset - legW / 2 + 2, TBL_Y + tblThick, 2, FLR_Y - TBL_Y - tblThick);
  ctx.fillRect(tblR - legInset - legW / 2 + 2, TBL_Y + tblThick, 2, FLR_Y - TBL_Y - tblThick);

  // Cross brace
  ctx.fillStyle = "#4a4a50";
  ctx.fillRect(tblL + legInset + legW / 2, TBL_Y + tblThick + 60, tblW - 2 * legInset - legW, 5);

  // Tabletop - black lab surface (epoxy resin)
  const topGr = ctx.createLinearGradient(0, TBL_Y - 2, 0, TBL_Y + tblThick + 2);
  topGr.addColorStop(0, "#2a2a2e");
  topGr.addColorStop(0.15, "#222226");
  topGr.addColorStop(0.85, "#1e1e22");
  topGr.addColorStop(1, "#181818");
  ctx.fillStyle = topGr;
  ctx.beginPath();
  ctx.roundRect(tblL, TBL_Y, tblW, tblThick, 2);
  ctx.fill();

  // Top surface highlight
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tblL + 2, TBL_Y + 1);
  ctx.lineTo(tblR - 2, TBL_Y + 1);
  ctx.stroke();

  // Bottom edge shadow
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.moveTo(tblL + 2, TBL_Y + tblThick);
  ctx.lineTo(tblR - 2, TBL_Y + tblThick);
  ctx.stroke();

  // Edge trim
  ctx.fillStyle = "#333";
  ctx.fillRect(tblL, TBL_Y + tblThick - 1, tblW, 2);
}
