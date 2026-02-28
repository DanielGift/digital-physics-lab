// Physics Constants and Engine
import { getAttachPoints } from "../state/attachPoints";

// Constants
export const G = 9.81;        // Gravity (m/s^2)
export const PX_M = 400;      // Pixels per meter
export const TBL_Y = 180;     // Table surface Y position (for 400px logical height)
export const FLR_Y = 360;     // Floor Y position (for 400px logical height)
export const MU = 0.002;      // Default friction coefficient

// Get table bounds (must match drawing.js)
export function getTableBounds(canvasWidth) {
  const tblW = Math.floor(canvasWidth * 0.65);
  const tblL = Math.floor((canvasWidth - tblW) / 2);
  const tblR = tblL + tblW;
  return { left: tblL, right: tblR, width: tblW };
}

// Calculate track tilt angle from foot heights
export function tilt(t) {
  if (!t) return 0;
  const w = t.props.width || 480;
  return Math.atan2(
    (t.props.rightFootHeight || 0) - (t.props.leftFootHeight || 0),
    w
  ) + (t.props.initialTilt || 0);
}

// Calculate Y position of track surface at a given local X
export function surfY(t, lx) {
  return t.y - Math.sin(tilt(t)) * (lx - (t.props.width || 480) / 2);
}

// Find which track an item is near/on
export function findTrack(item, items) {
  const cx = item.x + (item.props.width || 40) / 2;
  const by = item.y + (item.props.height || 28);

  for (const t of items) {
    if (t.type !== "track") continue;
    if (cx >= t.x - 10 && cx <= t.x + (t.props.width || 480) + 10) {
      const sy = surfY(t, cx - t.x);
      if (Math.abs(by - sy) < 35) return t;
    }
  }
  return null;
}

// Find the nearest surface below a point (x, y)
// Returns { surfaceY, type } where type is "table", "floor", or "object"
// Excludes meterStick from collision (it overlays other objects)
// selfId is the item doing the checking (to exclude itself)
function findSurfaceBelow(x, y, items, tbl, selfId = null) {
  let bestY = FLR_Y;  // Default to floor
  let bestType = "floor";

  // Check table
  if (x >= tbl.left && x <= tbl.right && y < TBL_Y) {
    if (TBL_Y < bestY) {
      bestY = TBL_Y;
      bestType = "table";
    }
  }

  // Check other objects (not meterStick/protractor, not self, not in tray)
  for (const item of items) {
    if (item.id === selfId) continue;
    if (item.props.inTray) continue;
    if (item.type === "meterStick") continue; // Meter stick doesn't block
    if (item.type === "protractor") continue; // Protractor doesn't block
    if (item.type === "string") continue; // Strings don't block

    const iw = item.props.width || 40;
    const ih = item.props.height || 30;
    const itemLeft = item.x;
    const itemRight = item.x + iw;
    const itemTop = item.y;

    // Check if x is within this item's horizontal bounds
    if (x >= itemLeft && x <= itemRight) {
      // Check if item's top is below our y but above current best
      if (itemTop > y && itemTop < bestY) {
        bestY = itemTop;
        bestType = "object";
      }
    }
  }

  return { surfaceY: bestY, type: bestType };
}

// Get motion detector reading (distance to nearest object in line of sight)
export function detReading(det, items) {
  const detW = det.props.width || 32;
  const right = det.props.direction === "right";
  // Measure from the sensor face (right edge when facing right, left edge when facing left)
  const dx = right ? (det.x + detW) : det.x;
  const detTop = det.y;
  const detBot = det.y + (det.props.height || 38);
  const detMidY = (detTop + detBot) / 2;
  let best = Infinity;

  for (const i of items) {
    if (i.id === det.id) continue;
    if (i.props.inTray) continue;
    if (i.type === "track") continue; // Don't detect the track

    // Detect the nearest edge of the item (left edge if detector faces right, right edge if left)
    const iw = i.props.width || 40;
    const ix = right ? i.x : (i.x + iw);  // Left edge when facing right, right edge when facing left
    const iTop = i.y;
    const iBot = i.y + (i.props.height || 30);

    // Must be in the right direction
    if (right ? ix <= dx : ix >= dx) continue;

    // Line-of-sight: detector's center Y must intersect the item's vertical span
    if (detMidY < iTop - 10 || detMidY > iBot + 10) continue;

    best = Math.min(best, Math.abs(ix - dx));
  }

  return best === Infinity ? null : best / PX_M;
}

// Numerical derivative for velocity/acceleration from position data
export function deriv(v, t) {
  if (v.length < 2) return [];
  return v.map((_, i) => {
    if (i === 0) return (v[1] - v[0]) / (t[1] - t[0]);
    if (i === v.length - 1) return (v[i] - v[i - 1]) / (t[i] - t[i - 1]);
    return (v[i + 1] - v[i - 1]) / (t[i + 1] - t[i - 1]);
  });
}

// Calculate current string length between two attachment points, accounting for pulley
function calcStringLength(a, b, pulleys) {
  // Check for pulley in the path
  for (const p of pulleys) {
    const pcx = p.x + (p.props.width || 28) / 2;
    const pcy = p.y + (p.props.height || 28) / 2;
    const pr = (p.props.width || 28) / 2;
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    if (pcx >= minX - pr && pcx <= maxX + pr) {
      const lineY = a.y + (b.y - a.y) * ((pcx - a.x) / (b.x - a.x || 1));
      if (pcy <= lineY + 20 && pcy >= Math.min(a.y, b.y) - 50) {
        // Pulley found - calculate length through it
        const arcR = pr - 2;
        const leftPt = a.x < b.x ? a : b;
        const rightPt = a.x < b.x ? b : a;
        const leftLen = Math.sqrt((leftPt.x - (pcx - arcR)) ** 2 + (leftPt.y - pcy) ** 2);
        const rightLen = Math.sqrt((rightPt.x - (pcx + arcR)) ** 2 + (rightPt.y - pcy) ** 2);
        const arcLen = Math.PI * arcR;
        return { length: leftLen + arcLen + rightLen, pulley: p };
      }
    }
  }
  // No pulley - straight line
  return { length: Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2), pulley: null };
}

// Check if an item is connected via taut string to another item
function getStringConnection(itemId, items, strings) {
  for (const strItem of items) {
    if (strItem.type !== "string" || !strItem.props.fixedLength) continue;

    const endA = strings.find(st => st.stringOwnerId === strItem.id && st.end === "A");
    const endB = strings.find(st => st.stringOwnerId === strItem.id && st.end === "B");
    if (!endA || !endB) continue;

    if (endA.targetId === itemId) {
      const other = items.find(i => i.id === endB.targetId);
      if (other && !other.props.inTray) return { stringItem: strItem, otherItem: other, otherEnd: endB };
    }
    if (endB.targetId === itemId) {
      const other = items.find(i => i.id === endA.targetId);
      if (other && !other.props.inTray) return { stringItem: strItem, otherItem: other, otherEnd: endA };
    }
  }
  return null;
}

// Physics simulation step
export function step(items, dt, strings = [], canvasWidth = 1000) {
  const u = items.map(i => ({ ...i, props: { ...i.props } }));
  const tbl = getTableBounds(canvasWidth);
  const pulleys = u.filter(i => i.type === "pulley" && !i.props.inTray);

  for (const item of u) {
    if (item.props.isDragging || item.props.inTray) continue;

    // Meter stick and protractor float - no gravity
    if (item.type === "meterStick" || item.type === "protractor") continue;

    const isCart = item.type === "cart";
    const isFreeBody = item.type !== "track";

    if (!isCart && !isFreeBody) continue;

    let vx = item.props.velocity || 0;
    let vy = item.props.velocityY || 0;

    if (isCart) {
      const track = findTrack(item, u);
      if (track) {
        const a = tilt(track);
        const mu = track.props.friction || MU;
        const ga = G * Math.sin(a) * PX_M;
        const fr = vx ? -Math.sign(vx) * mu * G * Math.cos(a) * PX_M : 0;

        let nv = vx - ga * dt + fr * dt;

        // Stop if friction would reverse direction
        if (vx && Math.sign(nv) !== Math.sign(vx) && Math.abs(ga * dt) < Math.abs(fr * dt)) {
          nv = 0;
        }
        // Stop if nearly stationary on flat track
        if (Math.abs(nv) < 0.5 && Math.abs(ga) < 2) {
          nv = 0;
        }

        const nx = item.x + nv * dt;
        const cw = item.props.width || 48;
        const tl = track.x;
        const tr = track.x + (track.props.width || 480) - cw;

        // Check if cart falls off track ends
        if (nx < tl || nx > tr) {
          item.props.velocity = nv;
          item.props.velocityY = 0;
          item.props.onTrack = false;
          item.x = nx;
          continue;
        } else {
          item.x = Math.max(tl, Math.min(tr, nx));
          item.props.velocity = nv;
          item.props.onTrack = true;
          const lx = (item.x + cw / 2) - track.x;
          item.y = surfY(track, lx) - (item.props.height || 28);
          continue;
        }
      }
    }

    // Free fall for items not on track
    if (isFreeBody && item.props.onSurface === "track") {
      const tr = findTrack({ ...item, type: "cart" }, u);
      if (tr) {
        const lx = (item.x + (item.props.width || 40) / 2) - tr.x;
        item.y = surfY(tr, lx) - (item.props.height || 14);
        item.props.velocity = 0;
        item.props.velocityY = 0;
        continue;
      } else {
        item.props.onSurface = null;
      }
    }

    // Check if this item is connected via string to another item (Atwood machine)
    const conn = getStringConnection(item.id, u, strings);
    if (conn && item.type === "massHanger") {
      const otherItem = conn.otherItem;
      const ih = item.props.height || 50;
      const iw = item.props.width || 24;
      const itemCx = item.x + iw / 2;
      const itemBottom = item.y + ih;

      // Check if the hanger is actually hanging (not supported by table)
      // It's hanging if: center is off table edge OR bottom is below table surface
      const hangerOverTable = itemCx >= tbl.left && itemCx <= tbl.right;
      const hangerOnTable = hangerOverTable && itemBottom >= TBL_Y - 5 && itemBottom <= TBL_Y + 5;

      // Only apply Atwood dynamics if the hanger is actually hanging
      if (!hangerOnTable) {
        // Check if string goes over a pulley
        let pulley = null;
        for (const p of pulleys) {
          const pcx = p.x + (p.props.width || 28) / 2;
          const pcy = p.y + (p.props.height || 28) / 2;
          const pr = (p.props.width || 28) / 2;
          // Check if pulley is between the two items
          const otherCx = otherItem.x + (otherItem.props.width || 40) / 2;
          if ((itemCx < pcx && otherCx > pcx - pr) || (itemCx > pcx && otherCx < pcx + pr)) {
            pulley = p;
            break;
          }
        }

        // If connected to a cart on track via pulley, apply coupled Atwood dynamics
        if (pulley && otherItem.type === "cart" && otherItem.props.onTrack) {
          const hangMass = item.props.totalMass || 0.1;
          const cartMass = otherItem.props.mass || 0.5;
          const totalMass = hangMass + cartMass;

          // Atwood machine acceleration: a = (m_hang * g) / (m_cart + m_hang)
          const atwoodAccel = (hangMass * G * PX_M) / totalMass;

          // Update mass hanger velocity (falling)
          const newVy = (vy || 0) + atwoodAccel * dt;
          item.props.velocityY = newVy;
          item.y += newVy * dt;

          // Update cart velocity (pulled toward pulley)
          const pcx = pulley.x + (pulley.props.width || 28) / 2;
          const cartCx = otherItem.x + (otherItem.props.width || 48) / 2;
          const cartDir = cartCx < pcx ? 1 : -1;
          otherItem.props.velocity = cartDir * Math.abs(newVy);
          otherItem.x += otherItem.props.velocity * dt;

          // Keep cart on track
          const track = findTrack(otherItem, u);
          if (track) {
            otherItem.props.onTrack = true;
            const lx = (otherItem.x + (otherItem.props.width || 48) / 2) - track.x;
            otherItem.y = surfY(track, lx) - (otherItem.props.height || 28);
          }

          // Don't do normal free fall for this mass hanger
          continue;
        }
      } else {
        // Hanger is on table - keep it there, no velocity
        item.y = TBL_Y - ih;
        item.props.velocityY = 0;
        item.props.velocity = 0;
        continue;
      }
    }

    item.props.onTrack = false;
    const nvy = (vy || 0) + G * PX_M * dt;
    item.x += (vx || 0) * dt;
    item.y += nvy * dt;
    item.props.velocity = (vx || 0) * 0.999;
    item.props.velocityY = nvy;

    const ih = item.props.height || 30;
    const iw = item.props.width || 40;
    const itemCx = item.x + iw / 2;
    const itemBottom = item.y + ih;

    // Find nearest surface below (table, floor, or another object)
    const surface = findSurfaceBelow(itemCx, item.y, u, tbl, item.id);

    // Land on surface if falling through it
    if (itemBottom >= surface.surfaceY && nvy > 0) {
      item.y = surface.surfaceY - ih;
      item.props.velocityY = 0;
      item.props.velocity = (vx || 0) * (surface.type === "floor" ? 0 : 0.7);
    }
  }

  // Track physics - realistic solid body behavior with fixed-length feet
  const BASE_FOOT_LENGTH = 40; // Must match drawing.js

  for (const track of u) {
    if (track.type !== "track" || track.props.inTray || track.props.isDragging) continue;

    const tw = track.props.width || 480;
    const leftFootX = track.x + 20;
    const rightFootX = track.x + tw - 20;
    const trackCenterX = track.x + tw / 2;

    // Fixed foot lengths (never change from physics)
    const leftFootLen = BASE_FOOT_LENGTH + (track.props.leftFootHeight || 0);
    const rightFootLen = BASE_FOOT_LENGTH + (track.props.rightFootHeight || 0);
    const avgFootLen = (leftFootLen + rightFootLen) / 2;

    const leftOverTable = leftFootX >= tbl.left && leftFootX <= tbl.right;
    const rightOverTable = rightFootX >= tbl.left && rightFootX <= tbl.right;

    // Maximum tilt when on table: ±7 degrees
    const maxStableTilt = 7 * Math.PI / 180;

    // Calculate where feet bottom would be (for collision detection)
    const leftFootBottomY = track.y + 2 + leftFootLen;
    const rightFootBottomY = track.y + 2 + rightFootLen;

    if (!leftOverTable && !rightOverTable) {
      // Both feet off table bounds - track falls, find surface below
      const nvy = (track.props.velocityY || 0) + G * PX_M * dt;
      track.y += nvy * dt;
      track.props.velocityY = nvy;

      // Find surfaces below each foot
      const leftSurface = findSurfaceBelow(leftFootX, track.y, u, tbl, track.id);
      const rightSurface = findSurfaceBelow(rightFootX, track.y, u, tbl, track.id);

      // Check if either foot has landed
      const leftFootY = track.y + 2 + leftFootLen;
      const rightFootY = track.y + 2 + rightFootLen;

      if (leftFootY >= leftSurface.surfaceY || rightFootY >= rightSurface.surfaceY) {
        // Land on the higher surface (smaller Y)
        const leftTargetY = leftSurface.surfaceY - 2 - leftFootLen;
        const rightTargetY = rightSurface.surfaceY - 2 - rightFootLen;
        track.y = Math.min(leftTargetY, rightTargetY);
        track.props.velocityY = 0;
        track.props.initialTilt = 0;
      }
    } else if (!leftOverTable || !rightOverTable) {
      // One foot off - determine pivot edge and check stability
      const pivotEdge = !leftOverTable ? tbl.left : tbl.right;
      const offSide = !leftOverTable ? "left" : "right";

      // How far is the center of mass from the pivot edge?
      const centerDistFromEdge = offSide === "left"
        ? trackCenterX - pivotEdge
        : pivotEdge - trackCenterX;

      // How much of the track is hanging off?
      const overhang = offSide === "left"
        ? pivotEdge - track.x
        : (track.x + tw) - pivotEdge;

      // Track is stable if center of mass is over the table
      const isStable = centerDistFromEdge > 0 && overhang < tw * 0.5;

      if (isStable) {
        // Track tilts toward the unsupported side
        // Left off = left drops = positive tilt (in our convention: positive tilt raises right side)
        const tiltAmount = Math.min(maxStableTilt, (overhang / tw) * 0.4);
        const tiltDir = offSide === "left" ? 1 : -1;
        const targetTilt = tiltDir * tiltAmount;

        const currentTilt = track.props.initialTilt || 0;
        track.props.initialTilt = currentTilt + (targetTilt - currentTilt) * 0.15;
        track.props.velocityY = 0;
        track.props.angularVelocity = 0;

        // Position track so the on-table foot touches the surface below it
        const onTableFootX = offSide === "left" ? rightFootX : leftFootX;
        const onTableFootLen = offSide === "left" ? rightFootLen : leftFootLen;
        const onTableFootLocalX = offSide === "left" ? (tw - 20) : 20;
        const onTableSurface = findSurfaceBelow(onTableFootX, track.y, u, tbl, track.id);

        const totalTilt = tilt(track);
        const tiltOffset = Math.sin(totalTilt) * (onTableFootLocalX - tw / 2);
        const targetY = onTableSurface.surfaceY - 2 - onTableFootLen + tiltOffset;
        track.y = track.y + (targetY - track.y) * 0.2;
      } else {
        // Track tips over - rotate around the pivot edge and fall
        const angularVel = track.props.angularVelocity || 0;
        const angularAccel = G * 4.0;
        const newAngularVel = angularVel + angularAccel * dt;
        track.props.angularVelocity = newAngularVel;

        // Left off = rotates clockwise (positive), Right off = counter-clockwise (negative)
        const tiltDir = offSide === "left" ? 1 : -1;
        track.props.initialTilt = (track.props.initialTilt || 0) + tiltDir * newAngularVel * dt;

        // Track slides off as it tips
        const slideDir = offSide === "left" ? -1 : 1;
        track.x += slideDir * newAngularVel * 0.3 * dt;

        // Once tilted past 45°, start falling
        if (Math.abs(track.props.initialTilt) > Math.PI / 4) {
          track.props.velocityY = (track.props.velocityY || 0) + G * PX_M * dt;
          track.y += track.props.velocityY * dt;
        }

        // Check if now completely off table
        const newLeftX = track.x + 20;
        const newRightX = track.x + tw - 20;
        if (newLeftX > tbl.right || newRightX < tbl.left) {
          track.props.velocityY = (track.props.velocityY || 0) + G * PX_M * dt;
          track.y += track.props.velocityY * dt;
        }
      }

      // Land on surface below
      const leftSurface = findSurfaceBelow(leftFootX, track.y, u, tbl, track.id);
      const rightSurface = findSurfaceBelow(rightFootX, track.y, u, tbl, track.id);
      const leftFootY = track.y + 2 + leftFootLen;
      const rightFootY = track.y + 2 + rightFootLen;

      if (leftFootY >= leftSurface.surfaceY || rightFootY >= rightSurface.surfaceY) {
        const leftTargetY = leftSurface.surfaceY - 2 - leftFootLen;
        const rightTargetY = rightSurface.surfaceY - 2 - rightFootLen;
        track.y = Math.min(leftTargetY, rightTargetY);
        track.props.velocityY = 0;
        track.props.angularVelocity = 0;
        track.props.initialTilt = 0;
      }
    } else {
      // Both feet are within valid X bounds - find surface below each foot
      const leftSurface = findSurfaceBelow(leftFootX, track.y, u, tbl, track.id);
      const rightSurface = findSurfaceBelow(rightFootX, track.y, u, tbl, track.id);

      // Target Y for each foot to touch its surface
      const leftTargetFootY = leftSurface.surfaceY;
      const rightTargetFootY = rightSurface.surfaceY;

      // Check if surfaces are at different heights (one foot hanging)
      const heightDiff = Math.abs(leftTargetFootY - rightTargetFootY);
      const oneFootHanging = heightDiff > 20; // Significant height difference

      if (oneFootHanging) {
        // One foot is on a higher surface than the other - apply tilt/fall logic
        const higherSide = leftTargetFootY < rightTargetFootY ? "left" : "right";
        const lowerSide = higherSide === "left" ? "right" : "left";

        // The higher foot is supported, the lower foot hangs
        const supportedFootX = higherSide === "left" ? leftFootX : rightFootX;
        const supportedFootLen = higherSide === "left" ? leftFootLen : rightFootLen;
        const supportedSurfaceY = higherSide === "left" ? leftTargetFootY : rightTargetFootY;
        const supportedFootLocalX = higherSide === "left" ? 20 : (tw - 20);

        // Check if center of mass is supported
        const supportedFootWorldX = higherSide === "left" ? leftFootX : rightFootX;
        const unsupportedFootWorldX = higherSide === "left" ? rightFootX : leftFootX;
        const centerOverSupport = Math.abs(trackCenterX - supportedFootWorldX) < tw * 0.4;

        if (centerOverSupport) {
          // Stable but tilted - tilt toward the unsupported (lower) side
          const tiltAmount = Math.min(maxStableTilt, heightDiff / tw * 0.5);
          const tiltDir = lowerSide === "left" ? 1 : -1; // Positive tilt = right side up
          const targetTilt = tiltDir * tiltAmount;

          const currentTilt = track.props.initialTilt || 0;
          track.props.initialTilt = currentTilt + (targetTilt - currentTilt) * 0.15;

          // Position track so supported foot touches its surface
          const totalTilt = tilt(track);
          const tiltOffset = Math.sin(totalTilt) * (supportedFootLocalX - tw / 2);
          const targetY = supportedSurfaceY - 2 - supportedFootLen + tiltOffset;
          track.y = track.y + (targetY - track.y) * 0.2;
          track.props.velocityY = 0;
        } else {
          // Unstable - tip over
          const angularVel = track.props.angularVelocity || 0;
          const angularAccel = G * 4.0;
          const newAngularVel = angularVel + angularAccel * dt;
          track.props.angularVelocity = newAngularVel;

          const tiltDir = lowerSide === "left" ? 1 : -1;
          track.props.initialTilt = (track.props.initialTilt || 0) + tiltDir * newAngularVel * dt;

          if (Math.abs(track.props.initialTilt) > Math.PI / 4) {
            track.props.velocityY = (track.props.velocityY || 0) + G * PX_M * dt;
            track.y += track.props.velocityY * dt;
          }
        }
      } else {
        // Both feet on similar height surfaces - settle normally
        const leftTrackTargetY = leftTargetFootY - 2 - leftFootLen;
        const rightTrackTargetY = rightTargetFootY - 2 - rightFootLen;
        const targetY = Math.min(leftTrackTargetY, rightTrackTargetY);

        if (track.y < targetY - 2) {
          track.props.velocityY = (track.props.velocityY || 0) + G * PX_M * dt;
          track.y = Math.min(targetY, track.y + track.props.velocityY * dt);
        } else {
          track.y = targetY;
          track.props.velocityY = 0;
        }

        // Slowly reduce initialTilt to zero
        const currentInitialTilt = track.props.initialTilt || 0;
        track.props.initialTilt = currentInitialTilt * 0.92;
        if (Math.abs(track.props.initialTilt) < 0.001) {
          track.props.initialTilt = 0;
        }
      }

      // Clamp total tilt to ±7°
      const footTilt = Math.atan2(
        (track.props.rightFootHeight || 0) - (track.props.leftFootHeight || 0),
        tw
      );
      const totalTilt = footTilt + (track.props.initialTilt || 0);
      if (Math.abs(totalTilt) > maxStableTilt) {
        const clampedTotal = Math.max(-maxStableTilt, Math.min(maxStableTilt, totalTilt));
        track.props.initialTilt = clampedTotal - footTilt;
      }

      track.props.angularVelocity = 0;
    }
  }

  // String constraint enforcement
  const stringItems = u.filter(i => i.type === "string" && !i.props.inTray && i.props.fixedLength);

  for (const strItem of stringItems) {
    const fixedLen = strItem.props.fixedLength;
    if (!fixedLen) continue;

    // Find the two ends
    const endA = strings.find(st => st.stringOwnerId === strItem.id && st.end === "A");
    const endB = strings.find(st => st.stringOwnerId === strItem.id && st.end === "B");
    if (!endA || !endB) continue;

    const itemA = u.find(i => i.id === endA.targetId);
    const itemB = u.find(i => i.id === endB.targetId);
    if (!itemA || !itemB) continue;
    if (itemA.props.inTray || itemB.props.inTray) continue;

    const ptsA = getAttachPoints(itemA);
    const ptsB = getAttachPoints(itemB);
    const ptA = ptsA.find(p => p.key === endA.targetPoint);
    const ptB = ptsB.find(p => p.key === endB.targetPoint);
    if (!ptA || !ptB) continue;

    const a = ptA.getXY();
    const b = ptB.getXY();

    const { length: currentLen, pulley } = calcStringLength(a, b, pulleys);

    // If the string is stretched beyond its fixed length, apply constraint
    if (currentLen > fixedLen + 2) {
      const overshoot = currentLen - fixedLen;

      // Determine which items can move
      const aCanMove = !itemA.props.isDragging && itemA.type !== "track" && itemA.type !== "pulley";
      const bCanMove = !itemB.props.isDragging && itemB.type !== "track" && itemB.type !== "pulley";

      if (pulley) {
        // With a pulley: typical Atwood machine setup
        // If one item is a cart on track and other is a hanging mass
        const cartItem = (itemA.type === "cart" && itemA.props.onTrack) ? itemA :
                        (itemB.type === "cart" && itemB.props.onTrack) ? itemB : null;
        const hangItem = (itemA.type === "massHanger") ? itemA :
                        (itemB.type === "massHanger") ? itemB : null;

        if (cartItem && hangItem) {
          // Proper Atwood machine: maintain string length constraint
          const pcx = pulley.x + (pulley.props.width || 28) / 2;
          const cartIsLeft = cartItem.x < pcx;

          // The string pulls them together - move to satisfy constraint
          // Cart moves horizontally toward pulley, mass moves up
          const correction = overshoot * 0.6;  // Strong correction
          if (cartIsLeft) {
            cartItem.x += correction;
            cartItem.props.velocity = Math.abs(hangItem.props.velocityY || 0);
          } else {
            cartItem.x -= correction;
            cartItem.props.velocity = -Math.abs(hangItem.props.velocityY || 0);
          }
          hangItem.y -= correction;

          // Couple their velocities - cart velocity = hanging mass velocity (in magnitude)
          const hangV = Math.abs(hangItem.props.velocityY || 0);
          if (cartIsLeft) {
            cartItem.props.velocity = hangV;
          } else {
            cartItem.props.velocity = -hangV;
          }
          // Keep mass falling but coupled to cart motion
          hangItem.props.velocityY = Math.abs(cartItem.props.velocity);
        } else if (hangItem && !cartItem) {
          // Mass hanger connected but no cart - just enforce position constraint
          // The mass should be held at the string length
          hangItem.y -= overshoot;
          hangItem.props.velocityY = 0;
        }
      } else {
        // No pulley - simple constraint between two items
        if (aCanMove && bCanMove) {
          // Move both items toward each other
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;
            const move = overshoot / 2;
            itemA.x += nx * move;
            itemA.y += ny * move;
            itemB.x -= nx * move;
            itemB.y -= ny * move;
          }
        } else if (aCanMove) {
          // Only A can move
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            itemA.x += (dx / dist) * overshoot;
            itemA.y += (dy / dist) * overshoot;
          }
        } else if (bCanMove) {
          // Only B can move
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            itemB.x += (dx / dist) * overshoot;
            itemB.y += (dy / dist) * overshoot;
          }
        }
      }
    }
  }

  return u;
}
