# Claude Code Handoff: PhysicsLab

## What This Is

A virtual physics lab built as a single-file React component (`PhysicsLab.jsx`, ~1,400 lines). It simulates a real introductory physics lab environment with:

- **Equipment Room** — Browse and add lab equipment (track, cart, motion detector, bubble level, pulley, string, mass hanger, meter stick) to a tray
- **Lab Room** — 2D canvas-based physics simulation where you drag equipment from a tray, place it, and interact with it
- **LabQuest Display** — Live sensor readout + graph recorder (position/velocity/acceleration vs time)
- **Lab Notebook** — Rich-text contentEditable editor with formatting toolbar, GUI equation builder (Unicode symbols, super/subscripts, visual fractions), inline table insertion, and screenshot capture

## Current Single File

`PhysicsLab.jsx` — single default export `App`. Everything is in one file. Your first job is to split it into a clean multi-file architecture.

## Step 1: Project Setup

```bash
npm create vite@latest physics-lab -- --template react
cd physics-lab
# Replace src/ contents with the split files below
# Copy PhysicsLab.jsx into the project root for reference
npm run dev
```

## Step 2: Recommended File Structure

```
src/
  App.jsx                  — Main shell: tab nav, layout, useReducer, passes state down
  state/
    reducer.js             — Reducer function, initial state, all action types
    attachPoints.js        — getAttachPoints(item) → [{key, label, getXY()}]
  equipment/
    EquipmentRoom.jsx      — Equipment browser: card grid + sliding info panel
    equipmentData.js       — EQUIPMENT array, SVG icon components, ICON_MAP
  lab/
    LabRoom.jsx            — Canvas container, mouse handlers, tray bar, overlays
    physics.js             — Constants + pure functions: tilt, surfY, findTrack, detReading, deriv, step
    drawing.js             — All canvas draw functions: drawTrack, drawCart, drawMD, etc.
    StringPanel.jsx        — String connection UI (End A / End B tying panel)
  labquest/
    LQDisplay.jsx          — LabQuest sensor display: live mode + graph mode
  notebook/
    NbEditor.jsx           — Rich text editor with formatting toolbar + screenshot
    EqBuilder.jsx          — Equation builder: symbol palettes, super/sub, fractions
```

## Architecture Overview

### State Management

All state lives in a single `useReducer` at the App level:

```js
const init = {
  labItems: [],          // All equipment instances (placed or in tray)
  strings: [],           // String connections [{id, stringOwnerId, end:"A"|"B", targetId, targetPoint}]
  notebookEntries: [],   // Notebook content (richtext HTML, images)
  activeTab: "lab",      // "lab" | "equipment" | "notebook"
  nbPanel: false,        // Notebook side panel open in lab view
  nextId: 1,             // Auto-increment ID for new items
  selectedId: null       // Currently selected item ID (for mass slider, string panel)
};
```

**Reducer actions:**
- `BRING` — Add equipment to tray (from equipment room)
- `PLACE` — Move item from tray to canvas at (x,y)
- `RETURN` — Move item back to tray (also cleans up string connections)
- `UPD` — Update item position/props (used by physics loop + drag)
- `REM` — Remove item entirely
- `SELECT` / `DESELECT` — Item selection (shows mass slider, string panel, blue outline)
- `ADD_STRING` / `DEL_STRING` — String connections
- `TAB` — Switch active tab
- `NB_TOG` / `NB_CLOSE` — Notebook panel toggle
- `NB_ADD` / `NB_UPD` / `NB_DEL` — Notebook entries

### Lab Items

Each item in `labItems[]`:
```js
{
  id: number,
  type: "track" | "cart" | "motionDetector" | "bubbleLevel" | "pulley" | "string" | "massHanger" | "meterStick",
  x: number,           // Canvas x position
  y: number,           // Canvas y position
  props: {
    width, height,     // Item dimensions in pixels
    inTray: boolean,   // In the bottom tray bar (not on canvas)
    isDragging: boolean,
    velocity: number,  // Horizontal velocity (px/s)
    velocityY: number, // Vertical velocity (px/s)
    onSurface: "track" | null,  // Sitting on track surface (follows track Y)
    // Type-specific:
    // track: leftFootHeight, rightFootHeight, initialTilt, friction
    // cart: mass, onTrack
    // motionDetector: direction ("right"/"left")
    // massHanger: totalMass (kg, 0.05–0.5)
    // pulley: clampedToTrack (track ID or null)
  }
}
```

### Physics Engine

**Constants:**
- `G = 9.81` (m/s²), `PX_M = 400` (pixels per meter)
- `TBL_Y = 400` (table surface Y), `FLR_Y = 560` (floor Y)
- `MU = 0.002` (default friction coefficient)

**Core functions:**
- `tilt(track)` → angle in radians from foot heights + initial random tilt
- `surfY(track, localX)` → Y position of track surface at given local X
- `findTrack(item, items)` → finds which track an item is near/on
- `step(items, dt)` → advances physics one timestep, returns updated items array
- `detReading(detector, items)` → distance to nearest object in detector's line of sight

**Physics behaviors:**
- **Cart on track:** Accelerates due to gravity component along tilt, friction opposes motion, falls off track ends immediately
- **Free bodies (everything except track):** Subject to gravity, land on table (Y=400) or floor (Y=560)
- **Track-mounted items:** Motion detector + bubble level snap to track surface on drop, follow track Y each frame via `onSurface:"track"` flag
- **Pulley:** Snaps/clamps to track ends when dropped nearby

### Canvas Rendering

The canvas is sized dynamically: `Math.max(containerWidth, 900)` × `Math.max(containerHeight, 550)`. Physics loop runs in a `useEffect` that calls `step()` then redraws everything at ~60fps.

**Drawing order:**
1. Background (light gray walls, tiled floor)
2. Table (dark epoxy surface, legs, cross brace)
3. All placed items (via `drawItem` dispatch)
4. String connections (catenary curves or pulley-routed arcs)
5. Attachment point markers (during string-picking mode)
6. Selected item highlight (blue dashed outline)
7. Push arrow (when shift+dragging cart)

**Each item type has a detailed draw function** with gradients, shadows, highlights, labels. The track has ruler markings, V-groove, end caps, threaded adjustable feet with knurled knobs. The cart has wheels with rims and axles, bumper springs, velocity flag. Etc.

### String Connection System

Strings are physical items that can be placed in the lab. When selected, a **String Connections panel** appears:

- **End A** and **End B** each have Tie/Detach buttons
- Clicking "Tie" enters **picking mode**: all attachment points glow on all items
- Click any item → popup shows its attachment points → click one to connect

**Attachment points by item type:**
- Track: left leg, right leg
- Cart: left end hole, right end hole, left wheel, right wheel
- Motion detector: around body
- Pulley: drape over (top), tie to axle (center)
- Mass hanger: tie to hook
- Bubble level: tie to center
- Meter stick: left end, center, right end

**String rendering:** Simple catenary curve between endpoints, or routed over pulley (arc over wheel) if one end uses "drape over" attachment point.

### Interaction Model

- **Click** an item to select it
- **Drag** to reposition (all items including track)
- **Shift+click+drag** cart to push (direction = drag direction)
- **Drag foot knobs** on track to adjust leveling
- **Right-click** any item for context menu (return to tray, detach strings)
- **Drag from tray** shows a ghost preview at full size

### Lab Notebook

Uses `contentEditable` div with `document.execCommand` API:
- Formatting: bold, italic, underline, font sizes, colors, bullets, numbered lists, indent/outdent
- Equation builder: clickable Greek letters + math operators, superscript/subscript modes (full alphabet), visual fraction builder
- Tables: configurable rows/cols, inserted as HTML
- Screenshots: region-select overlay captures canvas, inserts inline `<img>` that's resizable via mouse drag

### LabQuest Display

HTML overlay positioned absolutely over the canvas. Two modes:
- **Live:** Shows current distance reading from motion detector
- **Graph:** Canvas-rendered plot of position/velocity/acceleration vs time from recorded data
- Start/Stop recording buttons, graph type selector

## Known Issues & Next Steps

### Bugs / Incomplete
1. **String physics not implemented** — Strings should have fixed length once set, constrain connected items, and physically drape over pulleys rather than just visually routing
2. **String intermediate routing** — Currently only handles direct A↔B or A↔pulley↔B. Doesn't handle strings threading through multiple items
3. **Screenshot can't capture LabQuest** — The LabQuest is an HTML overlay, not part of the canvas. Would need `html2canvas` or rendering LabQuest on the canvas
4. **No connected physics** — String + pulley + hanging mass should create Atwood machine dynamics (tension, connected acceleration). Currently each item is independent
5. **Notebook image resize** — Uses a mousedown listener hack on contentEditable; could be fragile

### Feature Requests (from user)
1. String should have fixed length once tied (constrains connected items)
2. String should physically drape over pulleys via physics, not just visual routing
3. Pulley + string + mass hanger should create real connected-body physics (F=ma with tension)
4. More robust string routing through multiple intermediate attachment points

### Architectural Improvements
- The canvas uses pixel coordinates directly with hardcoded constants (`TBL_Y=400`). Consider a world-space coordinate system with camera transform
- The physics `step()` function should be extracted and made testable
- Drawing functions are large and repetitive — could use a more declarative item rendering system
- The `useEffect` render loop re-runs every frame with no dependency array (by design, but could be optimized)
- Consider using `OffscreenCanvas` or `requestAnimationFrame` more cleanly

## Equipment Data Reference

| Type | Name | Category | Default Size | Special Props |
|------|------|----------|-------------|---------------|
| track | Frictionless Track | Mechanics | 480×18 | leftFootHeight, rightFootHeight, friction, initialTilt |
| cart | Dynamics Cart | Mechanics | 48×28 | mass (0.5kg), velocity, onTrack |
| pulley | Pulley | Mechanics | 28×28 | clampedToTrack |
| string | String | Accessories | 60×6 | (connections stored in state.strings) |
| massHanger | Mass Hanger + Weights | Mechanics | 24×50 | totalMass (0.05–0.5 kg) |
| motionDetector | Motion Detector | Sensors | 32×38 | direction |
| bubbleLevel | Bubble Level | Tools | 72×14 | — |
| meterStick | Meter Stick | Tools | 400×10 | — |

## SVG Icons

Each equipment type has an inline SVG icon component (TrackIcon, CartIcon, MDIcon, LevelIcon, PulleyIcon, StringIcon, MassHangerIcon, MeterStickIcon) used in the equipment room cards and the tray bar. These use `<defs>` for gradients and are self-contained.
