import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCw, RotateCcw, Play, SkipForward, SkipBack, Home, Undo2, Redo2, Trash2 } from 'lucide-react';

const CircuitWaterGame = () => {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [grid, setGrid] = useState([]);
  const [selectedTile, setSelectedTile] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [gameState, setGameState] = useState('playing'); // playing, success, disaster
  const [flowDirections, setFlowDirections] = useState({}); // tracks flow direction for each cell
  const [waterLevels, setWaterLevels] = useState({}); // tracks water level (high/medium/low) for each cell
  const [currentFlow, setCurrentFlow] = useState({}); // tracks relative current (1 = full, 0.5 = half, etc.)
  const [directionalCurrents, setDirectionalCurrents] = useState({}); // tracks current per direction for junctions
  const [elementValues, setElementValues] = useState({}); // tracks voltage/resistance values for playground elements
  const [selectedElement, setSelectedElement] = useState(null); // currently selected element for editing
  const [playgroundMode, setPlaygroundMode] = useState('circuit'); // 'circuit' or 'water' for playground
  const [savedCircuitGrid, setSavedCircuitGrid] = useState(null); // stores circuit grid when animating water
  const [view3D, setView3D] = useState(false); // toggle 3D perspective view
  const [rotation3D, setRotation3D] = useState({ x: 50, z: 0 }); // 3D view rotation angles (x=tilt, z=spin)
  const [isDragging3D, setIsDragging3D] = useState(false); // whether user is dragging to rotate
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 }); // starting point of drag
  const [history, setHistory] = useState([]); // undo history stack
  const [redoStack, setRedoStack] = useState([]); // redo stack
  const [draggedItem, setDraggedItem] = useState(null); // { type, rotation, fromCell?: {row, col} }
  const [failureHint, setFailureHint] = useState(''); // hint message when circuit fails
  const [hoveredCell, setHoveredCell] = useState(null); // currently hovered cell for tooltip
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 }); // mouse position for tooltip
  const [cellData, setCellData] = useState({}); // stores voltage/current data per cell
  const canvasRef = useRef(null);
  const grid3DRef = useRef(null);

  const levels = [
    {
      name: "Level 1: Series Circuit",
      description: "Battery with 2 resistors in series",
      gridSize: { rows: 5, cols: 8 },
      circuit: [
        { type: 'battery', pos: [1, 1], dir: 'right' },
        { type: 'wire', pos: [2, 1], dir: 'horizontal' },
        { type: 'resistor', pos: [3, 1], dir: 'right' },
        { type: 'wire', pos: [4, 1], dir: 'horizontal' },
        { type: 'resistor', pos: [5, 1], dir: 'right' },
        { type: 'wire', pos: [6, 1], dir: 'horizontal' },
        { type: 'wire', pos: [6, 2], dir: 'vertical' },
        { type: 'wire', pos: [6, 3], dir: 'vertical' },
        { type: 'wire', pos: [5, 3], dir: 'horizontal' },
        { type: 'wire', pos: [4, 3], dir: 'horizontal' },
        { type: 'wire', pos: [3, 3], dir: 'horizontal' },
        { type: 'wire', pos: [2, 3], dir: 'horizontal' },
        { type: 'wire', pos: [1, 3], dir: 'horizontal' },
        { type: 'wire', pos: [1, 2], dir: 'vertical' },
      ],
      solution: [
        { type: 'pump', pos: [1, 1], rotation: 0 },
        { type: 'channel', pos: [2, 1], rotation: 0 },
        { type: 'waterfall', pos: [3, 1], rotation: 0 },
        { type: 'channel', pos: [4, 1], rotation: 0 },
        { type: 'waterfall', pos: [5, 1], rotation: 0 },
        { type: 'corner', pos: [6, 1], rotation: 0 },
        { type: 'channel', pos: [6, 2], rotation: 90 },
        { type: 'corner', pos: [6, 3], rotation: 90 },
        { type: 'channel', pos: [5, 3], rotation: 0 },
        { type: 'channel', pos: [4, 3], rotation: 0 },
        { type: 'channel', pos: [3, 3], rotation: 0 },
        { type: 'channel', pos: [2, 3], rotation: 0 },
        { type: 'corner', pos: [1, 3], rotation: 180 },
        { type: 'channel', pos: [1, 2], rotation: 90 },
      ]
    },
    {
      name: "Level 2: Parallel Circuit",
      description: "Battery with 2 resistors in parallel",
      gridSize: { rows: 6, cols: 8 },
      resistorsInParallel: 2, // Both resistors are in the parallel section
      circuit: [
        { type: 'battery', pos: [1, 2], dir: 'right' },
        { type: 'wire', pos: [2, 2], dir: 'horizontal' },
        { type: 'junction', pos: [3, 2], dir: 'T-right' },
        { type: 'wire', pos: [3, 1], dir: 'vertical' },
        { type: 'resistor', pos: [4, 1], dir: 'right' },
        { type: 'wire', pos: [5, 1], dir: 'horizontal' },
        { type: 'wire', pos: [3, 3], dir: 'vertical' },
        { type: 'resistor', pos: [4, 3], dir: 'right' },
        { type: 'wire', pos: [5, 3], dir: 'horizontal' },
        { type: 'junction', pos: [6, 2], dir: 'T-left' },
        { type: 'wire', pos: [6, 1], dir: 'vertical' },
        { type: 'wire', pos: [6, 3], dir: 'vertical' },
        { type: 'wire', pos: [7, 2], dir: 'horizontal' },
        { type: 'wire', pos: [1, 3], dir: 'vertical' },
        { type: 'wire', pos: [1, 4], dir: 'vertical' },
        { type: 'wire', pos: [2, 4], dir: 'horizontal' },
        { type: 'wire', pos: [3, 4], dir: 'horizontal' },
        { type: 'wire', pos: [4, 4], dir: 'horizontal' },
        { type: 'wire', pos: [5, 4], dir: 'horizontal' },
        { type: 'wire', pos: [6, 4], dir: 'horizontal' },
        { type: 'wire', pos: [7, 4], dir: 'horizontal' },
        { type: 'wire', pos: [7, 3], dir: 'vertical' },
      ],
      solution: [
        { type: 'pump', pos: [1, 2], rotation: 0 },
        { type: 'channel', pos: [2, 2], rotation: 0 },
        { type: 'junction', pos: [3, 2], rotation: 0 },
        { type: 'corner', pos: [3, 1], rotation: 270 },
        { type: 'waterfall-large', pos: [4, 1], rotation: 0 },
        { type: 'channel', pos: [5, 1], rotation: 0 },
        { type: 'corner', pos: [3, 3], rotation: 180 },
        { type: 'waterfall-large', pos: [4, 3], rotation: 0 },
        { type: 'channel', pos: [5, 3], rotation: 0 },
        { type: 'junction', pos: [6, 2], rotation: 180 },
        { type: 'corner', pos: [6, 1], rotation: 0 },
        { type: 'corner', pos: [6, 3], rotation: 90 },
        { type: 'corner', pos: [7, 2], rotation: 0 },
        { type: 'channel', pos: [1, 3], rotation: 90 },
        { type: 'corner', pos: [1, 4], rotation: 180 },
        { type: 'channel', pos: [2, 4], rotation: 0 },
        { type: 'channel', pos: [3, 4], rotation: 0 },
        { type: 'channel', pos: [4, 4], rotation: 0 },
        { type: 'channel', pos: [5, 4], rotation: 0 },
        { type: 'channel', pos: [6, 4], rotation: 0 },
        { type: 'corner', pos: [7, 4], rotation: 90 },
        { type: 'channel', pos: [7, 3], rotation: 90 },
      ]
    },
    {
      name: "Level 3: Unequal Parallel",
      description: "Parallel circuit with 1R on one branch, 2R on the other",
      gridSize: { rows: 7, cols: 8 },
      resistorsInParallel: 3, // All 3 resistors are in the parallel section
      circuit: [
        // Main circuit with battery
        { type: 'battery', pos: [1, 2], dir: 'right' },
        { type: 'wire', pos: [2, 2], dir: 'horizontal' },
        { type: 'junction', pos: [3, 2], dir: 'T-right' },
        // Top branch - 1 resistor (larger drop)
        { type: 'wire', pos: [3, 1], dir: 'vertical' },
        { type: 'resistor', pos: [4, 1], dir: 'right' },
        { type: 'wire', pos: [5, 1], dir: 'horizontal' },
        // Bottom branch - 2 resistors (smaller drops each)
        { type: 'wire', pos: [3, 3], dir: 'vertical' },
        { type: 'resistor', pos: [4, 3], dir: 'right' },
        { type: 'wire', pos: [5, 3], dir: 'horizontal' },
        { type: 'resistor', pos: [6, 3], dir: 'right' },
        { type: 'wire', pos: [7, 3], dir: 'horizontal' },
        // Merge point
        { type: 'junction', pos: [6, 2], dir: 'T-left' },
        { type: 'wire', pos: [6, 1], dir: 'vertical' },
        { type: 'wire', pos: [7, 2], dir: 'horizontal' },
        // Return path
        { type: 'wire', pos: [1, 3], dir: 'vertical' },
        { type: 'wire', pos: [1, 4], dir: 'vertical' },
        { type: 'wire', pos: [2, 4], dir: 'horizontal' },
        { type: 'wire', pos: [3, 4], dir: 'horizontal' },
        { type: 'wire', pos: [4, 4], dir: 'horizontal' },
        { type: 'wire', pos: [5, 4], dir: 'horizontal' },
        { type: 'wire', pos: [6, 4], dir: 'horizontal' },
        { type: 'wire', pos: [7, 4], dir: 'horizontal' },
        { type: 'wire', pos: [7, 3], dir: 'vertical' },
      ],
      solution: [
        { type: 'pump', pos: [1, 2], rotation: 90 },
        { type: 'channel', pos: [2, 2], rotation: 0 },
        { type: 'junction', pos: [3, 2], rotation: 0 },
        // Top branch - 1 large waterfall (full drop)
        { type: 'corner', pos: [3, 1], rotation: 270 },
        { type: 'waterfall-large', pos: [4, 1], rotation: 90 },
        { type: 'channel', pos: [5, 1], rotation: 0 },
        // Bottom branch - 2 small waterfalls (half drop each)
        { type: 'corner', pos: [3, 3], rotation: 180 },
        { type: 'waterfall', pos: [4, 3], rotation: 90 },
        { type: 'channel', pos: [5, 3], rotation: 0 },
        { type: 'waterfall', pos: [6, 3], rotation: 90 },
        { type: 'channel', pos: [7, 3], rotation: 0 },
        // Merge
        { type: 'junction', pos: [6, 2], rotation: 180 },
        { type: 'corner', pos: [6, 1], rotation: 0 },
        { type: 'corner', pos: [7, 2], rotation: 0 },
        // Return path
        { type: 'channel', pos: [1, 3], rotation: 90 },
        { type: 'corner', pos: [1, 4], rotation: 180 },
        { type: 'channel', pos: [2, 4], rotation: 0 },
        { type: 'channel', pos: [3, 4], rotation: 0 },
        { type: 'channel', pos: [4, 4], rotation: 0 },
        { type: 'channel', pos: [5, 4], rotation: 0 },
        { type: 'channel', pos: [6, 4], rotation: 0 },
        { type: 'corner', pos: [7, 4], rotation: 90 },
      ]
    },
    {
      name: "Level 4: Series-Parallel",
      description: "1R in series, then parallel branches with 1R and 2R",
      gridSize: { rows: 8, cols: 10 },
      resistorsInParallel: 3, // 3 resistors in parallel section, 1 in series
      circuit: [
        // Battery and first resistor in series
        { type: 'battery', pos: [1, 2], dir: 'right' },
        { type: 'wire', pos: [2, 2], dir: 'horizontal' },
        { type: 'resistor', pos: [3, 2], dir: 'right' },
        { type: 'wire', pos: [4, 2], dir: 'horizontal' },
        // Split junction
        { type: 'junction', pos: [5, 2], dir: 'T-right' },
        // Top branch - 1 resistor
        { type: 'wire', pos: [5, 1], dir: 'vertical' },
        { type: 'resistor', pos: [6, 1], dir: 'right' },
        { type: 'wire', pos: [7, 1], dir: 'horizontal' },
        // Bottom branch - 2 resistors
        { type: 'wire', pos: [5, 3], dir: 'vertical' },
        { type: 'resistor', pos: [6, 3], dir: 'right' },
        { type: 'wire', pos: [7, 3], dir: 'horizontal' },
        { type: 'resistor', pos: [8, 3], dir: 'right' },
        { type: 'wire', pos: [9, 3], dir: 'horizontal' },
        // Merge junction
        { type: 'junction', pos: [8, 2], dir: 'T-left' },
        { type: 'wire', pos: [8, 1], dir: 'vertical' },
        { type: 'wire', pos: [9, 2], dir: 'horizontal' },
        // Return path
        { type: 'wire', pos: [1, 3], dir: 'vertical' },
        { type: 'wire', pos: [1, 4], dir: 'vertical' },
        { type: 'wire', pos: [1, 5], dir: 'vertical' },
        { type: 'wire', pos: [2, 5], dir: 'horizontal' },
        { type: 'wire', pos: [3, 5], dir: 'horizontal' },
        { type: 'wire', pos: [4, 5], dir: 'horizontal' },
        { type: 'wire', pos: [5, 5], dir: 'horizontal' },
        { type: 'wire', pos: [6, 5], dir: 'horizontal' },
        { type: 'wire', pos: [7, 5], dir: 'horizontal' },
        { type: 'wire', pos: [8, 5], dir: 'horizontal' },
        { type: 'wire', pos: [9, 5], dir: 'horizontal' },
        { type: 'wire', pos: [9, 4], dir: 'vertical' },
        { type: 'wire', pos: [9, 3], dir: 'vertical' },
      ],
      solution: [
        { type: 'pump', pos: [1, 2], rotation: 90 },
        { type: 'channel', pos: [2, 2], rotation: 0 },
        // First resistor - small waterfall (drops 2 levels: high→medium)
        { type: 'waterfall', pos: [3, 2], rotation: 90 },
        { type: 'channel', pos: [4, 2], rotation: 0 },
        // Split
        { type: 'junction', pos: [5, 2], rotation: 0 },
        // Top branch - 1 small waterfall (drops 2 levels: medium→low)
        { type: 'corner', pos: [5, 1], rotation: 270 },
        { type: 'waterfall', pos: [6, 1], rotation: 90 },
        { type: 'channel', pos: [7, 1], rotation: 0 },
        // Bottom branch - 2 tiny waterfalls (each drops 1 level: medium→medium-low→low)
        { type: 'corner', pos: [5, 3], rotation: 180 },
        { type: 'waterfall-tiny', pos: [6, 3], rotation: 90 },
        { type: 'channel', pos: [7, 3], rotation: 0 },
        { type: 'waterfall-tiny', pos: [8, 3], rotation: 90 },
        { type: 'channel', pos: [9, 3], rotation: 0 },
        // Merge
        { type: 'junction', pos: [8, 2], rotation: 180 },
        { type: 'corner', pos: [8, 1], rotation: 0 },
        { type: 'corner', pos: [9, 2], rotation: 0 },
        // Return path
        { type: 'channel', pos: [1, 3], rotation: 90 },
        { type: 'channel', pos: [1, 4], rotation: 90 },
        { type: 'corner', pos: [1, 5], rotation: 180 },
        { type: 'channel', pos: [2, 5], rotation: 0 },
        { type: 'channel', pos: [3, 5], rotation: 0 },
        { type: 'channel', pos: [4, 5], rotation: 0 },
        { type: 'channel', pos: [5, 5], rotation: 0 },
        { type: 'channel', pos: [6, 5], rotation: 0 },
        { type: 'channel', pos: [7, 5], rotation: 0 },
        { type: 'channel', pos: [8, 5], rotation: 0 },
        { type: 'corner', pos: [9, 5], rotation: 90 },
        { type: 'channel', pos: [9, 4], rotation: 90 },
      ]
    },
    {
      name: "Circuit Playground",
      description: "Build your own circuit and see the water flow equivalent!",
      gridSize: { rows: 8, cols: 10 },
      isPlayground: true,
      circuit: [], // Empty - user builds their own
      solution: [] // No predefined solution
    }
  ];

  // Circuit element types for playground mode
  const circuitTileTypes = [
    { type: 'c-battery', label: 'Battery', defaultValue: 10, unit: 'V' },
    { type: 'c-resistor', label: 'Resistor', defaultValue: 100, unit: 'Ω' },
    { type: 'c-wire', label: 'Wire' },
    { type: 'c-corner', label: 'Corner' },
    { type: 'c-junction', label: 'Junction' },
  ];

  const tileTypes = [
    { type: 'channel', label: 'Channel', count: 20 },
    { type: 'corner', label: 'Corner', count: 15 },
    { type: 'pump', label: 'Pump', sublabel: 'Height: 1', count: 5 },
    { type: 'waterfall-tiny', label: 'Tiny Drop', sublabel: 'Height: ¼', count: 8 },
    { type: 'waterfall', label: 'Small Drop', sublabel: 'Height: ½', count: 8 },
    { type: 'waterfall-large', label: 'Large Drop', sublabel: 'Height: 1', count: 8 },
    { type: 'junction', label: '3-Way Junction', count: 4 },
  ];

  useEffect(() => {
    const level = levels[currentLevel];
    const newGrid = Array(level.gridSize.rows).fill(null).map(() =>
      Array(level.gridSize.cols).fill(null)
    );
    setGrid(newGrid);
    setGameState('playing');
    setIsAnimating(false);
    // Reset history stacks
    setHistory([]);
    setRedoStack([]);
    // Reset playground state
    if (level.isPlayground) {
      setPlaygroundMode('circuit');
      setElementValues({});
      setSelectedElement(null);
    }
  }, [currentLevel]);

  // Save current state to history before making changes
  const saveToHistory = useCallback(() => {
    setHistory(prev => [...prev, grid.map(row => row.map(cell => cell ? { ...cell } : null))]);
    setRedoStack([]); // Clear redo stack when new action is taken
  }, [grid]);

  // Undo last action
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;

    const newHistory = [...history];
    const previousGrid = newHistory.pop();

    // Save current state to redo stack
    setRedoStack(prev => [...prev, grid.map(row => row.map(cell => cell ? { ...cell } : null))]);
    setHistory(newHistory);
    setGrid(previousGrid);
    setSelectedElement(null);
  }, [history, grid]);

  // Redo last undone action
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;

    const newRedoStack = [...redoStack];
    const nextGrid = newRedoStack.pop();

    // Save current state to history
    setHistory(prev => [...prev, grid.map(row => row.map(cell => cell ? { ...cell } : null))]);
    setRedoStack(newRedoStack);
    setGrid(nextGrid);
    setSelectedElement(null);
  }, [redoStack, grid]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const level = levels[currentLevel];
      const isPlaygroundCircuit = level.isPlayground && playgroundMode === 'circuit';

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
        return;
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Delete selected element
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElement) {
          e.preventDefault();
          const [row, col] = selectedElement.split(',').map(Number);
          saveToHistory();
          const newGrid = grid.map(r => r.map(c => c ? { ...c } : null));
          newGrid[row][col] = null;
          setGrid(newGrid);
          setSelectedElement(null);
        }
        return;
      }

      // Rotation shortcuts
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        if (e.shiftKey) {
          setRotation((rotation + 270) % 360); // Counter-clockwise
        } else {
          setRotation((rotation + 90) % 360); // Clockwise
        }
        return;
      }
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        setRotation((rotation + 270) % 360); // Counter-clockwise
        return;
      }

      // Escape to deselect
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedTile(null);
        setSelectedElement(null);
        return;
      }

      // D for eraser/delete mode
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        setSelectedTile('eraser');
        setSelectedElement(null);
        return;
      }

      // S for select mode (playground only)
      if ((e.key === 's' || e.key === 'S') && isPlaygroundCircuit) {
        e.preventDefault();
        setSelectedTile(null);
        setSelectedElement(null);
        return;
      }

      // Number keys 1-5 for circuit elements (playground circuit mode)
      // Number keys 1-7 for water tiles (regular levels)
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (isPlaygroundCircuit) {
          // Circuit elements: 1=Battery, 2=Resistor, 3=Wire, 4=Corner, 5=Junction
          if (index < circuitTileTypes.length) {
            setSelectedTile(circuitTileTypes[index].type);
            setSelectedElement(null);
          }
        } else if (!level.isPlayground) {
          // Water tiles: 1=Channel, 2=Corner, 3=Pump, 4=Tiny, 5=Small, 6=Large, 7=Junction
          if (index < tileTypes.length) {
            setSelectedTile(tileTypes[index].type);
          }
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, selectedElement, grid, saveToHistory, currentLevel, playgroundMode, rotation]);

  // Drag and drop handlers
  const handleDragStart = useCallback((e, type, fromCell = null) => {
    setDraggedItem({ type, rotation, fromCell });
    e.dataTransfer.effectAllowed = 'move';

    // Create a smaller drag image matching grid cell size (48x48)
    const dragImage = document.createElement('div');
    dragImage.style.width = '48px';
    dragImage.style.height = '48px';
    dragImage.style.backgroundColor = '#334155';
    dragImage.style.border = '2px solid #fbbf24';
    dragImage.style.borderRadius = '4px';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    dragImage.style.display = 'flex';
    dragImage.style.alignItems = 'center';
    dragImage.style.justifyContent = 'center';
    dragImage.style.fontSize = '20px';

    // Add a simple icon based on type
    const icons = {
      'c-battery': '🔋', 'c-resistor': '⚡', 'c-wire': '─', 'c-corner': '┐', 'c-junction': '┬',
      'channel': '═', 'corner': '╗', 'pump': '⬆', 'waterfall': '💧', 'waterfall-tiny': '·',
      'waterfall-large': '💧', 'junction': '╦'
    };
    dragImage.textContent = icons[type] || '▪';

    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 24, 24);

    // Clean up after drag starts
    setTimeout(() => document.body.removeChild(dragImage), 0);
  }, [rotation]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e, row, col) => {
    e.preventDefault();
    if (!draggedItem || isAnimating) return;

    const level = levels[currentLevel];
    const cellKey = `${row},${col}`;

    saveToHistory();
    const newGrid = grid.map(r => r.map(c => c ? { ...c } : null));

    // If dragging from another cell, clear the source cell
    if (draggedItem.fromCell) {
      const { row: fromRow, col: fromCol } = draggedItem.fromCell;
      const fromKey = `${fromRow},${fromCol}`;

      // Move element values if it's a battery/resistor
      if (elementValues[fromKey] !== undefined) {
        setElementValues(prev => {
          const newValues = { ...prev };
          newValues[cellKey] = newValues[fromKey];
          delete newValues[fromKey];
          return newValues;
        });
      }

      newGrid[fromRow][fromCol] = null;
    } else {
      // Dragging from palette - set default values for circuit elements
      if (level.isPlayground && (draggedItem.type === 'c-battery' || draggedItem.type === 'c-resistor')) {
        const tileInfo = circuitTileTypes.find(t => t.type === draggedItem.type);
        setElementValues(prev => ({
          ...prev,
          [cellKey]: tileInfo?.defaultValue || (draggedItem.type === 'c-battery' ? 10 : 100)
        }));
      }
    }

    // Place the element at the drop location
    newGrid[row][col] = {
      type: draggedItem.type,
      rotation: draggedItem.rotation
    };

    setGrid(newGrid);
    setDraggedItem(null);
  }, [draggedItem, isAnimating, currentLevel, grid, saveToHistory, elementValues]);

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
  }, []);

  // 3D view rotation handlers
  const handle3DMouseDown = useCallback((e) => {
    if (!view3D) return;
    setIsDragging3D(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [view3D]);

  const handle3DMouseMove = useCallback((e) => {
    if (!isDragging3D) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    setRotation3D(prev => ({
      x: Math.max(20, Math.min(90, prev.x - deltaY * 0.5)), // Clamp X rotation (tilt forward/back) 20° to 90°
      z: prev.z - deltaX * 0.5 // Full Z rotation (spin like a record) - no limits
    }));
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging3D, dragStart]);

  const handle3DMouseUp = useCallback(() => {
    setIsDragging3D(false);
  }, []);

  // Calculate preview water heights for 3D view during building
  const calculatePreviewWaterHeights = useCallback(() => {
    const level = levels[currentLevel];
    if (level.isPlayground) return; // Skip for playground

    // Find pump position
    let pumpPos = null;
    let pumpRotation = 0;
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row]?.length; col++) {
        if (grid[row]?.[col]?.type === 'pump') {
          pumpPos = { row, col };
          pumpRotation = grid[row][col].rotation || 0;
          break;
        }
      }
      if (pumpPos) break;
    }

    if (!pumpPos) {
      setWaterLevels({});
      setFlowDirections({});
      return;
    }

    // Water height mappings
    const waterHeights = {};  // Output heights (after any drop)
    const inputHeights = {};  // Input heights (before any drop)
    const flowDirs = {};
    const numToLevel = { 4: 'high', 3: 'medium-high', 2: 'medium', 1: 'medium-low', 0: 'low' };

    // Waterfall drop amounts
    const waterfallDrops = {
      'waterfall-tiny': 1,
      'waterfall': 2,
      'waterfall-large': 4
    };

    // Get pump output direction
    const pumpOutputDirs = { 0: [-1, 0], 90: [0, 1], 180: [1, 0], 270: [0, -1] };
    const pumpOutputDir = pumpOutputDirs[pumpRotation] || [0, 1];

    // BFS to trace water heights
    const pumpKey = `${pumpPos.row},${pumpPos.col}`;
    waterHeights[pumpKey] = 'high';
    inputHeights[pumpKey] = 'low'; // Pump input is low (return from circuit)
    flowDirs[pumpKey] = [pumpOutputDir];

    const visited = new Set([pumpKey]);
    const queue = [[pumpPos.row, pumpPos.col, 4, pumpOutputDir]]; // [row, col, level (0-4), direction]

    while (queue.length > 0) {
      const [row, col, currentLevel, currentDir] = queue.shift();
      const cell = grid[row]?.[col];
      if (!cell) continue;

      // Get connections for this cell
      const connections = getConnections(cell.type, cell.rotation, row, col);

      for (const [nRow, nCol] of connections) {
        const nKey = `${nRow},${nCol}`;
        if (visited.has(nKey)) continue;

        const neighbor = grid[nRow]?.[nCol];
        if (!neighbor) continue;

        // Check if neighbor connects back
        const neighborConns = getConnections(neighbor.type, neighbor.rotation, nRow, nCol);
        const connectsBack = neighborConns.some(([r, c]) => r === row && c === col);
        if (!connectsBack) continue;

        visited.add(nKey);

        // Input level is the current level (what's coming in)
        // Allow negative levels to show errors
        const inputLevelName = currentLevel >= 4 ? 'high' :
                               currentLevel >= 3 ? 'medium-high' :
                               currentLevel >= 2 ? 'medium' :
                               currentLevel >= 1 ? 'medium-low' :
                               currentLevel >= 0 ? 'low' : 'below'; // negative = error
        inputHeights[nKey] = inputLevelName;

        // Calculate output level based on neighbor type (after any drop)
        // Don't clamp - allow negative to show errors
        let outputLevel = currentLevel;
        if (waterfallDrops[neighbor.type]) {
          outputLevel = currentLevel - waterfallDrops[neighbor.type];
        }

        const outputLevelName = outputLevel >= 4 ? 'high' :
                                outputLevel >= 3 ? 'medium-high' :
                                outputLevel >= 2 ? 'medium' :
                                outputLevel >= 1 ? 'medium-low' :
                                outputLevel >= 0 ? 'low' : 'below'; // negative = error
        waterHeights[nKey] = outputLevelName;

        // Calculate flow direction (direction we traveled to reach this cell)
        const flowDir = [nRow - row, nCol - col];
        flowDirs[nKey] = [flowDir];

        queue.push([nRow, nCol, outputLevel, flowDir]);
      }
    }

    setWaterLevels({ levels: waterHeights, inputLevels: inputHeights });
    setFlowDirections(flowDirs);
  }, [grid, currentLevel]);

  // Toggle 3D view (keep current rotation)
  const toggle3DView = useCallback(() => {
    if (!view3D && !isAnimating) {
      // When enabling 3D preview during building, calculate water heights
      calculatePreviewWaterHeights();
    }
    setView3D(!view3D);
  }, [view3D, isAnimating, calculatePreviewWaterHeights]);

  // Reset rotation to default
  const reset3DRotation = useCallback(() => {
    setRotation3D({ x: 50, z: 0 });
  }, []);

  // Recalculate preview water heights when grid changes in 3D view (not animating)
  useEffect(() => {
    if (view3D && !isAnimating) {
      calculatePreviewWaterHeights();
    }
  }, [grid, view3D, isAnimating, calculatePreviewWaterHeights]);

  const handleCellClick = (row, col) => {
    const level = levels[currentLevel];
    const cellKey = `${row},${col}`;

    // Handle eraser mode
    if (selectedTile === 'eraser') {
      if (grid[row]?.[col]) {
        saveToHistory();
        const newGrid = grid.map(r => r.map(c => c ? { ...c } : null));
        newGrid[row][col] = null;
        setGrid(newGrid);
        // Remove element values if it was a circuit element
        if (elementValues[cellKey]) {
          setElementValues(prev => {
            const newValues = { ...prev };
            delete newValues[cellKey];
            return newValues;
          });
        }
      }
      return;
    }

    // In playground mode, clicking an existing element selects it for editing
    if (level.isPlayground && grid[row]?.[col] && !selectedTile) {
      const cell = grid[row][col];
      if (cell.type === 'c-battery' || cell.type === 'c-resistor') {
        setSelectedElement(cellKey);
        return;
      }
    }

    if (!selectedTile || isAnimating) return;

    // Save to history before making changes
    saveToHistory();

    const newGrid = grid.map(r => r.map(c => c ? { ...c } : null));
    newGrid[row][col] = {
      type: selectedTile,
      rotation: rotation
    };
    setGrid(newGrid);

    // Set default values for circuit elements
    if (level.isPlayground && (selectedTile === 'c-battery' || selectedTile === 'c-resistor')) {
      const tileInfo = circuitTileTypes.find(t => t.type === selectedTile);
      setElementValues(prev => ({
        ...prev,
        [cellKey]: tileInfo?.defaultValue || (selectedTile === 'c-battery' ? 10 : 100)
      }));
    }
  };

  const handleRotate = () => {
    setRotation((rotation + 90) % 360);
  };

  const handleRotateCounterClockwise = () => {
    setRotation((rotation + 270) % 360); // +270 is same as -90
  };

  // Helper function to get connections for any tile type
  const getConnections = (type, rotation, row, col) => {
    const connections = [];
    
    if (type === 'channel') {
      if (rotation === 0 || rotation === 180) {
        connections.push([row, col - 1], [row, col + 1]); // horizontal
      } else {
        connections.push([row - 1, col], [row + 1, col]); // vertical
      }
    } else if (type === 'corner') {
      // Corner base shape (rotation 0): L with bars extending RIGHT and DOWN from center
      // CSS transform rotates clockwise:
      // rotation 0°: RIGHT [0,1] and DOWN [1,0]
      // rotation 90°: DOWN [1,0] and LEFT [0,-1]
      // rotation 180°: LEFT [0,-1] and UP [-1,0]
      // rotation 270°: UP [-1,0] and RIGHT [0,1]
      if (rotation === 0) {
        connections.push([row, col + 1], [row + 1, col]); // right and down
      } else if (rotation === 90) {
        connections.push([row + 1, col], [row, col - 1]); // down and left
      } else if (rotation === 180) {
        connections.push([row, col - 1], [row - 1, col]); // left and up
      } else { // 270
        connections.push([row - 1, col], [row, col + 1]); // up and right
      }
    } else if (type === 'junction') {
      // Junction connects three directions (T-shape)
      // rotation 0: left, right, down (T pointing down)
      // rotation 90: up, down, left (⊢ pointing left)
      // rotation 180: left, right, up (T pointing up)
      // rotation 270: up, down, right (⊣ pointing right)
      if (rotation === 0) {
        connections.push([row, col - 1], [row, col + 1], [row + 1, col]);
      } else if (rotation === 90) {
        connections.push([row - 1, col], [row + 1, col], [row, col - 1]);
      } else if (rotation === 180) {
        connections.push([row, col - 1], [row, col + 1], [row - 1, col]);
      } else { // 270
        connections.push([row - 1, col], [row + 1, col], [row, col + 1]);
      }
    } else if (type === 'pump' || type === 'waterfall' || type === 'waterfall-large' || type === 'waterfall-tiny' || type === 'waterfall-scaled') {
      // Pump and waterfalls show direction but connect bidirectionally
      // rotation 0 (arrow up/down): connects vertically (up and down)
      // rotation 90 (arrow right/left): connects horizontally (left and right)
      if (rotation === 90 || rotation === 270) {
        connections.push([row, col - 1], [row, col + 1]); // horizontal
      } else { // 0 or 180
        connections.push([row - 1, col], [row + 1, col]); // vertical
      }
    }
    
    return connections;
  };

  const checkSolution = () => {
    const level = levels[currentLevel];

    // Count components by type
    const countComponents = (gridToCheck) => {
      const counts = { pump: 0, 'waterfall-tiny': 0, waterfall: 0, 'waterfall-large': 0, channel: 0, corner: 0, junction: 0 };
      for (let row = 0; row < gridToCheck.length; row++) {
        for (let col = 0; col < gridToCheck[row].length; col++) {
          const cell = gridToCheck[row][col];
          if (cell && cell.type) {
            counts[cell.type]++;
          }
        }
      }
      return counts;
    };

    // Gather all player cells first
    const playerCells = [];
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        if (grid[row][col]) {
          playerCells.push([row, col]);
        }
      }
    }

    if (playerCells.length === 0) {
      setFailureHint('Place some tiles on the grid to build the water circuit.');
      return false;
    }

    // FIRST CHECK: Is the circuit complete/closed? (No unconnected pipe ends)
    // Every connection point on each tile must connect to a valid neighbor
    for (const [row, col] of playerCells) {
      const cell = grid[row][col];
      const connections = getConnections(cell.type, cell.rotation, row, col);

      for (const [nRow, nCol] of connections) {
        // Check if the connection goes out of bounds
        if (nRow < 0 || nRow >= grid.length || nCol < 0 || nCol >= grid[0].length) {
          setFailureHint('Circuit is not closed. Some pipes lead off the edge of the grid.');
          return false;
        }

        // Check if there's a neighbor at the connection point
        const neighbor = grid[nRow][nCol];
        if (!neighbor) {
          setFailureHint('Circuit is not closed. Make sure all pipe ends connect to another tile.');
          return false;
        }

        // Check if the neighbor connects back to this tile
        const neighborConnections = getConnections(neighbor.type, neighbor.rotation, nRow, nCol);
        const connectsBack = neighborConnections.some(([r, c]) => r === row && c === col);
        if (!connectsBack) {
          setFailureHint('Circuit is not closed. Check that tiles are rotated correctly so their openings align.');
          return false;
        }
      }
    }

    // SECOND CHECK: Do we have the right number of CRITICAL components (voltage drops)?
    const playerCounts = countComponents(grid);
    const solutionCounts = { pump: 0, 'waterfall-tiny': 0, waterfall: 0, 'waterfall-large': 0, channel: 0, corner: 0, junction: 0 };

    for (let sol of level.solution) {
      solutionCounts[sol.type]++;
    }

    // Validate critical components: pumps, waterfalls, and junctions
    const criticalComponents = ['pump', 'waterfall-tiny', 'waterfall', 'waterfall-large', 'junction'];
    const componentNames = {
      'pump': 'Pump',
      'waterfall-tiny': 'Tiny Drop',
      'waterfall': 'Small Drop',
      'waterfall-large': 'Large Drop',
      'junction': 'Junction'
    };

    for (let type of criticalComponents) {
      if (playerCounts[type] !== solutionCounts[type]) {
        const diff = solutionCounts[type] - playerCounts[type];
        if (diff > 0) {
          setFailureHint(`Need ${diff} more ${componentNames[type]}${diff > 1 ? 's' : ''}. You have ${playerCounts[type]}, need ${solutionCounts[type]}.`);
        } else {
          setFailureHint(`Too many ${componentNames[type]}s. You have ${playerCounts[type]}, need ${solutionCounts[type]}.`);
        }
        return false;
      }
    }

    // THIRD CHECK: Verify all tiles are connected (no isolated pieces)
    // BFS to check connectivity
    const visited = new Set();
    const queue = [playerCells[0]];
    visited.add(`${playerCells[0][0]},${playerCells[0][1]}`);

    while (queue.length > 0) {
      const [row, col] = queue.shift();
      const cell = grid[row][col];
      const connections = getConnections(cell.type, cell.rotation, row, col);

      for (let [nRow, nCol] of connections) {
        const key = `${nRow},${nCol}`;
        if (nRow >= 0 && nRow < grid.length && nCol >= 0 && nCol < grid[0].length) {
          const neighbor = grid[nRow][nCol];
          if (neighbor && !visited.has(key)) {
            const neighborConnections = getConnections(neighbor.type, neighbor.rotation, nRow, nCol);
            const connectsBack = neighborConnections.some(([r, c]) => r === row && c === col);
            if (connectsBack) {
              visited.add(key);
              queue.push([nRow, nCol]);
            }
          }
        }
      }
    }

    // All tiles should be connected
    if (visited.size !== playerCells.length) {
      const disconnected = playerCells.length - visited.size;
      setFailureHint(`${disconnected} tile${disconnected > 1 ? 's are' : ' is'} not connected. Check rotations and make sure all pieces connect.`);
      return false;
    }

    // Third check: Physics validation - for parallel circuits, branches must have equal voltage drops
    // Find pump and junctions
    let pumpPos = null;
    const junctionPositions = [];

    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const cell = grid[row][col];
        if (cell?.type === 'pump') pumpPos = { row, col };
        if (cell?.type === 'junction') junctionPositions.push({ row, col });
      }
    }

    // If we have junctions, validate parallel branches have equal voltage drops
    if (junctionPositions.length >= 2) {
      // Waterfall voltage values
      const waterfallValues = {
        'waterfall-tiny': 1,
        'waterfall': 2,
        'waterfall-large': 4
      };

      // Track all waterfalls found in parallel branches
      const waterfallsInParallelBranches = new Set();

      // Find branches between junctions and calculate voltage drops
      // Excludes paths that go through the pump (those are return paths, not parallel branches)
      const traceBranchDrop = (startRow, startCol, fromRow, fromCol, targetJunctions) => {
        let totalDrop = 0;
        let currentRow = startRow;
        let currentCol = startCol;
        let prevRow = fromRow;
        let prevCol = fromCol;
        const visited = new Set();
        const waterfallsInThisBranch = [];
        visited.add(`${fromRow},${fromCol}`);

        while (true) {
          const key = `${currentRow},${currentCol}`;
          if (visited.has(key)) break;
          visited.add(key);

          const cell = grid[currentRow]?.[currentCol];
          if (!cell) break;

          // If we hit a pump, this is the return path - not a parallel branch
          if (cell.type === 'pump') {
            return null;
          }

          // Check if we reached a target junction
          if (cell.type === 'junction' && targetJunctions.some(j => j.row === currentRow && j.col === currentCol)) {
            // Mark all waterfalls in this branch as valid
            waterfallsInThisBranch.forEach(wf => waterfallsInParallelBranches.add(wf));
            return { drop: totalDrop, reachedKey: `${currentRow},${currentCol}` };
          }

          // Add voltage drop for waterfalls
          if (waterfallValues[cell.type]) {
            totalDrop += waterfallValues[cell.type];
            waterfallsInThisBranch.push(key);
          }

          // Find next cell
          const connections = getConnections(cell.type, cell.rotation, currentRow, currentCol);
          let foundNext = false;
          for (const [nRow, nCol] of connections) {
            if (nRow === prevRow && nCol === prevCol) continue;
            const neighbor = grid[nRow]?.[nCol];
            if (neighbor) {
              const neighborConns = getConnections(neighbor.type, neighbor.rotation, nRow, nCol);
              if (neighborConns.some(([r, c]) => r === currentRow && c === currentCol)) {
                prevRow = currentRow;
                prevCol = currentCol;
                currentRow = nRow;
                currentCol = nCol;
                foundNext = true;
                break;
              }
            }
          }
          if (!foundNext) break;
        }
        return null;
      };

      // For each junction, find branches grouped by destination junction
      for (const junction of junctionPositions) {
        const junctionCell = grid[junction.row][junction.col];
        const connections = getConnections(junctionCell.type, junctionCell.rotation, junction.row, junction.col);
        const junctionKey = `${junction.row},${junction.col}`;

        // Group branches by their destination junction
        const branchesByDestination = {}; // destinationKey -> [drops]

        for (const [nRow, nCol] of connections) {
          const neighbor = grid[nRow]?.[nCol];
          if (neighbor) {
            const result = traceBranchDrop(nRow, nCol, junction.row, junction.col, junctionPositions.filter(j => j.row !== junction.row || j.col !== junction.col));
            if (result) {
              if (!branchesByDestination[result.reachedKey]) {
                branchesByDestination[result.reachedKey] = [];
              }
              branchesByDestination[result.reachedKey].push(result.drop);
            }
          }
        }

        // Check each destination - if multiple branches go to the SAME junction, they must have equal drops
        for (const [destKey, drops] of Object.entries(branchesByDestination)) {
          if (drops.length >= 2) {
            const uniqueDrops = [...new Set(drops)];
            if (uniqueDrops.length > 1) {
              setFailureHint(`Parallel branches must have equal voltage drops! Found drops of ${drops.join(' and ')} units. In parallel circuits, each path needs the same total drop.`);
              return false;
            }
          }
        }
      }

      // Check that the correct number of waterfalls are in parallel branches
      // (some levels have resistors in series, which is OK)
      if (level.resistorsInParallel !== undefined) {
        const waterfallsInParallelCount = waterfallsInParallelBranches.size;
        if (waterfallsInParallelCount !== level.resistorsInParallel) {
          setFailureHint(`Wrong number of waterfalls in parallel section! Expected ${level.resistorsInParallel} between the junctions, found ${waterfallsInParallelCount}. Check where voltage drops should occur in the circuit.`);
          return false;
        }
      }
    }

    // If we have the right components, they're connected, and physics is valid - it's correct!
    return true;
  };

  const handleAnimate = () => {
    const level = levels[currentLevel];

    if (isAnimating) {
      // Stop animation
      setIsAnimating(false);
      setView3D(false);
      setGameState('playing');
      // For playground, switch back to circuit mode and restore the circuit grid
      if (level.isPlayground && savedCircuitGrid) {
        setPlaygroundMode('circuit');
        setGrid(savedCircuitGrid);
        setSavedCircuitGrid(null);
      }
      return;
    }

    // For playground mode, use the special analyzer
    if (level.isPlayground) {
      analyzeAndAnimatePlayground();
      return;
    }

    const isCorrect = checkSolution();

    if (isCorrect) {
      // Calculate flow directions before starting animation
      calculateFlowDirections();
      setFailureHint('');
      setGameState('success');
      setIsAnimating(true);
      setView3D(true); // Enable 3D view when animating successfully
      // Animation continues indefinitely until stopped
    } else {
      setGameState('disaster');
      // Don't auto-clear - let user dismiss with X button
    }
  };

  const calculateFlowDirections = () => {
    // Find the pump and determine flow direction from its output
    let pumpCell = null;
    let pumpRow = -1, pumpCol = -1;
    
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        if (grid[row][col]?.type === 'pump') {
          pumpCell = grid[row][col];
          pumpRow = row;
          pumpCol = col;
          break;
        }
      }
      if (pumpCell) break;
    }
    
    if (!pumpCell) return;

    // Determine pump output direction based on rotation
    // rotation 0 (arrow up): output is UP [-1, 0]
    // rotation 90 (arrow right): output is RIGHT [0, 1]
    // rotation 180 (arrow down): output is DOWN [1, 0]
    // rotation 270 (arrow left): output is LEFT [0, -1]
    let outputDir;
    if (pumpCell.rotation === 0) outputDir = [-1, 0];
    else if (pumpCell.rotation === 90) outputDir = [0, 1];
    else if (pumpCell.rotation === 180) outputDir = [1, 0];
    else outputDir = [0, -1];
    
    const directionName = (dir) => {
      if (dir[0] === -1) return 'UP';
      if (dir[0] === 1) return 'DOWN';
      if (dir[1] === -1) return 'LEFT';
      if (dir[1] === 1) return 'RIGHT';
      return 'UNKNOWN';
    };
    
    // Trace the circuit from pump output
    // For junctions, we need to track ALL flows, so use arrays
    const directions = {};

    // Track all junctions encountered for second-pass processing
    const junctionsEncountered = []; // Track junctions: [{key, row, col, rotation}, ...]

    // Track which directions we've EXITED from each cell
    // If we later try to ENTER from a direction we've already exited, that's reverse flow
    const exitedDirections = {}; // key -> array of [row_delta, col_delta] exit directions
    
    // =================================================================
    // TRACE FUNCTION: Recursively follows the circuit path from the pump
    // =================================================================
    // This function walks through the circuit grid starting from the pump output,
    // following connections from cell to cell, and stores the ENTRY DIRECTION
    // for each cell in the 'directions' object.
    //
    // JUNCTION HANDLING: When we reach a junction from a new direction, we need to
    // trace ALL exit paths, not just one. This ensures that downstream junctions
    // discover all their inflows.
    //
    // Example: In a parallel circuit with two junctions:
    //   1. First visit to Junction A: trace one branch to Junction B
    //   2. Later, arrive at Junction A from different direction: trace the OTHER branch
    //   3. Now Junction B correctly knows it has 2 inflows
    //
    // Parameters:
    //   row, col: Current cell position in the grid
    //   entryDir: Direction we TRAVELED to reach this cell [row_delta, col_delta]
    //
    // Direction encoding:
    //   [-1, 0] = moved UP (row decreased)
    //   [1, 0]  = moved DOWN (row increased)
    //   [0, -1] = moved LEFT (col decreased)
    //   [0, 1]  = moved RIGHT (col increased)
    const trace = (row, col, entryDir, depth = 0) => {
      const key = `${row},${col}`;
      const cell = grid[row][col];
      if (!cell) return;

      // If we've reached a pump (not the starting pump), STOP tracing
      if (cell.type === 'pump' && depth > 0) {
        if (!directions[key]) directions[key] = [];
        directions[key].push(entryDir);
        return;
      }

      if (!directions[key]) directions[key] = [];

      // Check if we've already recorded this specific entry direction
      const alreadyHasThisDirection = directions[key].some(
        dir => dir[0] === entryDir[0] && dir[1] === entryDir[1]
      );
      if (alreadyHasThisDirection) return;

      // Check for reverse flow
      if (exitedDirections[key]) {
        const isReverseFlow = exitedDirections[key].some(
          exitDir => exitDir[0] === -entryDir[0] && exitDir[1] === -entryDir[1]
        );
        if (isReverseFlow) return;
      }

      directions[key].push(entryDir);

      // Track junctions for second-pass processing
      if (cell.type === 'junction') {
        if (!junctionsEncountered.some(j => j.key === key)) {
          junctionsEncountered.push({ key, row, col, rotation: cell.rotation });
        }
      }

      const connections = getConnections(cell.type, cell.rotation, row, col);

      // For junctions, determine if this is a split or merge based on entry direction
      // Junction stem directions by rotation:
      // rotation 0: stem points DOWN [1, 0]
      // rotation 90: stem points LEFT [0, -1]
      // rotation 180: stem points UP [-1, 0]
      // rotation 270: stem points RIGHT [0, 1]
      let junctionStemDir = null;
      let isJunctionMerge = false;
      if (cell.type === 'junction') {
        if (cell.rotation === 0) junctionStemDir = [1, 0];
        else if (cell.rotation === 90) junctionStemDir = [0, -1];
        else if (cell.rotation === 180) junctionStemDir = [-1, 0];
        else junctionStemDir = [0, 1];

        // entryDir is the direction we TRAVELED to get here.
        // If stem points DOWN [1,0] and we came FROM the stem (below), we traveled UP [-1,0].
        // So cameFromStem = (entryDir == -stemDir)
        const cameFromStem = (entryDir[0] === -junctionStemDir[0] && entryDir[1] === -junctionStemDir[1]);
        isJunctionMerge = !cameFromStem;
      }

      // Find all valid exits
      const exitsToTrace = [];
      for (let [nRow, nCol] of connections) {
        const reverseDir = [row - nRow, col - nCol];
        if (!(reverseDir[0] === entryDir[0] && reverseDir[1] === entryDir[1])) {
          const exitDir = [nRow - row, nCol - col];

          // For merge junctions, only exit through the stem
          if (isJunctionMerge && junctionStemDir) {
            const isExitToStem = (exitDir[0] === junctionStemDir[0] && exitDir[1] === junctionStemDir[1]);
            if (!isExitToStem) continue; // Skip non-stem exits for merge junctions
          }

          const neighborKey = `${nRow},${nCol}`;
          const neighborExits = exitedDirections[neighborKey] || [];
          const neighborExitedTowardUs = neighborExits.some(
            ne => ne[0] === -exitDir[0] && ne[1] === -exitDir[1]
          );

          if (neighborExitedTowardUs) continue;

          exitsToTrace.push({ nRow, nCol, exitDir });
          if (!exitedDirections[key]) exitedDirections[key] = [];
          exitedDirections[key].push(exitDir);
        }
      }

      // Trace all valid exits
      for (let { nRow, nCol, exitDir } of exitsToTrace) {
        if (nRow >= 0 && nRow < grid.length && nCol >= 0 && nCol < grid[0].length) {
          trace(nRow, nCol, exitDir, depth + 1);
        }
      }
    };

    // Start tracing from pump output
    const startRow = pumpRow + outputDir[0];
    const startCol = pumpCol + outputDir[1];
    const pumpKey = `${pumpRow},${pumpCol}`;
    directions[pumpKey] = [outputDir];
    exitedDirections[pumpKey] = [outputDir];

    if (startRow >= 0 && startRow < grid.length && startCol >= 0 && startCol < grid[0].length) {
      trace(startRow, startCol, outputDir, 0);
    }

    // Second pass: ensure all junction exits are traced
    for (const junctionInfo of junctionsEncountered) {
      const { key, row, col, rotation } = junctionInfo;
      const junctionDirs = directions[key] || [];
      const junctionConnections = getConnections('junction', rotation, row, col);

      for (let [nRow, nCol] of junctionConnections) {
        const exitDir = [nRow - row, nCol - col];
        const isEntryDirection = junctionDirs.some(
          dir => dir[0] === -exitDir[0] && dir[1] === -exitDir[1]
        );

        if (!isEntryDirection) {
          const neighborKey = `${nRow},${nCol}`;
          const neighborCell = grid[nRow]?.[nCol];

          if (neighborCell) {
            const neighborDirections = directions[neighborKey] || [];
            const alreadyTraced = neighborDirections.some(
              dir => dir[0] === exitDir[0] && dir[1] === exitDir[1]
            );
            if (!alreadyTraced) {
              trace(nRow, nCol, exitDir, 0);
            }
          }
        }
      }
    }

    // POST-PROCESSING: Fix flow directions for merger junctions
    const mergerJunctions = junctionsEncountered.filter(j => {
      const entries = directions[j.key] || [];
      return entries.length >= 2;
    });

    for (const merger of mergerJunctions) {
      const mergerEntries = directions[merger.key] || [];

      // For each entry direction, the source cell is an INPUT to the merger
      // That source cell should NOT have an entry that came FROM the merger
      for (const entryDir of mergerEntries) {
        // Source cell that provides input to the merger
        const srcRow = merger.row - entryDir[0];
        const srcCol = merger.col - entryDir[1];
        const srcKey = `${srcRow},${srcCol}`;
        const srcCell = grid[srcRow]?.[srcCol];

        if (!srcCell || srcCell.type === 'junction') continue;

        const srcEntries = directions[srcKey] || [];
        if (srcEntries.length <= 1) continue;

        // The reverse direction (from merger to source)
        const reverseDir = [-entryDir[0], -entryDir[1]];

        // Check if source has an entry FROM the merger (wrong direction)
        const wrongEntryIndex = srcEntries.findIndex(
          e => e[0] === reverseDir[0] && e[1] === reverseDir[1]
        );

        if (wrongEntryIndex !== -1) {
          srcEntries.splice(wrongEntryIndex, 1);

          // Propagate: remove wrong entries from cells further along the wrong path
          const toFix = [[srcRow, srcCol, merger.row, merger.col]];

          while (toFix.length > 0) {
            const [fixRow, fixCol, fromRow, fromCol] = toFix.shift();
            const fixCell = grid[fixRow]?.[fixCol];
            if (!fixCell || fixCell.type === 'junction' || fixCell.type === 'pump') continue;

            const fixConnections = getConnections(fixCell.type, fixCell.rotation, fixRow, fixCol);

            for (const [nRow, nCol] of fixConnections) {
              if (nRow === fromRow && nCol === fromCol) continue;

              const neighborKey = `${nRow},${nCol}`;
              const neighborCell = grid[nRow]?.[nCol];
              if (!neighborCell || neighborCell.type === 'junction' || neighborCell.type === 'pump') continue;

              const neighborEntries = directions[neighborKey] || [];
              const dirToNeighbor = [nRow - fixRow, nCol - fixCol];

              const wrongNeighborEntryIndex = neighborEntries.findIndex(
                e => e[0] === dirToNeighbor[0] && e[1] === dirToNeighbor[1]
              );

              if (wrongNeighborEntryIndex !== -1 && neighborEntries.length > 1) {
                neighborEntries.splice(wrongNeighborEntryIndex, 1);
                toFix.push([nRow, nCol, fixRow, fixCol]);
              }
            }
          }
        }
      }
    }

    setFlowDirections(directions);

    // Calculate water levels for each cell
    // For waterfalls, we track both input and output levels for 3D rendering
    const levels = {};
    const inputLevels = {}; // Track the input level (where water enters) for each cell
    const visited = new Set();

    const levelToNum = { 'high': 4, 'medium-high': 3, 'medium': 2, 'medium-low': 1, 'low': 0 };
    const numToLevel = { 4: 'high', 3: 'medium-high', 2: 'medium', 1: 'medium-low', 0: 'low' };

    // BFS from pump to calculate water levels
    const queue = [[pumpRow, pumpCol, 'high']]; // [row, col, level]
    levels[`${pumpRow},${pumpCol}`] = 'high'; // Pump outputs high water
    inputLevels[`${pumpRow},${pumpCol}`] = 'low'; // Pump input is low (from return)
    visited.add(`${pumpRow},${pumpCol}`);

    while (queue.length > 0) {
      const [row, col, currentLevel] = queue.shift();
      const key = `${row},${col}`;
      const cell = grid[row]?.[col];
      if (!cell) continue;

      // Get the exits for this cell (where water flows TO)
      const cellExits = exitedDirections[key] || [];

      for (const exitDir of cellExits) {
        const nRow = row + exitDir[0];
        const nCol = col + exitDir[1];
        const neighborKey = `${nRow},${nCol}`;

        if (visited.has(neighborKey)) continue;

        const neighborCell = grid[nRow]?.[nCol];
        if (!neighborCell) continue;

        // Determine the water level for the neighbor
        // Input level is what this cell receives (currentLevel)
        // Output level is what it passes on (same as input, unless it's a waterfall)
        let neighborInputLevel = currentLevel;
        let neighborOutputLevel = currentLevel;

        // If neighbor is a waterfall, the level drops
        if (neighborCell.type === 'waterfall-tiny') {
          // Tiny waterfall: drops 1 level (1/4 of total height)
          const currentNum = levelToNum[currentLevel] || 2;
          const newNum = Math.max(0, currentNum - 1);
          neighborOutputLevel = numToLevel[newNum];
        } else if (neighborCell.type === 'waterfall') {
          // Small waterfall: drops 2 levels (1/2 of total height)
          const currentNum = levelToNum[currentLevel] || 2;
          const newNum = Math.max(0, currentNum - 2);
          neighborOutputLevel = numToLevel[newNum];
        } else if (neighborCell.type === 'waterfall-large') {
          // Large waterfall: drops 4 levels (full height)
          const currentNum = levelToNum[currentLevel] || 4;
          const newNum = Math.max(0, currentNum - 4);
          neighborOutputLevel = numToLevel[newNum];
        }

        levels[neighborKey] = neighborOutputLevel;
        inputLevels[neighborKey] = neighborInputLevel;
        visited.add(neighborKey);
        queue.push([nRow, nCol, neighborOutputLevel]);
      }
    }

    // Store both output levels (for color) and input levels (for 3D positioning)
    setWaterLevels({ levels, inputLevels });

    // Calculate relative current flow for each cell using resistance-based distribution
    // In parallel branches, current is inversely proportional to resistance

    // Helper: Calculate resistance of a branch from a starting cell/direction until merge or pump
    const calculateBranchResistance = (startKey, exitDir) => {
      let resistance = 0;
      let currentKey = startKey;
      let currentDir = exitDir;
      const visited = new Set();

      while (true) {
        const [row, col] = currentKey.split(',').map(Number);
        const nextRow = row + currentDir[0];
        const nextCol = col + currentDir[1];
        const nextKey = `${nextRow},${nextCol}`;

        if (visited.has(nextKey) || nextKey === pumpKey) break;
        visited.add(nextKey);

        const nextCell = grid[nextRow]?.[nextCol];
        if (!nextCell) break;

        // Each waterfall = 1 resistor, regardless of size
        // (Size determines voltage drop, not resistance for current calculation)
        if (nextCell.type === 'waterfall-tiny' ||
            nextCell.type === 'waterfall' ||
            nextCell.type === 'waterfall-large') {
          resistance += 1;
        }

        // Check if this is a merge junction (multiple inputs) - stop here
        const nextExits = exitedDirections[nextKey] || [];
        const nextInputCount = Object.values(exitedDirections).filter(exits =>
          exits.some(e => {
            const [r, c] = nextKey.split(',').map(Number);
            return Object.keys(exitedDirections).some(srcKey => {
              const [sr, sc] = srcKey.split(',').map(Number);
              return exitedDirections[srcKey]?.some(ed => sr + ed[0] === r && sc + ed[1] === c);
            });
          })
        ).length;

        // Simpler merge detection: if this cell has multiple inputs, it's a merge
        let inputCount = 0;
        for (const srcKey of Object.keys(exitedDirections)) {
          const srcExits = exitedDirections[srcKey] || [];
          for (const ed of srcExits) {
            const [sr, sc] = srcKey.split(',').map(Number);
            if (sr + ed[0] === nextRow && sc + ed[1] === nextCol) {
              inputCount++;
            }
          }
        }
        if (inputCount > 1) break; // Merge junction reached

        // Continue along the path
        if (nextExits.length === 0) break;
        if (nextExits.length === 1) {
          currentKey = nextKey;
          currentDir = nextExits[0];
        } else {
          // Another split - this is a nested parallel, stop here for simplicity
          break;
        }
      }

      // Minimum resistance of 0.5 to avoid division issues and ensure some current flows
      return Math.max(0.5, resistance);
    };

    // For each cell with multiple exits (split), calculate conductance (1/R) for each branch
    const splitConductances = {}; // srcKey -> { exitDirKey: conductance, ... }
    for (const srcKey of Object.keys(exitedDirections)) {
      const srcExits = exitedDirections[srcKey] || [];
      if (srcExits.length > 1) {
        // This is a split junction - calculate resistance for each branch
        const conductances = {};
        let totalConductance = 0;

        for (const exitDir of srcExits) {
          const resistance = calculateBranchResistance(srcKey, exitDir);
          const conductance = 1 / resistance;
          const exitDirKey = `${exitDir[0]},${exitDir[1]}`;
          conductances[exitDirKey] = conductance;
          totalConductance += conductance;
        }

        // Normalize to get fraction of current for each branch
        for (const exitDirKey of Object.keys(conductances)) {
          conductances[exitDirKey] = conductances[exitDirKey] / totalConductance;
        }
        splitConductances[srcKey] = conductances;
      }
    }

    // Build reverse map with conductance-based weights
    const inputsFor = {}; // key -> [{sourceKey, currentFraction}, ...]
    for (const srcKey of Object.keys(exitedDirections)) {
      const srcExits = exitedDirections[srcKey] || [];
      const isSplit = srcExits.length > 1;

      for (const exitDir of srcExits) {
        const [srcRow, srcCol] = srcKey.split(',').map(Number);
        const destRow = srcRow + exitDir[0];
        const destCol = srcCol + exitDir[1];
        const destKey = `${destRow},${destCol}`;

        // Skip adding pump as a destination
        if (destKey === pumpKey) continue;
        if (!inputsFor[destKey]) inputsFor[destKey] = [];

        // Calculate current fraction based on conductance (for splits) or 1.0 (for single exit)
        let currentFraction = 1.0;
        if (isSplit && splitConductances[srcKey]) {
          const exitDirKey = `${exitDir[0]},${exitDir[1]}`;
          currentFraction = splitConductances[srcKey][exitDirKey] || (1 / srcExits.length);
        }

        inputsFor[destKey].push({ sourceKey: srcKey, currentFraction });
      }
    }

    // Calculate currents - iterate until stable
    const currents = {};
    currents[pumpKey] = 1.0; // Pump is always full current

    let changed = true;
    let iterations = 0;
    while (changed && iterations < 50) {
      changed = false;
      iterations++;

      for (const destKey of Object.keys(inputsFor)) {
        const inputs = inputsFor[destKey];
        let totalCurrent = 0;

        for (const { sourceKey, currentFraction } of inputs) {
          const sourceCurrent = currents[sourceKey] || 0;
          totalCurrent += sourceCurrent * currentFraction;
        }

        if (totalCurrent > 0 && (currents[destKey] === undefined || Math.abs(currents[destKey] - totalCurrent) > 0.001)) {
          currents[destKey] = totalCurrent;
          changed = true;
        }
      }
    }

    // Calculate directional currents for each cell (used for junction branch widths)
    // For each cell, store the current flowing through each direction
    const dirCurrents = {};
    for (const srcKey of Object.keys(exitedDirections)) {
      const srcExits = exitedDirections[srcKey] || [];
      const srcCurrent = currents[srcKey] || 0;

      if (!dirCurrents[srcKey]) dirCurrents[srcKey] = {};

      for (const exitDir of srcExits) {
        const exitDirKey = `${exitDir[0]},${exitDir[1]}`;
        // Current through this exit = source current * fraction for this exit
        let exitCurrent = srcCurrent;
        if (srcExits.length > 1 && splitConductances[srcKey]) {
          exitCurrent = srcCurrent * (splitConductances[srcKey][exitDirKey] || (1 / srcExits.length));
        }
        dirCurrents[srcKey][exitDirKey] = exitCurrent;

        // Also store incoming current at destination
        const [srcRow, srcCol] = srcKey.split(',').map(Number);
        const destRow = srcRow + exitDir[0];
        const destCol = srcCol + exitDir[1];
        const destKey = `${destRow},${destCol}`;
        const incomingDirKey = `${-exitDir[0]},${-exitDir[1]}`; // reverse direction

        if (!dirCurrents[destKey]) dirCurrents[destKey] = {};
        dirCurrents[destKey][incomingDirKey] = exitCurrent;
      }
    }

    setCurrentFlow(currents);
    setDirectionalCurrents(dirCurrents);
  };

  // Render a circuit element for playground mode
  const renderCircuitTile = (tile, size = 50, value = null, isSelected = false) => {
    if (!tile) return null;

    const style = {
      width: size,
      height: size,
      transform: `rotate(${tile.rotation || 0}deg)`,
      transition: 'transform 0.2s'
    };

    const borderClass = isSelected ? 'ring-2 ring-yellow-400' : '';

    return (
      <div style={style} className={`flex items-center justify-center relative ${borderClass}`}>
        {tile.type === 'c-battery' && (
          <svg width={size} height={size} viewBox="0 0 50 50">
            {/* Wire connections - lighter color for visibility */}
            <line x1="0" y1="25" x2="18" y2="25" stroke="#9ca3af" strokeWidth="2" />
            <line x1="32" y1="25" x2="50" y2="25" stroke="#9ca3af" strokeWidth="2" />
            {/* Battery symbol - short line (negative) on LEFT, long line (positive) on RIGHT */}
            {/* This way at rotation 0, current flows LEFT to RIGHT (out of + terminal) */}
            <line x1="18" y1="18" x2="18" y2="32" stroke="#9ca3af" strokeWidth="4" />
            <line x1="24" y1="12" x2="24" y2="38" stroke="#9ca3af" strokeWidth="2" />
            {/* - and + labels */}
            <text x="14" y="10" fontSize="10" fill="#9ca3af" textAnchor="middle">−</text>
            <text x="28" y="10" fontSize="8" fill="#9ca3af" textAnchor="middle">+</text>
            {/* Value display */}
            {value !== null && (
              <text x="25" y="46" fontSize="9" fill="#fbbf24" textAnchor="middle" fontWeight="bold">
                {value}V
              </text>
            )}
          </svg>
        )}
        {tile.type === 'c-resistor' && (
          <svg width={size} height={size} viewBox="0 0 50 50">
            {/* Wire connections */}
            <line x1="0" y1="25" x2="10" y2="25" stroke="#9ca3af" strokeWidth="2" />
            <line x1="40" y1="25" x2="50" y2="25" stroke="#9ca3af" strokeWidth="2" />
            {/* Resistor zigzag - brighter red */}
            <polyline
              points="10,25 13,18 19,32 25,18 31,32 37,18 40,25"
              fill="none"
              stroke="#f87171"
              strokeWidth="2.5"
            />
            {/* Value display */}
            {value !== null && (
              <text x="25" y="46" fontSize="9" fill="#f87171" textAnchor="middle" fontWeight="bold">
                {value}Ω
              </text>
            )}
          </svg>
        )}
        {tile.type === 'c-wire' && (
          <svg width={size} height={size} viewBox="0 0 50 50">
            <line x1="0" y1="25" x2="50" y2="25" stroke="#9ca3af" strokeWidth="2" />
          </svg>
        )}
        {tile.type === 'c-corner' && (
          <svg width={size} height={size} viewBox="0 0 50 50">
            {/* Corner connects right and down (same as water corner at rotation 0) */}
            <polyline points="50,25 25,25 25,50" fill="none" stroke="#9ca3af" strokeWidth="2" />
          </svg>
        )}
        {tile.type === 'c-junction' && (
          <svg width={size} height={size} viewBox="0 0 50 50">
            {/* T-junction */}
            <line x1="0" y1="25" x2="50" y2="25" stroke="#9ca3af" strokeWidth="2" />
            <line x1="25" y1="25" x2="25" y2="50" stroke="#9ca3af" strokeWidth="2" />
          </svg>
        )}
      </div>
    );
  };

  // Analyze circuit and generate water flow equivalent for playground mode
  const analyzeAndAnimatePlayground = () => {
    const level = levels[currentLevel];
    if (!level.isPlayground) return;

    // Find the battery
    let batteryPos = null;
    let batteryVoltage = 0;

    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const cell = grid[row]?.[col];
        if (cell?.type === 'c-battery') {
          batteryPos = { row, col, rotation: cell.rotation || 0 };
          batteryVoltage = elementValues[`${row},${col}`] || 10;
        }
      }
    }

    if (!batteryPos) {
      setFailureHint('Place a battery (element 1) to provide voltage to the circuit.');
      setGameState('disaster');
      return;
    }

    // Collect all resistors with their values
    const resistors = [];
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const cell = grid[row]?.[col];
        if (cell?.type === 'c-resistor') {
          resistors.push({
            row, col,
            rotation: cell.rotation || 0,
            resistance: elementValues[`${row},${col}`] || 100
          });
        }
      }
    }

    if (resistors.length === 0) {
      setFailureHint('Place at least one resistor (element 2) to limit current flow.');
      setGameState('disaster');
      return;
    }

    // Save the circuit grid before converting
    setSavedCircuitGrid(grid.map(row => row.map(cell => cell ? { ...cell } : null)));

    // Trace circuit to determine flow direction at each cell
    // Flow goes out of battery's + terminal (right side at rotation 0)
    const flowDirectionAt = {}; // cellKey -> [rowDelta, colDelta] direction of current flow

    // Get battery output direction based on rotation (+ terminal is on right at rotation 0)
    // rotation 0: output RIGHT [0, 1]
    // rotation 90: output DOWN [1, 0]
    // rotation 180: output LEFT [0, -1]
    // rotation 270: output UP [-1, 0]
    const batteryOutputDirs = {
      0: [0, 1],
      90: [1, 0],
      180: [0, -1],
      270: [-1, 0]
    };
    const batteryOutputDir = batteryOutputDirs[batteryPos.rotation] || [0, 1];

    // BFS to trace current flow through the circuit
    const visited = new Set();
    const queue = [[batteryPos.row, batteryPos.col, batteryOutputDir]];
    visited.add(`${batteryPos.row},${batteryPos.col}`);
    flowDirectionAt[`${batteryPos.row},${batteryPos.col}`] = batteryOutputDir;

    // Helper to get connections for a circuit element
    const getCircuitConnections = (type, rotation) => {
      if (type === 'c-wire' || type === 'c-resistor' || type === 'c-battery') {
        // Horizontal at rotation 0/180, vertical at 90/270
        if (rotation === 0 || rotation === 180) {
          return [[0, -1], [0, 1]]; // left, right
        } else {
          return [[-1, 0], [1, 0]]; // up, down
        }
      } else if (type === 'c-corner') {
        // Connects two perpendicular directions based on rotation
        const cornerConnections = {
          0: [[0, 1], [1, 0]],     // right, down
          90: [[1, 0], [0, -1]],   // down, left
          180: [[0, -1], [-1, 0]], // left, up
          270: [[-1, 0], [0, 1]]   // up, right
        };
        return cornerConnections[rotation] || cornerConnections[0];
      } else if (type === 'c-junction') {
        // T-junction: horizontal bar + stem down at rotation 0
        const junctionConnections = {
          0: [[0, -1], [0, 1], [1, 0]],   // left, right, down
          90: [[-1, 0], [1, 0], [0, -1]], // up, down, left
          180: [[0, -1], [0, 1], [-1, 0]], // left, right, up
          270: [[-1, 0], [1, 0], [0, 1]]  // up, down, right
        };
        return junctionConnections[rotation] || junctionConnections[0];
      }
      return [];
    };

    while (queue.length > 0) {
      const [row, col, flowDir] = queue.shift();
      const cell = grid[row]?.[col];
      if (!cell) continue;

      const connections = getCircuitConnections(cell.type, cell.rotation || 0);

      // The reverse direction is where we came from - don't go back that way
      const reverseDir = [-flowDir[0], -flowDir[1]];

      for (const conn of connections) {
        // Skip going back the way we came (this ensures we follow the current direction)
        if (conn[0] === reverseDir[0] && conn[1] === reverseDir[1]) continue;

        const nextRow = row + conn[0];
        const nextCol = col + conn[1];
        const nextKey = `${nextRow},${nextCol}`;

        if (visited.has(nextKey)) continue;

        const nextCell = grid[nextRow]?.[nextCol];
        if (!nextCell) continue;

        // Check if next cell connects back to current cell
        const nextConnections = getCircuitConnections(nextCell.type, nextCell.rotation || 0);
        const connectsBack = nextConnections.some(nc =>
          nextRow + nc[0] === row && nextCol + nc[1] === col
        );

        if (connectsBack) {
          visited.add(nextKey);
          flowDirectionAt[nextKey] = conn; // Current flows in this direction through this cell
          queue.push([nextRow, nextCol, conn]);
        }
      }
    }

    // Convert circuit elements to water elements
    const waterGrid = [];
    for (let rowIdx = 0; rowIdx < grid.length; rowIdx++) {
      const newRow = [];
      for (let colIdx = 0; colIdx < grid[rowIdx].length; colIdx++) {
        const cell = grid[rowIdx][colIdx];
        if (!cell) {
          newRow.push(null);
          continue;
        }

        const cellKey = `${rowIdx},${colIdx}`;
        const flowDir = flowDirectionAt[cellKey] || [0, 1]; // Default to rightward flow

        // Convert flow direction to water element rotation
        // Pump: arrow points in direction of output (water pushed out)
        // Waterfall: arrow points in direction of water flow (falling)
        // Flow direction [row, col]: [-1,0]=up, [1,0]=down, [0,1]=right, [0,-1]=left
        const flowToWaterfallRotation = (fd) => {
          // Waterfall at rotation 0 points DOWN, 90 points LEFT, 180 points UP, 270 points RIGHT
          if (fd[0] === 1 && fd[1] === 0) return 0;    // flow down → waterfall points down
          if (fd[0] === 0 && fd[1] === -1) return 90;  // flow left → waterfall points left
          if (fd[0] === -1 && fd[1] === 0) return 180; // flow up → waterfall points up
          if (fd[0] === 0 && fd[1] === 1) return 270;  // flow right → waterfall points right
          return 270; // default to rightward flow
        };
        const flowToPumpRotation = (fd) => {
          // Pump at rotation 0 points UP, 90 points RIGHT, 180 points DOWN, 270 points LEFT
          if (fd[0] === -1 && fd[1] === 0) return 0;   // output up
          if (fd[0] === 0 && fd[1] === 1) return 90;   // output right
          if (fd[0] === 1 && fd[1] === 0) return 180;  // output down
          if (fd[0] === 0 && fd[1] === -1) return 270; // output left
          return 90; // default to rightward output
        };

        switch (cell.type) {
          case 'c-battery':
            // Pump rotation based on flow direction (output direction)
            newRow.push({ type: 'pump', rotation: flowToPumpRotation(flowDir) });
            break;
          case 'c-wire':
            newRow.push({ type: 'channel', rotation: cell.rotation });
            break;
          case 'c-corner':
            newRow.push({ type: 'corner', rotation: cell.rotation });
            break;
          case 'c-junction':
            newRow.push({ type: 'junction', rotation: cell.rotation });
            break;
          case 'c-resistor':
            // Waterfall rotation based on flow direction
            newRow.push({ type: 'waterfall', rotation: flowToWaterfallRotation(flowDir), resistorKey: cellKey });
            break;
          default:
            newRow.push(cell);
        }
      }
      waterGrid.push(newRow);
    }

    // Circuit analysis supporting both series and parallel configurations
    // Uses graph-based approach to identify circuit topology

    // Build adjacency graph of the circuit
    const adjacency = {}; // cellKey -> [connected cellKeys]
    const cellTypes = {}; // cellKey -> cell type
    const cellData = {}; // cellKey -> full cell data

    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row]?.length; col++) {
        const cell = grid[row]?.[col];
        if (!cell) continue;
        const key = `${row},${col}`;
        cellTypes[key] = cell.type;
        cellData[key] = { ...cell, row, col };
        adjacency[key] = [];

        const connections = getCircuitConnections(cell.type, cell.rotation || 0);
        for (const conn of connections) {
          const neighborRow = row + conn[0];
          const neighborCol = col + conn[1];
          const neighborKey = `${neighborRow},${neighborCol}`;
          const neighborCell = grid[neighborRow]?.[neighborCol];
          if (!neighborCell) continue;

          // Check if neighbor connects back
          const neighborConns = getCircuitConnections(neighborCell.type, neighborCell.rotation || 0);
          const connectsBack = neighborConns.some(nc =>
            neighborRow + nc[0] === row && neighborCol + nc[1] === col
          );
          if (connectsBack) {
            adjacency[key].push(neighborKey);
          }
        }
      }
    }

    // Find nodes (junction points and battery terminals)
    // A node is where current can split/merge: junctions, or battery
    const nodes = new Set();
    const batteryKey = `${batteryPos.row},${batteryPos.col}`;
    nodes.add(batteryKey);

    for (const [key, type] of Object.entries(cellTypes)) {
      if (type === 'c-junction') {
        nodes.add(key);
      }
    }

    // Find branches between nodes
    // Each branch is a path through non-node cells containing resistors
    const branches = []; // { from, to, resistors: [{key, resistance}], path: [keys] }
    const visitedBranches = new Set();

    const traceBranch = (startNode, firstStep) => {
      const branchKey = `${startNode}->${firstStep}`;
      if (visitedBranches.has(branchKey)) return null;
      visitedBranches.add(branchKey);

      const path = [startNode];
      const branchResistors = [];
      let current = firstStep;
      let prev = startNode;

      while (current && !nodes.has(current)) {
        path.push(current);
        if (cellTypes[current] === 'c-resistor') {
          const r = resistors.find(r => `${r.row},${r.col}` === current);
          if (r) {
            branchResistors.push({ key: current, resistance: r.resistance });
          }
        }

        // Move to next cell (not going back)
        const neighbors = adjacency[current] || [];
        const nextCandidates = neighbors.filter(n => n !== prev);
        prev = current;
        current = nextCandidates[0] || null;
      }

      if (current && nodes.has(current)) {
        path.push(current);
        // Mark reverse direction as visited too
        visitedBranches.add(`${current}->${path[path.length - 2]}`);
        return {
          from: startNode,
          to: current,
          resistors: branchResistors,
          path: path
        };
      }
      return null;
    };

    // Trace all branches from each node
    for (const node of nodes) {
      const neighbors = adjacency[node] || [];
      for (const neighbor of neighbors) {
        const branch = traceBranch(node, neighbor);
        if (branch) {
          branches.push(branch);
        }
      }
    }

    // Group parallel branches (same from/to nodes)
    const branchGroups = {}; // "from,to" -> [branches]
    for (const branch of branches) {
      // Normalize key so A->B and B->A are same group
      const nodeKeys = [branch.from, branch.to].sort();
      const groupKey = nodeKeys.join('|');
      if (!branchGroups[groupKey]) {
        branchGroups[groupKey] = [];
      }
      branchGroups[groupKey].push(branch);
    }

    // Calculate voltages and currents
    // For simple circuits (battery + resistors), we can solve directly
    const voltageDrops = {};
    const branchCurrents = {}; // branchIdx -> current

    // Calculate total circuit resistance
    // For parallel groups, combine using 1/R_eq = 1/R1 + 1/R2 + ...
    let totalCircuitResistance = 0;
    const groupResistances = {}; // groupKey -> equivalent resistance

    for (const [groupKey, groupBranches] of Object.entries(branchGroups)) {
      // Each branch's resistance is sum of its resistors (series within branch)
      const branchResistances = groupBranches.map(b =>
        b.resistors.reduce((sum, r) => sum + r.resistance, 0) || 0.001 // Avoid division by zero
      );

      if (branchResistances.length === 1) {
        // Single branch - just its resistance
        groupResistances[groupKey] = branchResistances[0];
      } else {
        // Parallel branches - 1/R_eq = sum(1/R_i)
        const sumInverses = branchResistances.reduce((sum, r) => sum + 1/r, 0);
        groupResistances[groupKey] = 1 / sumInverses;
      }
    }

    // For a simple series-parallel circuit, groups are in series
    // Sum all group resistances
    totalCircuitResistance = Object.values(groupResistances).reduce((sum, r) => sum + r, 0);
    if (totalCircuitResistance === 0) totalCircuitResistance = 0.001;

    const totalCurrent = batteryVoltage / totalCircuitResistance;

    // Calculate voltage drop and current for each branch
    // Also track current through each cell for width scaling
    const cellCurrents = {}; // cellKey -> current (normalized later)

    for (const [groupKey, groupBranches] of Object.entries(branchGroups)) {
      const groupR = groupResistances[groupKey];
      const groupVoltage = totalCurrent * groupR; // Voltage across this parallel group

      for (const branch of groupBranches) {
        // Branch resistance (sum of resistors in series)
        const branchR = branch.resistors.reduce((sum, r) => sum + r.resistance, 0) || 0.001;

        // Current through this branch: I = V / R
        const branchCurrent = groupVoltage / branchR;

        // Store current for all cells in this branch path
        // Use Set to avoid double-counting cells that appear twice (e.g., battery at start and end of loop)
        const uniqueCellsInBranch = new Set(branch.path);
        for (const cellKey of uniqueCellsInBranch) {
          cellCurrents[cellKey] = (cellCurrents[cellKey] || 0) + branchCurrent;
        }

        // Voltage drop across each resistor in the branch: V = IR
        for (const resistor of branch.resistors) {
          const resistorVoltage = branchCurrent * resistor.resistance;
          voltageDrops[resistor.key] = resistorVoltage;
        }
      }
    }

    // Normalize currents to 0-1 range (relative to max current = totalCurrent)
    const normalizedCurrents = {};
    for (const [key, current] of Object.entries(cellCurrents)) {
      normalizedCurrents[key] = Math.min(1, current / totalCurrent);
    }

    // Normalize voltage drops to 0-1 scale (fraction of total battery voltage)
    const normalizedDrops = {};
    for (const [key, drop] of Object.entries(voltageDrops)) {
      normalizedDrops[key] = drop / batteryVoltage;
    }

    // Update water grid with waterfall sizing
    // For playground (level 5), use scaled waterfalls with arbitrary drop fractions
    // For other levels, categorize into large/small/tiny
    for (let row = 0; row < waterGrid.length; row++) {
      for (let col = 0; col < waterGrid[row]?.length; col++) {
        const cell = waterGrid[row]?.[col];
        if (cell?.resistorKey) {
          const dropFrac = normalizedDrops[cell.resistorKey] || 0.5;

          // Use scaled waterfall with continuous drop fraction
          cell.type = 'waterfall-scaled';
          cell.dropFraction = dropFrac;
          delete cell.resistorKey;
        }
      }
    }

    // Calculate water levels by tracing from pump through the circuit
    // We need to follow the flow and handle corners correctly
    const waterHeights = {};
    const waterInputHeights = {};
    const levelToNum = { 'high': 4, 'medium-high': 3, 'medium': 2, 'medium-low': 1, 'low': 0 };
    const numToLevel = { 4: 'high', 3: 'medium-high', 2: 'medium', 1: 'medium-low', 0: 'low' };

    // Helper to get ALL exit directions given cell type, rotation, and entry direction
    // Returns array of exit directions (multiple for junctions/splits)
    const getExitDirections = (cellType, rotation, entryDir) => {
      const reverseEntry = [-entryDir[0], -entryDir[1]];

      // For straight elements (channel, pump, waterfall), exit = entry
      if (cellType === 'channel' || cellType === 'pump' ||
          cellType === 'waterfall' || cellType === 'waterfall-tiny' || cellType === 'waterfall-large' || cellType === 'waterfall-scaled') {
        return [entryDir];
      }

      // For corners, find the OTHER connection
      if (cellType === 'corner') {
        const cornerConnections = {
          0: [[0, 1], [1, 0]],     // right, down
          90: [[1, 0], [0, -1]],   // down, left
          180: [[0, -1], [-1, 0]], // left, up
          270: [[-1, 0], [0, 1]]   // up, right
        };
        const conns = cornerConnections[rotation] || cornerConnections[0];
        const exits = conns.filter(conn =>
          conn[0] !== reverseEntry[0] || conn[1] !== reverseEntry[1]
        );
        return exits.length > 0 ? exits : [entryDir];
      }

      // For junctions, return ALL other connections (allows parallel paths)
      if (cellType === 'junction') {
        const junctionConnections = {
          0: [[0, -1], [0, 1], [1, 0]],   // left, right, down
          90: [[-1, 0], [1, 0], [0, -1]], // up, down, left
          180: [[0, -1], [0, 1], [-1, 0]], // left, right, up
          270: [[-1, 0], [1, 0], [0, 1]]  // up, down, right
        };
        const conns = junctionConnections[rotation] || junctionConnections[0];
        const exits = conns.filter(conn =>
          conn[0] !== reverseEntry[0] || conn[1] !== reverseEntry[1]
        );
        return exits.length > 0 ? exits : [entryDir];
      }

      return [entryDir];
    };

    // Find pump position in water grid
    let pumpPos = null;
    let pumpRotation = 0;
    for (let row = 0; row < waterGrid.length; row++) {
      for (let col = 0; col < waterGrid[row]?.length; col++) {
        if (waterGrid[row]?.[col]?.type === 'pump') {
          pumpPos = { row, col };
          pumpRotation = waterGrid[row][col].rotation || 0;
          break;
        }
      }
      if (pumpPos) break;
    }

    // Also build complete flow directions for animations
    const completeFlowDirections = {};

    // Track continuous levels for accurate height calculation (needed for tooltips)
    const continuousLevels = {}; // cellKey -> numeric level (0-4)

    if (pumpPos) {
      // Get pump output direction based on rotation
      const pumpOutputDirs = { 0: [-1, 0], 90: [0, 1], 180: [1, 0], 270: [0, -1] };
      const pumpOutputDir = pumpOutputDirs[pumpRotation] || [0, 1];

      // BFS from pump to calculate water levels AND flow directions
      const levelQueue = [[pumpPos.row, pumpPos.col, 'high', pumpOutputDir]];
      const levelVisited = new Set();
      const pumpKey = `${pumpPos.row},${pumpPos.col}`;
      waterHeights[pumpKey] = 'high';
      waterInputHeights[pumpKey] = 'low';
      completeFlowDirections[pumpKey] = [pumpOutputDir]; // Pump's flow direction
      levelVisited.add(pumpKey);
      continuousLevels[pumpKey] = 4; // Pump outputs at level 4 (high)

      while (levelQueue.length > 0) {
        const [row, col, currentLevel, currentDir] = levelQueue.shift();
        const key = `${row},${col}`;
        const cell = waterGrid[row]?.[col];
        if (!cell) continue;

        const currentNumLevel = continuousLevels[key] ?? levelToNum[currentLevel] ?? 4;

        // Get ALL exit directions for this cell (multiple for junctions)
        const exitDirs = getExitDirections(cell.type, cell.rotation || 0, currentDir);

        // Follow each exit direction (handles parallel paths at junctions)
        for (const exitDir of exitDirs) {
          const nextRow = row + exitDir[0];
          const nextCol = col + exitDir[1];
          const nextKey = `${nextRow},${nextCol}`;

          if (levelVisited.has(nextKey)) continue;

          const nextCell = waterGrid[nextRow]?.[nextCol];
          if (!nextCell) continue;

          let neighborInputLevel = currentLevel;
          let neighborOutputLevel = currentLevel;
          let neighborNumLevel = currentNumLevel;

          // If next cell is a waterfall, the level drops
          if (nextCell.type === 'waterfall-scaled') {
            // Scaled waterfall: use actual dropFraction for continuous drop
            const dropAmount = (nextCell.dropFraction || 0.5) * 4; // Scale to 4 level units
            neighborNumLevel = Math.max(0, currentNumLevel - dropAmount);
            // Store as continuous value for interpolation
            nextCell.outputLevel = neighborNumLevel;
            nextCell.inputLevel = currentNumLevel;
            neighborOutputLevel = numToLevel[Math.round(neighborNumLevel)] || 'low';
          } else if (nextCell.type === 'waterfall-tiny') {
            neighborNumLevel = Math.max(0, currentNumLevel - 1);
            neighborOutputLevel = numToLevel[Math.round(neighborNumLevel)] || 'low';
          } else if (nextCell.type === 'waterfall') {
            neighborNumLevel = Math.max(0, currentNumLevel - 2);
            neighborOutputLevel = numToLevel[Math.round(neighborNumLevel)] || 'low';
          } else if (nextCell.type === 'waterfall-large') {
            neighborNumLevel = Math.max(0, currentNumLevel - 4);
            neighborOutputLevel = numToLevel[Math.round(neighborNumLevel)] || 'low';
          }

          waterHeights[nextKey] = neighborOutputLevel;
          waterInputHeights[nextKey] = neighborInputLevel;
          continuousLevels[nextKey] = neighborNumLevel;

          // Store the entry direction (exitDir from previous cell = how we entered this cell)
          if (!completeFlowDirections[nextKey]) {
            completeFlowDirections[nextKey] = [];
          }
          completeFlowDirections[nextKey].push(exitDir);

          levelVisited.add(nextKey);
          levelQueue.push([nextRow, nextCol, neighborOutputLevel, exitDir]);
        }
      }
    }

    // Calculate current flow for width scaling
    // Map circuit cell currents to water grid cells
    const waterCurrentFlow = {};
    const waterDirCurrents = {};

    // The water grid has the same dimensions as the circuit grid
    // normalizedCurrents uses circuit grid keys which match water grid positions
    for (const [circuitKey, normalizedCurrent] of Object.entries(normalizedCurrents)) {
      waterCurrentFlow[circuitKey] = normalizedCurrent;
    }

    // Calculate directional currents for junctions (both normalized and actual values)
    // For each branch, track the flow direction and current
    const actualDirCurrents = {}; // cellKey -> { dirKey -> actual current in amps }

    for (const branch of branches) {
      const branchR = branch.resistors.reduce((sum, r) => sum + r.resistance, 0) || 0.001;
      const groupKey = [branch.from, branch.to].sort().join('|');
      const groupR = groupResistances[groupKey];
      const groupVoltage = totalCurrent * groupR;
      const branchCurrent = groupVoltage / branchR;
      const normalizedBranchCurrent = branchCurrent / totalCurrent;

      // Track flow through path
      for (let i = 0; i < branch.path.length - 1; i++) {
        const fromKey = branch.path[i];
        const toKey = branch.path[i + 1];
        const [fromRow, fromCol] = fromKey.split(',').map(Number);
        const [toRow, toCol] = toKey.split(',').map(Number);

        // Direction from this cell to next
        const dirRow = toRow - fromRow;
        const dirCol = toCol - fromCol;
        const exitDirKey = `${dirRow},${dirCol}`;
        const entryDirKey = `${-dirRow},${-dirCol}`;

        // Store exit current for fromKey (normalized for rendering)
        if (!waterDirCurrents[fromKey]) waterDirCurrents[fromKey] = {};
        waterDirCurrents[fromKey][exitDirKey] = (waterDirCurrents[fromKey][exitDirKey] || 0) + normalizedBranchCurrent;

        // Store entry current for toKey (normalized for rendering)
        if (!waterDirCurrents[toKey]) waterDirCurrents[toKey] = {};
        waterDirCurrents[toKey][entryDirKey] = (waterDirCurrents[toKey][entryDirKey] || 0) + normalizedBranchCurrent;

        // Store actual currents for tooltips
        if (!actualDirCurrents[fromKey]) actualDirCurrents[fromKey] = {};
        actualDirCurrents[fromKey][exitDirKey] = (actualDirCurrents[fromKey][exitDirKey] || 0) + branchCurrent;

        if (!actualDirCurrents[toKey]) actualDirCurrents[toKey] = {};
        actualDirCurrents[toKey][entryDirKey] = (actualDirCurrents[toKey][entryDirKey] || 0) + branchCurrent;
      }
    }

    // Build cell data for tooltips (voltage and current at each cell)
    const tooltipData = {};

    // Helper to convert direction key to readable label
    const dirToLabel = (dirKey) => {
      const [dr, dc] = dirKey.split(',').map(Number);
      if (dr === -1) return 'top';
      if (dr === 1) return 'bottom';
      if (dc === -1) return 'left';
      if (dc === 1) return 'right';
      return dirKey;
    };

    for (let row = 0; row < waterGrid.length; row++) {
      for (let col = 0; col < waterGrid[row]?.length; col++) {
        const cellKey = `${row},${col}`;
        const cell = waterGrid[row]?.[col];
        if (!cell) continue;

        const level = continuousLevels[cellKey];
        const voltage = level !== undefined ? (level / 4) * batteryVoltage : null;
        // For battery/pump, show the battery voltage as its ΔV (voltage it provides)
        const voltageDrop = cell.type === 'pump' ? batteryVoltage : (voltageDrops[cellKey] || null);

        // Handle current differently based on cell type
        let currentData;
        if (cell.type === 'pump') {
          // Battery: show total circuit current
          currentData = { total: totalCurrent };
        } else if (cell.type === 'junction') {
          // Junction: show directional currents
          const dirCurrents = actualDirCurrents[cellKey] || {};
          currentData = { directional: {} };
          for (const [dirKey, curr] of Object.entries(dirCurrents)) {
            currentData.directional[dirToLabel(dirKey)] = curr;
          }
        } else {
          // Other elements: show the current passing through
          // Use directional currents if available, otherwise fall back to cellCurrents
          const dirCurrents = actualDirCurrents[cellKey];
          if (dirCurrents && Object.keys(dirCurrents).length > 0) {
            // Take the max current (entry or exit should be same for non-junction)
            currentData = { total: Math.max(...Object.values(dirCurrents)) };
          } else {
            currentData = { total: cellCurrents[cellKey] || 0 };
          }
        }

        tooltipData[cellKey] = {
          voltage: voltage !== null ? voltage.toFixed(1) : null,
          currentData: currentData,
          voltageDrop: voltageDrop !== null ? voltageDrop.toFixed(1) : null,
          type: cell.type
        };
      }
    }

    // Store the water grid and calculated levels
    setGrid(waterGrid);
    setWaterLevels({ levels: waterHeights, inputLevels: waterInputHeights });
    setFlowDirections(completeFlowDirections);
    setCurrentFlow(waterCurrentFlow);
    setDirectionalCurrents(waterDirCurrents);
    setCellData(tooltipData);
    setFailureHint('');
    setPlaygroundMode('water');
    setGameState('success');
    setIsAnimating(true);
    setView3D(true);
  };

  const drawCircuit = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const level = levels[currentLevel];
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw a proper series circuit for level 1
    if (currentLevel === 0) {
      const startX = 50;
      const startY = 100;
      const width = 300;
      const height = 120;

      // Draw wires first (black)
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Wire from start to battery
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + 40, startY);
      // Wire from battery to first resistor
      ctx.moveTo(startX + 50, startY);
      ctx.lineTo(startX + 90, startY);
      // Wire between resistors
      ctx.moveTo(startX + 120, startY);
      ctx.lineTo(startX + 160, startY);
      // Wire from second resistor and complete loop
      ctx.moveTo(startX + 190, startY);
      ctx.lineTo(startX + width, startY);
      ctx.lineTo(startX + width, startY + height);
      ctx.lineTo(startX, startY + height);
      ctx.lineTo(startX, startY);
      ctx.stroke();

      // Battery (orange)
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(startX + 40, startY - 15);
      ctx.lineTo(startX + 40, startY + 15);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX + 50, startY - 10);
      ctx.lineTo(startX + 50, startY + 10);
      ctx.stroke();

      // First resistor (red)
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX + 90, startY);
      ctx.lineTo(startX + 95, startY - 8);
      ctx.lineTo(startX + 100, startY + 8);
      ctx.lineTo(startX + 105, startY - 8);
      ctx.lineTo(startX + 110, startY + 8);
      ctx.lineTo(startX + 115, startY - 8);
      ctx.lineTo(startX + 120, startY);
      ctx.stroke();

      // Second resistor (red)
      ctx.beginPath();
      ctx.moveTo(startX + 160, startY);
      ctx.lineTo(startX + 165, startY - 8);
      ctx.lineTo(startX + 170, startY + 8);
      ctx.lineTo(startX + 175, startY - 8);
      ctx.lineTo(startX + 180, startY + 8);
      ctx.lineTo(startX + 185, startY - 8);
      ctx.lineTo(startX + 190, startY);
      ctx.stroke();
      
    } else if (currentLevel === 1) {
      // Draw a proper parallel circuit for level 2
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      
      const startX = 50;
      const centerY = 160;
      const branchHeight = 50;
      
      // Left side - battery
      ctx.beginPath();
      ctx.moveTo(startX, centerY);
      ctx.lineTo(startX + 40, centerY);
      ctx.stroke();
      
      // Battery symbol
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(startX + 40, centerY - 15);
      ctx.lineTo(startX + 40, centerY + 15);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX + 50, centerY - 10);
      ctx.lineTo(startX + 50, centerY + 10);
      ctx.stroke();
      
      // Wire to junction point
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX + 50, centerY);
      ctx.lineTo(startX + 100, centerY);
      ctx.stroke();
      
      // Junction point (left)
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(startX + 100, centerY, 4, 0, Math.PI * 2);
      ctx.fill();
      
      // Top branch - first resistor
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX + 100, centerY);
      ctx.lineTo(startX + 100, centerY - branchHeight);
      ctx.lineTo(startX + 140, centerY - branchHeight);
      ctx.stroke();
      
      // First resistor (top)
      ctx.strokeStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(startX + 140, centerY - branchHeight);
      ctx.lineTo(startX + 145, centerY - branchHeight - 8);
      ctx.lineTo(startX + 150, centerY - branchHeight + 8);
      ctx.lineTo(startX + 155, centerY - branchHeight - 8);
      ctx.lineTo(startX + 160, centerY - branchHeight + 8);
      ctx.lineTo(startX + 165, centerY - branchHeight - 8);
      ctx.lineTo(startX + 170, centerY - branchHeight);
      ctx.stroke();
      
      // Continue top branch
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX + 170, centerY - branchHeight);
      ctx.lineTo(startX + 240, centerY - branchHeight);
      ctx.lineTo(startX + 240, centerY);
      ctx.stroke();
      
      // Bottom branch - second resistor
      ctx.beginPath();
      ctx.moveTo(startX + 100, centerY);
      ctx.lineTo(startX + 100, centerY + branchHeight);
      ctx.lineTo(startX + 140, centerY + branchHeight);
      ctx.stroke();
      
      // Second resistor (bottom)
      ctx.strokeStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(startX + 140, centerY + branchHeight);
      ctx.lineTo(startX + 145, centerY + branchHeight - 8);
      ctx.lineTo(startX + 150, centerY + branchHeight + 8);
      ctx.lineTo(startX + 155, centerY + branchHeight - 8);
      ctx.lineTo(startX + 160, centerY + branchHeight + 8);
      ctx.lineTo(startX + 165, centerY + branchHeight - 8);
      ctx.lineTo(startX + 170, centerY + branchHeight);
      ctx.stroke();
      
      // Continue bottom branch
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX + 170, centerY + branchHeight);
      ctx.lineTo(startX + 240, centerY + branchHeight);
      ctx.lineTo(startX + 240, centerY);
      ctx.stroke();
      
      // Junction point (right)
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(startX + 240, centerY, 4, 0, Math.PI * 2);
      ctx.fill();
      
      // Return path to battery
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX + 240, centerY);
      ctx.lineTo(startX + 300, centerY);
      ctx.lineTo(startX + 300, centerY + 80);
      ctx.lineTo(startX, centerY + 80);
      ctx.lineTo(startX, centerY);
      ctx.stroke();

    } else if (currentLevel === 2) {
      // Level 3: Unequal Parallel (1R on one branch, 2R on the other)
      const startX = 40;
      const centerY = 140;
      const branchHeight = 60;

      // Wires first (black)
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // From start to battery
      ctx.moveTo(startX, centerY);
      ctx.lineTo(startX + 30, centerY);
      // Battery to junction
      ctx.moveTo(startX + 50, centerY);
      ctx.lineTo(startX + 90, centerY);
      // Top branch (1R)
      ctx.moveTo(startX + 90, centerY);
      ctx.lineTo(startX + 90, centerY - branchHeight);
      ctx.lineTo(startX + 120, centerY - branchHeight);
      ctx.moveTo(startX + 160, centerY - branchHeight);
      ctx.lineTo(startX + 220, centerY - branchHeight);
      ctx.lineTo(startX + 220, centerY);
      // Bottom branch (2R)
      ctx.moveTo(startX + 90, centerY);
      ctx.lineTo(startX + 90, centerY + branchHeight);
      ctx.lineTo(startX + 110, centerY + branchHeight);
      ctx.moveTo(startX + 150, centerY + branchHeight);
      ctx.lineTo(startX + 170, centerY + branchHeight);
      ctx.moveTo(startX + 210, centerY + branchHeight);
      ctx.lineTo(startX + 220, centerY + branchHeight);
      ctx.lineTo(startX + 220, centerY);
      // Return path
      ctx.moveTo(startX + 220, centerY);
      ctx.lineTo(startX + 280, centerY);
      ctx.lineTo(startX + 280, centerY + 100);
      ctx.lineTo(startX, centerY + 100);
      ctx.lineTo(startX, centerY);
      ctx.stroke();

      // Battery (orange)
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(startX + 35, centerY - 15);
      ctx.lineTo(startX + 35, centerY + 15);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX + 45, centerY - 10);
      ctx.lineTo(startX + 45, centerY + 10);
      ctx.stroke();

      // Junction dots
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(startX + 90, centerY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(startX + 220, centerY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Top branch resistor (1R - larger, full drop)
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX + 120, centerY - branchHeight);
      ctx.lineTo(startX + 125, centerY - branchHeight - 8);
      ctx.lineTo(startX + 135, centerY - branchHeight + 8);
      ctx.lineTo(startX + 145, centerY - branchHeight - 8);
      ctx.lineTo(startX + 155, centerY - branchHeight + 8);
      ctx.lineTo(startX + 160, centerY - branchHeight);
      ctx.stroke();

      // Bottom branch resistors (2R - two smaller resistors)
      ctx.beginPath();
      ctx.moveTo(startX + 110, centerY + branchHeight);
      ctx.lineTo(startX + 115, centerY + branchHeight - 6);
      ctx.lineTo(startX + 125, centerY + branchHeight + 6);
      ctx.lineTo(startX + 135, centerY + branchHeight - 6);
      ctx.lineTo(startX + 145, centerY + branchHeight + 6);
      ctx.lineTo(startX + 150, centerY + branchHeight);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(startX + 170, centerY + branchHeight);
      ctx.lineTo(startX + 175, centerY + branchHeight - 6);
      ctx.lineTo(startX + 185, centerY + branchHeight + 6);
      ctx.lineTo(startX + 195, centerY + branchHeight - 6);
      ctx.lineTo(startX + 205, centerY + branchHeight + 6);
      ctx.lineTo(startX + 210, centerY + branchHeight);
      ctx.stroke();

    } else if (currentLevel === 3) {
      // Level 4: Series-Parallel (1R then split to 1R || 2R)
      const startX = 30;
      const centerY = 130;
      const branchHeight = 50;

      // Wires (black)
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Start to battery
      ctx.moveTo(startX, centerY);
      ctx.lineTo(startX + 25, centerY);
      // Battery to first resistor
      ctx.moveTo(startX + 45, centerY);
      ctx.lineTo(startX + 70, centerY);
      // First resistor to junction
      ctx.moveTo(startX + 110, centerY);
      ctx.lineTo(startX + 140, centerY);
      // Top branch (1R)
      ctx.moveTo(startX + 140, centerY);
      ctx.lineTo(startX + 140, centerY - branchHeight);
      ctx.lineTo(startX + 160, centerY - branchHeight);
      ctx.moveTo(startX + 200, centerY - branchHeight);
      ctx.lineTo(startX + 260, centerY - branchHeight);
      ctx.lineTo(startX + 260, centerY);
      // Bottom branch (2R)
      ctx.moveTo(startX + 140, centerY);
      ctx.lineTo(startX + 140, centerY + branchHeight);
      ctx.lineTo(startX + 150, centerY + branchHeight);
      ctx.moveTo(startX + 185, centerY + branchHeight);
      ctx.lineTo(startX + 195, centerY + branchHeight);
      ctx.moveTo(startX + 230, centerY + branchHeight);
      ctx.lineTo(startX + 260, centerY + branchHeight);
      ctx.lineTo(startX + 260, centerY);
      // Return path
      ctx.moveTo(startX + 260, centerY);
      ctx.lineTo(startX + 310, centerY);
      ctx.lineTo(startX + 310, centerY + 100);
      ctx.lineTo(startX, centerY + 100);
      ctx.lineTo(startX, centerY);
      ctx.stroke();

      // Battery (orange)
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(startX + 30, centerY - 15);
      ctx.lineTo(startX + 30, centerY + 15);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX + 40, centerY - 10);
      ctx.lineTo(startX + 40, centerY + 10);
      ctx.stroke();

      // Junction dots
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(startX + 140, centerY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(startX + 260, centerY, 4, 0, Math.PI * 2);
      ctx.fill();

      // First resistor (series) - red
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX + 70, centerY);
      ctx.lineTo(startX + 75, centerY - 8);
      ctx.lineTo(startX + 85, centerY + 8);
      ctx.lineTo(startX + 95, centerY - 8);
      ctx.lineTo(startX + 105, centerY + 8);
      ctx.lineTo(startX + 110, centerY);
      ctx.stroke();

      // Top branch resistor (1R)
      ctx.beginPath();
      ctx.moveTo(startX + 160, centerY - branchHeight);
      ctx.lineTo(startX + 165, centerY - branchHeight - 8);
      ctx.lineTo(startX + 175, centerY - branchHeight + 8);
      ctx.lineTo(startX + 185, centerY - branchHeight - 8);
      ctx.lineTo(startX + 195, centerY - branchHeight + 8);
      ctx.lineTo(startX + 200, centerY - branchHeight);
      ctx.stroke();

      // Bottom branch resistors (2R)
      ctx.beginPath();
      ctx.moveTo(startX + 150, centerY + branchHeight);
      ctx.lineTo(startX + 155, centerY + branchHeight - 6);
      ctx.lineTo(startX + 165, centerY + branchHeight + 6);
      ctx.lineTo(startX + 175, centerY + branchHeight - 6);
      ctx.lineTo(startX + 185, centerY + branchHeight);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(startX + 195, centerY + branchHeight);
      ctx.lineTo(startX + 200, centerY + branchHeight - 6);
      ctx.lineTo(startX + 210, centerY + branchHeight + 6);
      ctx.lineTo(startX + 220, centerY + branchHeight - 6);
      ctx.lineTo(startX + 230, centerY + branchHeight);
      ctx.stroke();

    } else {
      // For other levels, draw the circuit data
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      
      // Define cell size for drawing circuit diagram
      const cellSize = 40;

      // First pass: draw all wires as continuous lines
      ctx.beginPath();
      level.circuit.forEach(item => {
        const [col, row] = item.pos;
        const x = col * cellSize;
        const y = row * cellSize;

        if (item.type === 'wire') {
          if (item.dir === 'horizontal') {
            ctx.moveTo(x, y);
            ctx.lineTo(x + cellSize, y);
          } else {
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + cellSize);
          }
        }
      });
      ctx.stroke();

      // Second pass: draw components on top
      level.circuit.forEach(item => {
        const [col, row] = item.pos;
        const x = col * cellSize;
        const y = row * cellSize;

        if (item.type === 'battery') {
          ctx.strokeStyle = '#d97706';
          ctx.fillStyle = '#d97706';
          ctx.lineWidth = 3;
          // Draw battery symbol - two parallel lines of different heights
          ctx.beginPath();
          ctx.moveTo(x - 5, y - 12);
          ctx.lineTo(x - 5, y + 12);
          ctx.stroke();
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + 5, y - 8);
          ctx.lineTo(x + 5, y + 8);
          ctx.stroke();
          // Draw connecting wires
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x - cellSize/2, y);
          ctx.lineTo(x - 5, y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x + 5, y);
          ctx.lineTo(x + cellSize/2, y);
          ctx.stroke();
        } else if (item.type === 'resistor') {
          // Determine orientation
          const isVertical = item.dir === 'down' || item.dir === 'up';
          
          ctx.save();
          ctx.translate(x, y);
          if (isVertical) ctx.rotate(Math.PI / 2);
          
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 2;
          // Zigzag resistor pattern
          const halfCell = cellSize / 2;
          const zigWidth = 6;
          ctx.beginPath();
          ctx.moveTo(-halfCell, 0);
          ctx.lineTo(-10, 0);
          ctx.lineTo(-6, -zigWidth);
          ctx.lineTo(-2, zigWidth);
          ctx.lineTo(2, -zigWidth);
          ctx.lineTo(6, zigWidth);
          ctx.lineTo(10, -zigWidth);
          ctx.lineTo(10, 0);
          ctx.lineTo(halfCell, 0);
          ctx.stroke();
          
          // Draw connecting wires
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-halfCell, 0);
          ctx.lineTo(-10, 0);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(10, 0);
          ctx.lineTo(halfCell, 0);
          ctx.stroke();
          
          ctx.restore();
        } else if (item.type === 'junction') {
          ctx.fillStyle = '#333';
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
  };

  useEffect(() => {
    drawCircuit();
  }, [currentLevel]);

  const renderWaterTile = (tile, size = 50, waterHeight = 'medium', flowDir = null, current = 1.0, dirCurrents = null) => {
    if (!tile) return null;

    const style = {
      width: size,
      height: size,
      transform: `rotate(${tile.rotation}deg)`,
      transition: 'transform 0.2s'
    };

    const flowAnimation = isAnimating && gameState === 'success';

    // Scale pipe width based on current (0.2 to 1.0 range for more contrast)
    // Use squared power function to super-exaggerate visual difference
    // current=1.0 -> widthScale=1.0
    // current=0.67 -> widthScale=0.48 (appears much wider)
    // current=0.33 -> widthScale=0.15 (appears much thinner)
    // This makes 2:1 current ratio visually obvious as ~3:1 width ratio
    const widthScale = 0.05 + Math.pow(current, 2) * 0.95;
    const pipeWidth = 7.5 * widthScale; // Base width is 7.5
    const pipeOffset = (7.5 - pipeWidth) / 2; // Center the narrower pipe

    // Water height colors - 5 levels from high (lightest) to low (darkest)
    const waterColors = {
      high: {
        main: '#bfdbfe',
        gradient: 'from-blue-100 via-blue-200 to-blue-300',
        border: '#93c5fd',
        solid: '#bfdbfe'
      },
      'medium-high': {
        main: '#93c5fd',
        gradient: 'from-blue-200 via-blue-300 to-blue-400',
        border: '#60a5fa',
        solid: '#93c5fd'
      },
      medium: {
        main: '#60a5fa',
        gradient: 'from-blue-300 via-blue-400 to-blue-500',
        border: '#3b82f6',
        solid: '#60a5fa'
      },
      'medium-low': {
        main: '#3b82f6',
        gradient: 'from-blue-500 via-blue-600 to-blue-700',
        border: '#2563eb',
        solid: '#3b82f6'
      },
      low: {
        main: '#2563eb',
        gradient: 'from-blue-600 via-blue-700 to-blue-800',
        border: '#1e40af',
        solid: '#2563eb'
      },
      below: {
        main: '#dc2626',
        gradient: 'from-red-500 via-red-600 to-red-700',
        border: '#b91c1c',
        solid: '#dc2626'
      }
    };

    const color = waterColors[waterHeight] || waterColors.medium;

    return (
      <div style={style} className="flex items-center justify-center relative overflow-hidden">
        {tile.type === 'channel' && (
          <div className="relative w-full h-full flex items-center justify-center">
            <svg width={size} height={size} viewBox="0 0 50 50">
              {/* Draw horizontal bar - width scales with current */}
              <rect x="0" y={21.25 + pipeOffset} width="50" height={pipeWidth} fill={color.solid} stroke={color.border} strokeWidth="1" />
              
              {flowAnimation && flowDir && (
                <>
                  {/* ========================================== */}
                  {/* CHANNEL BUBBLE ANIMATION */}
                  {/* ========================================== */}
                  {/* 
                  flowDir is the "entry direction" - the direction we TRAVELED to reach this cell
                  
                  Since the entire channel tile rotates via CSS transform, we always draw
                  bubbles moving horizontally in the LOCAL coordinate system (left-to-right
                  or right-to-left along the channel bar).
                  
                  We need to determine if the flow is:
                    - FORWARD through the channel (left-to-right in local coords)
                    - BACKWARD through the channel (right-to-left in local coords)
                  
                  Direction format:
                    flowDir[0] (row_delta): -1 = moved UP, 1 = moved DOWN
                    flowDir[1] (col_delta): -1 = moved LEFT, 1 = moved RIGHT
                  */}
                  {(() => {
                    let path;
                    const rotation = tile.rotation || 0;

                    // flowDir is an ARRAY of direction tuples. Get the first one for channels.
                    const dir = Array.isArray(flowDir) && flowDir.length > 0 ? flowDir[0] : flowDir;
                    if (!dir) return null;

                    // dir[0] = row delta, dir[1] = col delta
                    // dir[0] = 1: moved DOWN → came from above
                    // dir[0] = -1: moved UP → came from below
                    // dir[1] = 1: moved RIGHT → came from left
                    // dir[1] = -1: moved LEFT → came from right

                    if (rotation === 0) {
                      // Horizontal channel: local-left = grid-left, local-right = grid-right
                      // dir[1] = 1 (moved RIGHT, came from left) → water goes left-to-right
                      path = dir[1] === 1 ? "M 0 25 L 50 25" : "M 50 25 L 0 25";
                    } else if (rotation === 90) {
                      // Vertical channel: local-left = grid-up, local-right = grid-down
                      // dir[0] = 1 (moved DOWN, came from above) → water enters from local-left → left-to-right
                      path = dir[0] === 1 ? "M 0 25 L 50 25" : "M 50 25 L 0 25";
                    } else if (rotation === 180) {
                      // Horizontal channel (flipped): local-left = grid-right, local-right = grid-left
                      // dir[1] = 1 (moved RIGHT, came from left) → water enters from local-right → right-to-left
                      path = dir[1] === 1 ? "M 50 25 L 0 25" : "M 0 25 L 50 25";
                    } else { // 270
                      // Vertical channel (flipped): local-left = grid-down, local-right = grid-up
                      // dir[0] = 1 (moved DOWN, came from above) → water enters from local-right → right-to-left
                      path = dir[0] === 1 ? "M 50 25 L 0 25" : "M 0 25 L 50 25";
                    }

                    // Bubble colors - use white/light gray for visibility on all water levels
                    const bubbleColors = {
                      high: ['#ffffff', '#e5e7eb'],   // white/light gray - visible on light blue
                      medium: ['#ffffff', '#e5e7eb'], // white/light gray
                      low: ['#e5e7eb', '#d1d5db']     // light gray
                    };
                    const [bubble1, bubble2] = bubbleColors[waterHeight] || bubbleColors.medium;

                    return (
                      <>
                        <circle className="animate-flow-dot" r="2.5" fill={bubble1}>
                          <animateMotion dur="1.5s" repeatCount="indefinite" path={path} />
                        </circle>
                        <circle className="animate-flow-dot" r="2.5" fill={bubble2}>
                          <animateMotion dur="1.5s" repeatCount="indefinite" begin="0.5s" path={path} />
                        </circle>
                      </>
                    );
                  })()}
                </>
              )}
            </svg>
          </div>
        )}
        {tile.type === 'corner' && (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* True L-shape corner with only 2 connection points */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg width={size} height={size} viewBox="0 0 50 50">
                {/* L-shape centered - width scales with current */}
                <rect x={21.25 + pipeOffset} y={21.25 + pipeOffset} width={28.75 - pipeOffset} height={pipeWidth} fill={color.solid} stroke={color.border} strokeWidth="1" />
                <rect x={21.25 + pipeOffset} y={21.25 + pipeOffset} width={pipeWidth} height={28.75 - pipeOffset} fill={color.solid} stroke={color.border} strokeWidth="1" />
                {flowAnimation && flowDir && (
                  <>
                    {/* ========================================== */}
                    {/* CORNER BUBBLE ANIMATION */}
                    {/* ========================================== */}
                    {/* flowDir is the "entry direction" - the direction we TRAVELED to reach this cell */}
                    {/* 
                    Example: If we're at cell [2,3] and flowDir = [0,1]:
                      - flowDir = [row_delta, col_delta] = [0, 1]
                      - row_delta = 0 means row stayed the same
                      - col_delta = 1 means column increased by 1
                      - So we moved RIGHT (from [2,2] to [2,3])
                      - Therefore water is ENTERING from the LEFT edge of this cell
                      - And will EXIT through the other connected edge
                    
                    Direction format:
                      flowDir[0] (row_delta): -1 = moved UP, 1 = moved DOWN
                      flowDir[1] (col_delta): -1 = moved LEFT, 1 = moved RIGHT
                    */}
                    {(() => {
                      let path;
                      const rotation = tile.rotation || 0;

                      // flowDir is an ARRAY of direction tuples. Get the first one for corners.
                      const dir = Array.isArray(flowDir) && flowDir.length > 0 ? flowDir[0] : flowDir;
                      if (!dir) return null;

                      // Corner L-shape in LOCAL SVG coords: connects RIGHT (x=50) and DOWN (y=50)
                      // Path A: M 45 25 L 25 25 L 25 45 = from local-right to local-down
                      // Path B: M 25 45 L 25 25 L 45 25 = from local-down to local-right
                      //
                      // dir[0] = -1 → moved UP → came from cell BELOW
                      // dir[0] = 1  → moved DOWN → came from cell ABOVE
                      // dir[1] = -1 → moved LEFT → came from cell to RIGHT
                      // dir[1] = 1  → moved RIGHT → came from cell to LEFT

                      if (rotation === 0) {
                        // Connects grid-RIGHT and grid-DOWN
                        // Entry from grid-right (dir[1] === -1, moved LEFT) → Path A
                        // Entry from grid-down (dir[0] === -1, moved UP) → Path B
                        path = dir[1] === -1 ? "M 45 25 L 25 25 L 25 45" : "M 25 45 L 25 25 L 45 25";
                      } else if (rotation === 90) {
                        // Connects grid-DOWN and grid-LEFT
                        // Entry from grid-down (dir[0] === -1, moved UP) → Path A
                        // Entry from grid-left (dir[1] === 1, moved RIGHT) → Path B
                        path = dir[0] === -1 ? "M 45 25 L 25 25 L 25 45" : "M 25 45 L 25 25 L 45 25";
                      } else if (rotation === 180) {
                        // Connects grid-LEFT and grid-UP
                        // Entry from grid-left (dir[1] === 1, moved RIGHT) → Path A
                        // Entry from grid-up (dir[0] === 1, moved DOWN) → Path B
                        path = dir[1] === 1 ? "M 45 25 L 25 25 L 25 45" : "M 25 45 L 25 25 L 45 25";
                      } else { // 270
                        // Connects grid-UP and grid-RIGHT
                        // Entry from grid-up (dir[0] === 1, moved DOWN) → Path A
                        // Entry from grid-right (dir[1] === -1, moved LEFT) → Path B
                        path = dir[0] === 1 ? "M 45 25 L 25 25 L 25 45" : "M 25 45 L 25 25 L 45 25";
                      }

                      // Bubble color - white/light gray for visibility
                      const bubbleColors = {
                        high: '#ffffff',
                        medium: '#ffffff',
                        low: '#e5e7eb'
                      };
                      const bubbleColor = bubbleColors[waterHeight] || bubbleColors.medium;

                      return (
                        <circle className="animate-flow-dot" r="2.5" fill={bubbleColor}>
                          <animateMotion dur="1.5s" repeatCount="indefinite" path={path} />
                        </circle>
                      );
                    })()}
                  </>
                )}
              </svg>
            </div>
          </div>
        )}
        {tile.type === 'pump' && (
          <div className="w-full h-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 rounded-lg flex items-center justify-center relative overflow-hidden shadow-lg"
            style={{ 
              borderTop: '6px solid #93c5fd',  // thick light blue (high water)
              borderBottom: '6px solid #2563eb',  // thick dark blue (low water)
              borderLeft: '3px solid #d97706',
              borderRight: '3px solid #d97706'
            }}>
            <div className="text-white font-bold text-2xl z-10">⬆</div>
            {flowAnimation && (
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-amber-300 to-transparent opacity-50 animate-pump" />
                <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-blue-400 animate-rise" />
              </>
            )}
          </div>
        )}
        {tile.type === 'waterfall-tiny' && (
          <div className="w-full h-full flex items-center justify-center relative">
            {(() => {
              // Tiny waterfall: drops 1 level (1/4 of total height)
              // Color definitions for all 5 levels
              const levelColors = {
                'high': { start: '#dbeafe', mid: '#bfdbfe', end: '#bfdbfe' },
                'medium-high': { start: '#bfdbfe', mid: '#93c5fd', end: '#93c5fd' },
                'medium': { start: '#93c5fd', mid: '#60a5fa', end: '#60a5fa' },
                'medium-low': { start: '#60a5fa', mid: '#3b82f6', end: '#3b82f6' },
                'low': { start: '#3b82f6', mid: '#2563eb', end: '#1e40af' }
              };

              // Calculate input level (1 level higher than output)
              const levelOrder = ['low', 'medium-low', 'medium', 'medium-high', 'high'];
              const outputIdx = levelOrder.indexOf(waterHeight);
              const inputIdx = Math.min(4, outputIdx + 1);
              const inputLevel = levelOrder[inputIdx];
              const outputLevel = waterHeight;

              const inputColor = levelColors[inputLevel] || levelColors['medium'];
              const outputColor = levelColors[outputLevel] || levelColors['medium'];
              const gradientId = `waterfall-tiny-${inputLevel}-${outputLevel}`;

              return (
                <svg width={size} height={size} viewBox="0 0 50 50" className="absolute inset-0">
                  <defs>
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={inputColor.start} />
                      <stop offset="40%" stopColor={inputColor.end} />
                      <stop offset="60%" stopColor={outputColor.start} />
                      <stop offset="100%" stopColor={outputColor.end} />
                    </linearGradient>
                  </defs>
                  {/* Smaller/thinner waterfall for tiny drop - width scales with current */}
                  <rect x={25 - 6 * widthScale} y="8" width={12 * widthScale} height="34"
                    fill={`url(#${gradientId})`}
                    stroke={outputColor.end}
                    strokeWidth="1" />

                  {/* Single small arrow */}
                  <path d="M 25 18 L 25 32 M 22 29 L 25 32 L 28 29"
                    stroke="#ffffff"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.8" />

                  {flowAnimation && (
                    <>
                      <circle className="animate-drop" r="1" fill={inputColor.start} cx="22" cy="10" />
                      <circle className="animate-drop" r="1" fill={inputColor.start} cx="25" cy="10" style={{ animationDelay: '0.15s' }} />
                      <circle className="animate-drop" r="1" fill={inputColor.start} cx="28" cy="10" style={{ animationDelay: '0.3s' }} />
                      <circle r="2" fill={outputColor.mid} opacity="0.6" cx="25" cy="40">
                        <animate attributeName="r" values="0;3;0" dur="0.6s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.8;0;0.8" dur="0.6s" repeatCount="indefinite" />
                      </circle>
                    </>
                  )}
                </svg>
              );
            })()}
          </div>
        )}
        {tile.type === 'waterfall' && (
          <div className="w-full h-full flex items-center justify-center relative">
            {(() => {
              // Small waterfall: drops 2 levels (1/2 of total height)
              // Color definitions for all 5 levels
              const levelColors = {
                'high': { start: '#dbeafe', mid: '#bfdbfe', end: '#bfdbfe' },
                'medium-high': { start: '#bfdbfe', mid: '#93c5fd', end: '#93c5fd' },
                'medium': { start: '#93c5fd', mid: '#60a5fa', end: '#60a5fa' },
                'medium-low': { start: '#60a5fa', mid: '#3b82f6', end: '#3b82f6' },
                'low': { start: '#3b82f6', mid: '#2563eb', end: '#1e40af' }
              };

              // Calculate input level (2 levels higher than output)
              const levelOrder = ['low', 'medium-low', 'medium', 'medium-high', 'high'];
              const outputIdx = levelOrder.indexOf(waterHeight);
              const inputIdx = Math.min(4, outputIdx + 2);
              const inputLevel = levelOrder[inputIdx];
              const outputLevel = waterHeight;

              const inputColor = levelColors[inputLevel] || levelColors['medium'];
              const outputColor = levelColors[outputLevel] || levelColors['medium'];
              const gradientId = `waterfall-${inputLevel}-${outputLevel}`;

              return (
                <svg width={size} height={size} viewBox="0 0 50 50" className="absolute inset-0">
                  <defs>
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={inputColor.start} />
                      <stop offset="30%" stopColor={inputColor.end} />
                      <stop offset="70%" stopColor={outputColor.start} />
                      <stop offset="100%" stopColor={outputColor.end} />
                    </linearGradient>
                  </defs>
                  <rect x={25 - 7.5 * widthScale} y="5" width={15 * widthScale} height="40"
                    fill={`url(#${gradientId})`}
                    stroke={outputColor.end}
                    strokeWidth="1.5" />

                  <path d="M 25 12 L 25 38 M 20 33 L 25 38 L 30 33"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.8" />

                  {flowAnimation && (
                    <>
                      <circle className="animate-drop" r="1.5" fill={inputColor.start} cx="20" cy="8" />
                      <circle className="animate-drop" r="1.5" fill={inputColor.start} cx="25" cy="8" style={{ animationDelay: '0.2s' }} />
                      <circle className="animate-drop" r="1.5" fill={inputColor.start} cx="30" cy="8" style={{ animationDelay: '0.4s' }} />
                      <circle r="3" fill={outputColor.mid} opacity="0.6" cx="25" cy="42">
                        <animate attributeName="r" values="0;4;0" dur="0.8s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.8;0;0.8" dur="0.8s" repeatCount="indefinite" />
                      </circle>
                    </>
                  )}
                </svg>
              );
            })()}
          </div>
        )}
        {tile.type === 'waterfall-large' && (
          <div className="w-full h-full flex items-center justify-center relative">
            {(() => {
              // Large waterfall: always drops from high to low (skips medium)
              // Color definitions
              const highColor = { start: '#bfdbfe', mid: '#93c5fd', end: '#93c5fd' };
              const lowColor = { start: '#3b82f6', mid: '#2563eb', end: '#1e40af' };

              return (
                <svg width={size} height={size} viewBox="0 0 50 50" className="absolute inset-0">
                  <defs>
                    <linearGradient id="waterfall-large-high-low" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={highColor.start} />
                      <stop offset="20%" stopColor={highColor.end} />
                      <stop offset="50%" stopColor="#60a5fa" />
                      <stop offset="80%" stopColor={lowColor.start} />
                      <stop offset="100%" stopColor={lowColor.end} />
                    </linearGradient>
                  </defs>
                  <rect x={25 - 7.5 * widthScale} y="5" width={15 * widthScale} height="40"
                    fill="url(#waterfall-large-high-low)"
                    stroke={lowColor.end}
                    strokeWidth="1.5" />

                  <path d="M 25 10 L 25 38 M 20 33 L 25 38 L 30 33 M 20 25 L 25 30 L 30 25"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.8" />

                  {flowAnimation && (
                    <>
                      <circle className="animate-drop" r="1.5" fill={highColor.start} cx="20" cy="8" />
                      <circle className="animate-drop" r="1.5" fill={highColor.start} cx="25" cy="8" style={{ animationDelay: '0.2s' }} />
                      <circle className="animate-drop" r="1.5" fill={highColor.start} cx="30" cy="8" style={{ animationDelay: '0.4s' }} />
                      <circle r="3" fill={lowColor.mid} opacity="0.6" cx="25" cy="42">
                        <animate attributeName="r" values="0;4;0" dur="0.8s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.8;0;0.8" dur="0.8s" repeatCount="indefinite" />
                      </circle>
                    </>
                  )}
                </svg>
              );
            })()}
          </div>
        )}
        {tile.type === 'waterfall-scaled' && (
          <div className="w-full h-full flex items-center justify-center relative">
            {(() => {
              // Scaled waterfall: continuous drop based on dropFraction
              // dropFraction represents the fraction of total voltage drop (0-1)
              const dropFraction = tile.dropFraction || 0.5;

              // Color definitions for interpolation - from light (high) to dark (low)
              const colorStops = [
                { level: 0, color: { r: 30, g: 64, b: 175 } },   // low - dark blue (#1e40af)
                { level: 1, color: { r: 59, g: 130, b: 246 } },  // medium-low (#3b82f6)
                { level: 2, color: { r: 96, g: 165, b: 250 } },  // medium (#60a5fa)
                { level: 3, color: { r: 147, g: 197, b: 253 } }, // medium-high (#93c5fd)
                { level: 4, color: { r: 191, g: 219, b: 254 } }  // high - light blue (#bfdbfe)
              ];

              // Interpolate color for a given level (0-4)
              const getColorAtLevel = (level) => {
                const clampedLevel = Math.max(0, Math.min(4, level));
                const lowerIdx = Math.floor(clampedLevel);
                const upperIdx = Math.min(4, lowerIdx + 1);
                const t = clampedLevel - lowerIdx;

                const lower = colorStops[lowerIdx].color;
                const upper = colorStops[upperIdx].color;

                return {
                  r: Math.round(lower.r + (upper.r - lower.r) * t),
                  g: Math.round(lower.g + (upper.g - lower.g) * t),
                  b: Math.round(lower.b + (upper.b - lower.b) * t)
                };
              };

              // Get input and output levels from the cell or calculate
              const inputLevel = tile.inputLevel ?? 4; // Default to high
              const outputLevel = tile.outputLevel ?? (inputLevel - dropFraction * 4);

              // Get colors for gradient
              const inputColor = getColorAtLevel(inputLevel);
              const outputColor = getColorAtLevel(outputLevel);
              const midColor = getColorAtLevel((inputLevel + outputLevel) / 2);

              const inputColorStr = `rgb(${inputColor.r}, ${inputColor.g}, ${inputColor.b})`;
              const midColorStr = `rgb(${midColor.r}, ${midColor.g}, ${midColor.b})`;
              const outputColorStr = `rgb(${outputColor.r}, ${outputColor.g}, ${outputColor.b})`;

              const gradientId = `waterfall-scaled-${inputLevel.toFixed(2)}-${outputLevel.toFixed(2)}`;

              // Scale width based on drop fraction (larger drops = wider waterfall)
              const baseWidth = 10 + dropFraction * 5; // 10-15 based on drop size

              return (
                <svg width={size} height={size} viewBox="0 0 50 50" className="absolute inset-0">
                  <defs>
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={inputColorStr} />
                      <stop offset="50%" stopColor={midColorStr} />
                      <stop offset="100%" stopColor={outputColorStr} />
                    </linearGradient>
                  </defs>
                  <rect x={25 - baseWidth * widthScale / 2} y="5" width={baseWidth * widthScale} height="40"
                    fill={`url(#${gradientId})`}
                    stroke={outputColorStr}
                    strokeWidth="1.5" />

                  {/* Arrow(s) based on drop size */}
                  {dropFraction > 0.5 ? (
                    // Larger drops get double arrow
                    <path d="M 25 10 L 25 38 M 20 33 L 25 38 L 30 33 M 20 25 L 25 30 L 30 25"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.8" />
                  ) : (
                    // Smaller drops get single arrow
                    <path d="M 25 12 L 25 38 M 20 33 L 25 38 L 30 33"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.8" />
                  )}

                  {flowAnimation && (
                    <>
                      <circle className="animate-drop" r="1.5" fill={inputColorStr} cx="20" cy="8" />
                      <circle className="animate-drop" r="1.5" fill={inputColorStr} cx="25" cy="8" style={{ animationDelay: '0.2s' }} />
                      <circle className="animate-drop" r="1.5" fill={inputColorStr} cx="30" cy="8" style={{ animationDelay: '0.4s' }} />
                      <circle r="3" fill={midColorStr} opacity="0.6" cx="25" cy="42">
                        <animate attributeName="r" values="0;4;0" dur="0.8s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.8;0;0.8" dur="0.8s" repeatCount="indefinite" />
                      </circle>
                    </>
                  )}
                </svg>
              );
            })()}
          </div>
        )}
        {tile.type === 'junction' && (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Solid filled T-junction - each branch width scales with its current */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg width={size} height={size} viewBox="0 0 50 50">
                {/* T-shaped junction with per-branch widths */}
                {(() => {
                  const rot = tile.rotation || 0;

                  // Map local directions to grid directions based on rotation
                  // Local: left=[0,-1], right=[0,1], down=[1,0] (stem)
                  // These get rotated by CSS, so we need to map them to grid directions
                  let gridDirLeft, gridDirRight, gridDirDown;
                  if (rot === 0) {
                    gridDirLeft = '0,-1'; gridDirRight = '0,1'; gridDirDown = '1,0';
                  } else if (rot === 90) {
                    gridDirLeft = '-1,0'; gridDirRight = '1,0'; gridDirDown = '0,-1';
                  } else if (rot === 180) {
                    gridDirLeft = '0,1'; gridDirRight = '0,-1'; gridDirDown = '-1,0';
                  } else { // 270
                    gridDirLeft = '1,0'; gridDirRight = '-1,0'; gridDirDown = '0,1';
                  }

                  // Get current for each branch direction
                  const getWidthForDir = (gridDir) => {
                    if (!dirCurrents || !dirCurrents[gridDir]) return pipeWidth;
                    const dirCurrent = dirCurrents[gridDir];
                    const dirWidthScale = 0.05 + Math.pow(dirCurrent, 2) * 0.95;
                    return 7.5 * dirWidthScale;
                  };

                  const leftWidth = getWidthForDir(gridDirLeft);
                  const rightWidth = getWidthForDir(gridDirRight);
                  const stemWidth = getWidthForDir(gridDirDown);

                  const leftOffset = (7.5 - leftWidth) / 2;
                  const rightOffset = (7.5 - rightWidth) / 2;
                  const stemOffset = (7.5 - stemWidth) / 2;

                  // Center junction box (where all branches meet)
                  const centerSize = Math.max(leftWidth, rightWidth, stemWidth);
                  const centerOffset = (7.5 - centerSize) / 2;

                  return (
                    <>
                      {/* Center box */}
                      <rect x={21.25 + centerOffset} y={21.25 + centerOffset} width={centerSize} height={centerSize} fill={color.solid} />
                      {/* Left branch */}
                      <rect x="0" y={21.25 + leftOffset} width={25 - centerOffset} height={leftWidth} fill={color.solid} stroke={color.border} strokeWidth="0.5" />
                      {/* Right branch */}
                      <rect x={25 + centerOffset} y={21.25 + rightOffset} width={25 - centerOffset} height={rightWidth} fill={color.solid} stroke={color.border} strokeWidth="0.5" />
                      {/* Down stem */}
                      <rect x={21.25 + stemOffset} y={25 + centerOffset} width={stemWidth} height={25 - centerOffset} fill={color.solid} stroke={color.border} strokeWidth="0.5" />
                    </>
                  );
                })()}
                {flowAnimation && flowDir && (
                  <>
                    {/* JUNCTION FLOW ANIMATION SYSTEM */}
                    {(() => {
                      // Normalize flowDir to always be an array
                      const flowDirs = Array.isArray(flowDir) ? flowDir : [flowDir];

                      // Determine which edges have INFLOW (water entering the junction)
                      // 
                      // IMPORTANT: flowDirs is an array of "entry directions" stored by the trace function.
                      // Each entry direction represents the DIRECTION WE TRAVELED to reach this cell.
                      // 
                      // Example: If we're at cell [3,2] and flowDirs contains [0,1]:
                      //   - [0,1] means row_delta=0, col_delta=1
                      //   - This means we moved RIGHT (increased column by 1) to get here
                      //   - So we came FROM the cell to our LEFT [3,1]
                      //   - Therefore, water is ENTERING from the LEFT edge
                      // 
                      // Direction format: [row_delta, col_delta]
                      //   [-1, 0] = moved UP (decreased row)
                      //   [1, 0]  = moved DOWN (increased row)
                      //   [0, -1] = moved LEFT (decreased col)
                      //   [0, 1]  = moved RIGHT (increased col)
                      //
                      // ORIGINAL LOGIC (keeping this for manual debugging):
                      // hasInflowUp: true if ANY direction in flowDirs has row_delta === -1 (moved UP)
                      const hasInflowUp = flowDirs.some(dir => dir[0] === -1);
                      // hasInflowDown: true if ANY direction has row_delta === 1 (moved DOWN)
                      const hasInflowDown = flowDirs.some(dir => dir[0] === 1);
                      // hasInflowLeft: true if ANY direction has col_delta === -1 (moved LEFT)
                      const hasInflowLeft = flowDirs.some(dir => dir[1] === -1);
                      // hasInflowRight: true if ANY direction has col_delta === 1 (moved RIGHT)
                      const hasInflowRight = flowDirs.some(dir => dir[1] === 1);
                      
                      // Junction T-shape in LOCAL SVG coords: connects LEFT (x=0), RIGHT (x=50), DOWN (y=50)
                      // The stem points DOWN, horizontal bar at top.
                      //
                      // After CSS rotation, local directions map to grid directions:
                      // rotation 0:   local-left → grid-left, local-right → grid-right, local-down → grid-down
                      // rotation 90:  local-left → grid-up,   local-right → grid-down,  local-down → grid-left
                      // rotation 180: local-left → grid-right, local-right → grid-left, local-down → grid-up
                      // rotation 270: local-left → grid-down, local-right → grid-up,   local-down → grid-right
                      //
                      // hasInflowXXX variables indicate we TRAVELED in direction XXX to reach this cell:
                      // hasInflowUp (dir[0]===-1): moved UP → came from cell BELOW → water enters from grid-DOWN edge
                      // hasInflowDown (dir[0]===1): moved DOWN → came from cell ABOVE → water enters from grid-UP edge
                      // hasInflowLeft (dir[1]===-1): moved LEFT → came from cell to RIGHT → water enters from grid-RIGHT edge
                      // hasInflowRight (dir[1]===1): moved RIGHT → came from cell to LEFT → water enters from grid-LEFT edge

                      // Rename for clarity: these indicate which GRID EDGE water enters from
                      const entryFromGridDown = hasInflowUp;    // moved UP → came from below
                      const entryFromGridUp = hasInflowDown;    // moved DOWN → came from above
                      const entryFromGridRight = hasInflowLeft; // moved LEFT → came from right
                      const entryFromGridLeft = hasInflowRight; // moved RIGHT → came from left

                      const rot = tile.rotation || 0;

                      // Determine which LOCAL edges have inflow based on rotation
                      // We need to map grid-edge entries to local-edge entries
                      let entryFromLocalLeft = false;
                      let entryFromLocalRight = false;
                      let entryFromLocalDown = false;

                      if (rot === 0) {
                        entryFromLocalLeft = entryFromGridLeft;
                        entryFromLocalRight = entryFromGridRight;
                        entryFromLocalDown = entryFromGridDown;
                      } else if (rot === 90) {
                        // local-left → grid-up, local-right → grid-down, local-down → grid-left
                        entryFromLocalLeft = entryFromGridUp;
                        entryFromLocalRight = entryFromGridDown;
                        entryFromLocalDown = entryFromGridLeft;
                      } else if (rot === 180) {
                        // local-left → grid-right, local-right → grid-left, local-down → grid-up
                        entryFromLocalLeft = entryFromGridRight;
                        entryFromLocalRight = entryFromGridLeft;
                        entryFromLocalDown = entryFromGridUp;
                      } else { // 270
                        // local-left → grid-down, local-right → grid-up, local-down → grid-right
                        entryFromLocalLeft = entryFromGridDown;
                        entryFromLocalRight = entryFromGridUp;
                        entryFromLocalDown = entryFromGridRight;
                      }

                      // Bubble colors - white/light gray for visibility
                      const bubbleColors = {
                        high: { inflow: '#ffffff', outflow: '#e5e7eb' },
                        medium: { inflow: '#ffffff', outflow: '#e5e7eb' },
                        low: { inflow: '#e5e7eb', outflow: '#d1d5db' }
                      };
                      const colors = bubbleColors[waterHeight] || bubbleColors.medium;

                      return (
                        <>
                          {/* INFLOW BUBBLES: Animate from edge TO center */}

                          {/* LEFT INFLOW */}
                          {entryFromLocalLeft && (
                            <circle r="2" fill={colors.inflow} className="animate-flow-dot">
                              <animateMotion dur="1s" repeatCount="indefinite" path="M 0 25 L 25 25" />
                            </circle>
                          )}

                          {/* RIGHT INFLOW */}
                          {entryFromLocalRight && (
                            <circle r="2" fill={colors.inflow} className="animate-flow-dot">
                              <animateMotion dur="1s" repeatCount="indefinite" path="M 50 25 L 25 25" />
                            </circle>
                          )}

                          {/* DOWN INFLOW */}
                          {entryFromLocalDown && (
                            <circle r="2" fill={colors.inflow} className="animate-flow-dot">
                              <animateMotion dur="1s" repeatCount="indefinite" path="M 25 50 L 25 25" />
                            </circle>
                          )}

                          {/* OUTFLOW BUBBLES: Animate from center TO edge */}
                          {/* Show outflow on edges that are connected but have no inflow */}

                          {/* LEFT OUTFLOW */}
                          {!entryFromLocalLeft && (
                            <circle r="2" fill={colors.outflow} className="animate-flow-dot">
                              <animateMotion dur="1s" repeatCount="indefinite" path="M 25 25 L 0 25" />
                            </circle>
                          )}

                          {/* RIGHT OUTFLOW */}
                          {!entryFromLocalRight && (
                            <circle r="2" fill={colors.outflow} className="animate-flow-dot">
                              <animateMotion dur="1s" repeatCount="indefinite" path="M 25 25 L 50 25" />
                            </circle>
                          )}

                          {/* DOWN OUTFLOW */}
                          {!entryFromLocalDown && (
                            <circle r="2" fill={colors.outflow} className="animate-flow-dot">
                              <animateMotion dur="1s" repeatCount="indefinite" path="M 25 25 L 25 50" />
                            </circle>
                          )}
                        </>
                      );
                    })()}
                  </>
                )}
              </svg>
            </div>
          </div>
        )}
      </div>
    );
  };

  const level = levels[currentLevel];

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-800 to-slate-900 text-white p-4 overflow-auto">
      <style>{`
        @keyframes flow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes shimmer {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.6; }
        }
        
        @keyframes pump {
          0%, 100% { transform: translateY(20px); opacity: 0; }
          50% { transform: translateY(-20px); opacity: 0.8; }
        }
        
        @keyframes rise {
          0% { height: 0%; }
          50% { height: 60%; }
          100% { height: 0%; }
        }
        
        @keyframes drop {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(25px); opacity: 0; }
        }
        
        .animate-flow {
          animation: flow 2s linear infinite;
        }
        
        .animate-shimmer {
          animation: shimmer 1.5s ease-in-out infinite;
        }
        
        .animate-pump {
          animation: pump 1s ease-in-out infinite;
        }
        
        .animate-rise {
          animation: rise 2s ease-in-out infinite;
        }
        
        .animate-drop {
          animation: drop 0.8s linear infinite;
        }
        
        .animate-flow-dot {
          filter: drop-shadow(0 0 2px rgba(219, 234, 254, 0.8));
        }

        /* 3D perspective styles */
        .perspective-container {
          perspective: 1000px;
          perspective-origin: center 40%;
        }

        .grid-3d {
          transform-style: preserve-3d;
          /* Transform applied via inline style for draggable rotation */
        }

        .grid-2d {
          transform: rotateX(0deg) rotateZ(0deg);
          transition: transform 0.5s ease-out;
        }

        .cell-3d {
          transform-style: preserve-3d;
          transition: transform 0.6s ease-out, box-shadow 0.3s;
        }

        /* Height levels for flat cells (channels, corners, junctions) - 5 levels */
        .cell-high {
          transform: translateZ(50px);
          box-shadow: 0 25px 20px -10px rgba(0, 0, 0, 0.4);
        }

        .cell-medium-high {
          transform: translateZ(37.5px);
          box-shadow: 0 20px 18px -9px rgba(0, 0, 0, 0.38);
        }

        .cell-medium {
          transform: translateZ(25px);
          box-shadow: 0 15px 15px -8px rgba(0, 0, 0, 0.35);
        }

        .cell-medium-low {
          transform: translateZ(12.5px);
          box-shadow: 0 12px 12px -6px rgba(0, 0, 0, 0.32);
        }

        .cell-low {
          transform: translateZ(0px);
          box-shadow: 0 8px 10px -5px rgba(0, 0, 0, 0.3);
        }

        .cell-below {
          transform: translateZ(-25px);
          box-shadow: 0 5px 15px -3px rgba(220, 38, 38, 0.6);
        }

        .cell-flat {
          transform: translateZ(0px);
        }

        /* Transitional elements (waterfalls, pumps) - tilted ramps */
        /* These use inline styles for rotation-dependent transforms */
      `}</style>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold mb-2">Circuit Water Flow Game</h1>
          <h2 className="text-xl text-blue-300">{level.name}</h2>
          <p className="text-gray-300">{level.description}</p>
        </div>

        <div className="flex gap-4 mb-4 justify-center flex-wrap">
          <button
            onClick={() => {
              setIsAnimating(false);
              setView3D(false);
              setGameState('playing');
              // Reset the grid
              const newGrid = Array(level.gridSize.rows).fill(null).map(() =>
                Array(level.gridSize.cols).fill(null)
              );
              setGrid(newGrid);
              setHistory([]);
              setRedoStack([]);
              setElementValues({});
              setSelectedElement(null);
            }}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded flex items-center gap-2"
          >
            <Home size={20} />
            Reset Level
          </button>

          {/* Undo/Redo buttons */}
          <div className="flex gap-1">
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className={`px-3 py-2 rounded flex items-center gap-1 ${
                history.length === 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-700 hover:bg-slate-600'
              }`}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={18} />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className={`px-3 py-2 rounded flex items-center gap-1 ${
                redoStack.length === 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-700 hover:bg-slate-600'
              }`}
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 size={18} />
            </button>
          </div>

          <button
            onClick={handleAnimate}
            className={`px-6 py-2 rounded flex items-center gap-2 ${
              isAnimating
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            <Play size={20} />
            {isAnimating ? 'Stop Animation' : (levels[currentLevel].isPlayground ? 'Analyze & Animate' : 'Animate Water Flow')}
          </button>
          {/* 3D toggle - always visible for preview, works during building and animation */}
          {!levels[currentLevel].isPlayground && (
            <div className="flex items-center gap-3 bg-slate-700 px-3 py-2 rounded">
              <span className={`text-sm ${!view3D ? 'text-white font-bold' : 'text-gray-400'}`}>2D</span>
              <button
                onClick={toggle3DView}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  view3D ? 'bg-purple-600' : 'bg-slate-500'
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-all duration-200 ${
                    view3D ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className={`text-sm ${view3D ? 'text-white font-bold' : 'text-gray-400'}`}>3D</span>
              {view3D && (
                <>
                  <button
                    onClick={reset3DRotation}
                    className="ml-2 px-2 py-1 text-xs bg-slate-600 hover:bg-slate-500 rounded"
                    title="Reset rotation"
                  >
                    Reset
                  </button>
                  <span className="text-xs text-gray-400 ml-1">(drag to rotate)</span>
                  {!isAnimating && <span className="text-xs text-yellow-400 ml-2">(Preview)</span>}
                </>
              )}
            </div>
          )}
          {currentLevel > 0 && (
            <button
              onClick={() => {
                setIsAnimating(false);
                setView3D(false);
                setGameState('playing');
                setCurrentLevel(currentLevel - 1);
              }}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded flex items-center gap-2"
            >
              <SkipBack size={20} />
              Previous
            </button>
          )}
          {currentLevel < levels.length - 1 && (
            <button
              onClick={() => {
                setIsAnimating(false);
                setView3D(false);
                setGameState('playing');
                setCurrentLevel(currentLevel + 1);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-2"
            >
              <SkipForward size={20} />
              Next
            </button>
          )}
        </div>

        {/* Keyboard shortcuts bar */}
        <div className="mb-3 px-3 py-2 bg-slate-800 rounded text-xs text-gray-400 flex flex-wrap gap-x-4 gap-y-1 justify-center">
          <span><kbd className="px-1 bg-slate-700 rounded">1-{levels[currentLevel].isPlayground ? '5' : '7'}</kbd> Select</span>
          <span><kbd className="px-1 bg-slate-700 rounded">R</kbd>/<kbd className="px-1 bg-slate-700 rounded">E</kbd> Rotate</span>
          <span><kbd className="px-1 bg-slate-700 rounded">D</kbd> Delete mode</span>
          {levels[currentLevel].isPlayground && <span><kbd className="px-1 bg-slate-700 rounded">S</kbd> Select mode</span>}
          <span><kbd className="px-1 bg-slate-700 rounded">Esc</kbd> Deselect</span>
          <span><kbd className="px-1 bg-slate-700 rounded">Ctrl+Z</kbd>/<kbd className="px-1 bg-slate-700 rounded">Y</kbd> Undo/Redo</span>
          <span className="text-blue-400">Drag to place/move | Right-click to remove</span>
        </div>

        {gameState === 'success' && (
          <div className="bg-green-600 text-white p-4 rounded mb-4 text-center text-xl font-bold animate-pulse">
            🎉 Perfect! The water flows correctly! 🎉
          </div>
        )}

        {gameState === 'disaster' && (
          <div className="bg-red-600 text-white p-4 rounded mb-4 text-center relative">
            <button
              onClick={() => {
                setGameState('playing');
                setFailureHint('');
              }}
              className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-red-800 hover:bg-red-900 rounded-full text-white font-bold text-sm"
              title="Dismiss"
            >
              ✕
            </button>
            <div className="text-xl font-bold">
              💥 DISASTER! Water is flooding everywhere! 💥
            </div>
            {failureHint && (
              <div className="mt-2 text-sm bg-red-700 rounded p-2">
                💡 Hint: {failureHint}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-6 mb-4">
          {/* Circuit Diagram - hide in playground mode */}
          {!levels[currentLevel].isPlayground && (
            <div className="bg-slate-700 p-4 rounded-lg flex-shrink-0">
              <h3 className="text-xl font-bold mb-3">Circuit Diagram</h3>
              <div className="bg-white rounded p-2">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={320}
                  className="border-2 border-gray-300"
                />
              </div>
            </div>
          )}

          {/* Water Grid / Circuit Grid */}
          <div className="bg-slate-700 p-4 rounded-lg flex-1">
            <h3 className="text-xl font-bold mb-3">
              {levels[currentLevel].isPlayground
                ? (playgroundMode === 'circuit' ? 'Build Your Circuit' : 'Water Flow Equivalent')
                : 'Water Flow Grid'
              }
              {view3D && <span className="text-sm text-blue-300 ml-2">(3D View)</span>}
            </h3>

            {/* Color Legend - show when animating */}
            {isAnimating && gameState === 'success' && (
              <div className="mb-3 flex items-center gap-3">
                <span className="text-sm text-gray-300">Voltage:</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">High</span>
                  <div
                    className="w-32 h-4 rounded"
                    style={{
                      background: 'linear-gradient(to right, #bfdbfe, #93c5fd, #60a5fa, #3b82f6, #1e40af)'
                    }}
                  />
                  <span className="text-xs text-gray-400">Low</span>
                </div>
                <span className="text-xs text-gray-500 ml-2">(Light = high voltage, Dark = low voltage)</span>
              </div>
            )}
            <div
              ref={grid3DRef}
              className={`bg-slate-600 p-4 rounded inline-block ${view3D ? 'perspective-container' : ''} ${view3D ? 'cursor-grab' : ''} ${isDragging3D ? 'cursor-grabbing' : ''}`}
              onMouseDown={handle3DMouseDown}
              onMouseMove={handle3DMouseMove}
              onMouseUp={handle3DMouseUp}
              onMouseLeave={handle3DMouseUp}
            >
              <div
                className={view3D ? 'grid-3d' : 'grid-2d'}
                style={view3D ? {
                  transform: `rotateX(${rotation3D.x}deg) rotateZ(${rotation3D.z}deg)`
                } : undefined}
              >
                {grid.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex" style={{ transformStyle: 'preserve-3d' }}>
                    {row.map((cell, colIndex) => {
                      // Get water level from calculated waterLevels
                      const cellKey = `${rowIndex},${colIndex}`;
                      let waterHeight = waterLevels.levels?.[cellKey] || 'medium';
                      // Get input height, with fallback calculation for waterfalls
                      let inputHeight = waterLevels.inputLevels?.[cellKey];
                      if (!inputHeight && cell?.type?.includes('waterfall')) {
                        // Infer input level from output level and waterfall type
                        const levelOrder = ['low', 'medium-low', 'medium', 'medium-high', 'high'];
                        const outputIdx = levelOrder.indexOf(waterHeight);
                        let dropAmount = 0;
                        if (cell.type === 'waterfall-tiny') dropAmount = 1;
                        else if (cell.type === 'waterfall') dropAmount = 2;
                        else if (cell.type === 'waterfall-large') dropAmount = 4;
                        else if (cell.type === 'waterfall-scaled') dropAmount = (cell.dropFraction || 0.5) * 4;
                        inputHeight = levelOrder[Math.min(4, Math.round(outputIdx + dropAmount))] || waterHeight;
                      }
                      if (!inputHeight) inputHeight = waterHeight;

                      // For pump, use 'high' as it's the source
                      if (cell?.type === 'pump') {
                        waterHeight = 'high';
                      }

                      // Check if this is a transitional element (waterfall or pump)
                      const isWaterfall = cell?.type === 'waterfall' || cell?.type === 'waterfall-large' || cell?.type === 'waterfall-tiny' || cell?.type === 'waterfall-scaled';
                      const isPump = cell?.type === 'pump';
                      const isTransitional = isWaterfall || isPump;

                      // Calculate 3D transform for this cell
                      let transform3D = '';
                      let elevationClass = 'cell-flat';

                      if (view3D && cell) {
                        if (isTransitional) {
                          // Transitional elements are tilted ramps connecting two heights
                          // They sit at the midpoint height and tilt to span the height difference
                          const rotation = cell.rotation || 0;

                          // Height values in pixels (Z axis = elevation) - 5 levels + below for errors
                          const levelToZ = {
                            'high': 50,
                            'medium-high': 37.5,
                            'medium': 25,
                            'medium-low': 12.5,
                            'low': 0,
                            'below': -25
                          };

                          // Determine the height levels this element connects
                          let highSideZ, lowSideZ;

                          // For scaled waterfalls, use continuous levels directly
                          if (cell.type === 'waterfall-scaled' && cell.inputLevel !== undefined && cell.outputLevel !== undefined) {
                            // Convert continuous level to Z (can be negative for error states)
                            highSideZ = (cell.inputLevel / 4) * 50;
                            lowSideZ = (cell.outputLevel / 4) * 50;
                          } else {
                            // Use ?? instead of || because levelToZ['low'] = 0 is falsy
                            const outputZ = levelToZ[waterHeight] ?? 25;
                            const inputZ = levelToZ[inputHeight] ?? 25;

                            if (isPump) {
                              // Pump: raises water from low to high
                              highSideZ = levelToZ['high'];
                              lowSideZ = levelToZ['low'];
                            } else {
                              // All waterfalls: use actual input and output levels
                              highSideZ = inputZ;
                              lowSideZ = outputZ;
                            }
                          }

                          // Position at midpoint height
                          const midZ = (highSideZ + lowSideZ) / 2;

                          // Calculate tilt angle based on height difference
                          const heightDiff = highSideZ - lowSideZ;
                          const cellSize = 48;
                          const tiltAngle = Math.atan2(heightDiff, cellSize) * (180 / Math.PI);

                          // Determine which edge should be elevated based on rotation
                          // For BOTH pump and waterfall:
                          // - The "high" side is where high water is
                          // - Pump: arrow points to output (high side)
                          // - Waterfall: arrow points to drop direction (low side), so high is opposite
                          //
                          // In our 3D view (rotateX 50deg looking from above-front):
                          // - "Back" of grid (smaller row index / up direction) appears elevated
                          // - "Front" (larger row index / down direction) appears lower
                          //
                          // rotation 0 (pump arrow UP, waterfall drops DOWN):
                          //   - High side is BACK (up) for both → rotateX(+angle) raises back edge
                          // rotation 90 (pump arrow RIGHT, waterfall drops LEFT):
                          //   - High side is RIGHT for both → rotateY(-angle) raises right edge
                          // rotation 180 (pump arrow DOWN, waterfall drops UP):
                          //   - High side is FRONT (down) for both → rotateX(-angle) raises front edge
                          // rotation 270 (pump arrow LEFT, waterfall drops RIGHT):
                          //   - High side is LEFT for both → rotateY(+angle) raises left edge

                          // In our 3D view (grid has rotateX(50deg)), we're looking from above-front.
                          // Front/back tilts need rotateX, left/right tilts need rotateY

                          if (rotation === 0) {
                            // Flow vertical, high side at back → raise back edge
                            transform3D = `translateZ(${midZ}px) rotateX(${-tiltAngle}deg)`;
                          } else if (rotation === 90) {
                            // Flow horizontal to right, high side at right → raise right edge
                            transform3D = `translateZ(${midZ}px) rotateY(${-tiltAngle}deg)`;
                          } else if (rotation === 180) {
                            // Flow vertical, high side at front → raise front edge
                            transform3D = `translateZ(${midZ}px) rotateX(${tiltAngle}deg)`;
                          } else { // 270
                            // Flow horizontal to left, high side at left → raise left edge
                            transform3D = `translateZ(${midZ}px) rotateY(${tiltAngle}deg)`;
                          }

                          elevationClass = 'cell-3d';
                        } else {
                          // Regular cells sit flat at their height level
                          // Apply translateZ based on water level
                          const levelToZ = {
                            'high': 50,
                            'medium-high': 37.5,
                            'medium': 25,
                            'medium-low': 12.5,
                            'low': 0,
                            'below': -25
                          };
                          const cellZ = levelToZ[waterHeight] ?? 25;
                          transform3D = `translateZ(${cellZ}px)`;
                          elevationClass = `cell-3d cell-${waterHeight}`;
                        }
                      }

                      const thisCellData = cellData[cellKey];

                      return (
                        <div
                          key={colIndex}
                          onClick={() => handleCellClick(rowIndex, colIndex)}
                          draggable={!!cell && !isAnimating}
                          onDragStart={(e) => cell && handleDragStart(e, cell.type, { row: rowIndex, col: colIndex })}
                          onDragEnd={handleDragEnd}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, rowIndex, colIndex)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            if (cell && !isAnimating) {
                              saveToHistory();
                              const newGrid = grid.map(r => r.map(c => c ? { ...c } : null));
                              newGrid[rowIndex][colIndex] = null;
                              setGrid(newGrid);
                              // Clear element value if it was a playground element
                              if (levels[currentLevel].isPlayground) {
                                const newValues = { ...elementValues };
                                delete newValues[cellKey];
                                setElementValues(newValues);
                              }
                              if (selectedElement === cellKey) {
                                setSelectedElement(null);
                              }
                            }
                          }}
                          onMouseEnter={(e) => {
                            if (cell && isAnimating) {
                              setHoveredCell(cellKey);
                              setTooltipPos({ x: e.clientX, y: e.clientY });
                            }
                          }}
                          onMouseMove={(e) => {
                            if (hoveredCell === cellKey) {
                              setTooltipPos({ x: e.clientX, y: e.clientY });
                            }
                          }}
                          onMouseLeave={() => setHoveredCell(null)}
                          className={`w-12 h-12 border border-slate-500 cursor-pointer hover:bg-slate-500 flex items-center justify-center relative ${
                            isAnimating && gameState === 'disaster' ? 'bg-red-900 animate-bounce' : ''
                          } ${elevationClass} ${cell && !isAnimating ? 'cursor-grab active:cursor-grabbing' : ''} group`}
                          style={{
                            transform: view3D && cell ? transform3D : undefined,
                            transformStyle: view3D ? 'preserve-3d' : undefined,
                            backgroundColor: view3D && cell ? (
                              isTransitional ? '#1e3a5f' :
                              (waterHeight === 'high' ? '#1e3a5f' : waterHeight === 'medium' ? '#1e3a5f' : '#1e293b')
                            ) : undefined,
                            zIndex: view3D ? (100 - rowIndex * 10 + (waterHeight === 'high' ? 3 : waterHeight === 'medium' ? 2 : 1)) : undefined
                          }}
                        >
                          {cell && (
                            levels[currentLevel].isPlayground && playgroundMode === 'circuit' && cell.type?.startsWith('c-')
                              ? renderCircuitTile(cell, 48, elementValues[cellKey], selectedElement === cellKey)
                              : renderWaterTile(cell, 48, waterHeight, flowDirections[cellKey], currentFlow[cellKey] || 1.0, directionalCurrents[cellKey])
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Value Editor - sidebar for playground circuit mode */}
          {levels[currentLevel].isPlayground && selectedElement && playgroundMode === 'circuit' && (
            <div className="bg-yellow-900 p-4 rounded-lg w-48 flex-shrink-0">
              <h3 className="text-lg font-bold mb-3">Edit Value</h3>
              {(() => {
                const [row, col] = selectedElement.split(',').map(Number);
                const cell = grid[row]?.[col];
                if (!cell) return null;
                const isBattery = cell.type === 'c-battery';
                const defaultValue = isBattery ? 10 : 100;
                const currentValue = elementValues[selectedElement] ?? defaultValue;
                const unit = isBattery ? 'V' : 'Ω';
                const label = isBattery ? 'Voltage' : 'Resistance';

                const handleValueChange = (newValue) => {
                  const parsed = parseFloat(newValue);
                  if (isNaN(parsed) || parsed < 0) {
                    // Reset to default if invalid
                    setElementValues(prev => ({
                      ...prev,
                      [selectedElement]: defaultValue
                    }));
                  } else {
                    setElementValues(prev => ({
                      ...prev,
                      [selectedElement]: parsed
                    }));
                  }
                };

                return (
                  <div className="flex flex-col gap-3">
                    <div className="text-sm text-yellow-200">{label}</div>

                    {/* Text input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={currentValue}
                        onChange={(e) => {
                          const val = e.target.value;
                          // Allow typing any number
                          if (val === '' || val === '-') {
                            setElementValues(prev => ({
                              ...prev,
                              [selectedElement]: val
                            }));
                          } else {
                            const parsed = parseFloat(val);
                            if (!isNaN(parsed)) {
                              setElementValues(prev => ({
                                ...prev,
                                [selectedElement]: parsed
                              }));
                            }
                          }
                        }}
                        onBlur={(e) => handleValueChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleValueChange(e.target.value);
                          }
                        }}
                        className="w-20 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-right text-white"
                      />
                      <span className="text-yellow-200">{unit}</span>
                    </div>

                    {/* Slider (0-100 range) */}
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.min(100, Math.max(0, currentValue))}
                      onChange={(e) => setElementValues(prev => ({
                        ...prev,
                        [selectedElement]: parseInt(e.target.value)
                      }))}
                      className="w-full"
                    />
                    <div className="text-xs text-yellow-300 text-center">
                      Slider: 0-100 (type for higher)
                    </div>

                    <button
                      onClick={() => setSelectedElement(null)}
                      className="mt-2 px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-sm"
                    >
                      Done
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Tile Palette - different tiles for playground vs regular levels */}
        {/* Hide palette in playground water mode (when animating) */}
        {!(levels[currentLevel].isPlayground && playgroundMode === 'water') && (
        <div className="mt-6 bg-slate-700 p-4 rounded-lg">
          <h3 className="text-xl font-bold mb-3">
            {levels[currentLevel].isPlayground && playgroundMode === 'circuit' ? 'Circuit Elements' : 'Water Tiles'}
          </h3>
          <div className="flex gap-4 items-center flex-wrap">
            {levels[currentLevel].isPlayground && playgroundMode === 'circuit' ? (
              // Circuit element palette for playground
              <>
                {circuitTileTypes.map((tile, index) => (
                  <div
                    key={tile.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, tile.type)}
                    onDragEnd={handleDragEnd}
                    onClick={() => { setSelectedTile(tile.type); setSelectedElement(null); }}
                    className={`p-4 rounded-lg border-4 transition-all cursor-grab active:cursor-grabbing relative ${
                      selectedTile === tile.type
                        ? 'border-yellow-400 bg-slate-600'
                        : 'border-slate-500 bg-slate-800 hover:bg-slate-600'
                    }`}
                    title={`${tile.label} (${index + 1})`}
                  >
                    <span className="absolute -top-2 -left-2 w-5 h-5 bg-slate-600 border border-slate-400 rounded text-xs flex items-center justify-center text-yellow-300 font-bold">{index + 1}</span>
                    <div className="mb-2">
                      {renderCircuitTile({ type: tile.type, rotation: rotation }, 60, tile.defaultValue)}
                    </div>
                    <div className="text-sm text-center">{tile.label}</div>
                    {tile.unit && <div className="text-xs text-blue-300 text-center">{tile.defaultValue}{tile.unit}</div>}
                  </div>
                ))}
                <button
                  onClick={() => { setSelectedTile(null); setSelectedElement(null); }}
                  className={`p-4 rounded-lg border-4 transition-all ${
                    selectedTile === null
                      ? 'border-yellow-400 bg-slate-600'
                      : 'border-slate-500 bg-slate-800 hover:bg-slate-600'
                  }`}
                >
                  <div className="w-[60px] h-[60px] flex items-center justify-center text-2xl">👆</div>
                  <div className="text-sm text-center">Select</div>
                  <div className="text-xs text-blue-300 text-center">Edit values</div>
                </button>
                <button
                  onClick={() => { setSelectedTile('eraser'); setSelectedElement(null); }}
                  className={`p-4 rounded-lg border-4 transition-all ${
                    selectedTile === 'eraser'
                      ? 'border-red-400 bg-red-900'
                      : 'border-slate-500 bg-slate-800 hover:bg-slate-600'
                  }`}
                >
                  <div className="w-[60px] h-[60px] flex items-center justify-center">
                    <Trash2 size={32} className="text-red-400" />
                  </div>
                  <div className="text-sm text-center">Eraser</div>
                  <div className="text-xs text-red-300 text-center">Remove</div>
                </button>
              </>
            ) : (
              // Water tile palette for regular levels
              <>
                {tileTypes.map((tile, index) => (
                  <div
                    key={tile.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, tile.type)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelectedTile(tile.type)}
                    className={`p-4 rounded-lg border-4 transition-all cursor-grab active:cursor-grabbing relative ${
                      selectedTile === tile.type
                        ? 'border-yellow-400 bg-slate-600'
                        : 'border-slate-500 bg-slate-800 hover:bg-slate-600'
                    }`}
                    title={`${tile.label} (${index + 1})`}
                  >
                    <span className="absolute -top-2 -left-2 w-5 h-5 bg-slate-600 border border-slate-400 rounded text-xs flex items-center justify-center text-yellow-300 font-bold">{index + 1}</span>
                    <div className="mb-2">
                      {renderWaterTile({ type: tile.type, rotation: rotation }, 60, 'medium')}
                    </div>
                    <div className="text-sm text-center">{tile.label}</div>
                    {tile.sublabel && <div className="text-xs text-blue-300 text-center">{tile.sublabel}</div>}
                  </div>
                ))}
                <button
                  onClick={() => setSelectedTile('eraser')}
                  className={`p-4 rounded-lg border-4 transition-all ${
                    selectedTile === 'eraser'
                      ? 'border-red-400 bg-red-900'
                      : 'border-slate-500 bg-slate-800 hover:bg-slate-600'
                  }`}
                >
                  <div className="w-[60px] h-[60px] flex items-center justify-center">
                    <Trash2 size={32} className="text-red-400" />
                  </div>
                  <div className="text-sm text-center">Eraser</div>
                  <div className="text-xs text-red-300 text-center">Remove</div>
                </button>
              </>
            )}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleRotateCounterClockwise}
                className="p-3 bg-purple-600 hover:bg-purple-700 rounded-lg flex flex-col items-center"
              >
                <RotateCcw size={28} />
              </button>
              <button
                onClick={handleRotate}
                className="p-3 bg-purple-600 hover:bg-purple-700 rounded-lg flex flex-col items-center"
              >
                <RotateCw size={28} />
              </button>
              <div className="text-xs text-gray-300 text-center">{rotation}°</div>
            </div>
          </div>
        </div>
        )}

        <div className="mt-4 bg-slate-700 p-4 rounded-lg">
          <h3 className="text-lg font-bold mb-2">How to Play:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
            {levels[currentLevel].isPlayground ? (
              <>
                <li>Select a circuit element from the palette above</li>
                <li>Use the Rotate buttons to orient it correctly</li>
                <li>Click on the grid to place, or drag elements from the palette</li>
                <li>Drag placed elements to move them</li>
                <li>Click "Select" mode, then click on a battery or resistor to edit its value</li>
                <li>Build a complete circuit with at least one battery and one resistor</li>
                <li>Click "Analyze & Animate" to see the water flow equivalent!</li>
                <li>Pipe width shows current, water height shows voltage</li>
              </>
            ) : (
              <>
                <li>Study the circuit diagram on the left - all resistors have equal resistance (R)</li>
                <li>Select a water tile from the palette below, or drag it onto the grid</li>
                <li>Drag placed tiles to move them</li>
                <li>Use the Rotate button to orient it correctly</li>
                <li>Recreate the circuit using water analogies: Pump = Battery, Waterfall = Resistor, Channel = Wire, Corner = 90° turn, 3-Way Junction = T-junction</li>
                <li>The height drop of each waterfall represents voltage drop across that resistor</li>
                <li>When ready, click "Animate Water Flow" to test your solution!</li>
              </>
            )}
          </ul>
        </div>
      </div>

      {/* Fixed tooltip for voltage/current - rendered outside grid to avoid 3D stacking issues */}
      {hoveredCell && cellData[hoveredCell] && isAnimating && gameState === 'success' && (
        <div
          className="fixed px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap pointer-events-none"
          style={{
            left: tooltipPos.x + 12,
            top: tooltipPos.y + 12,
            zIndex: 99999
          }}
        >
          {cellData[hoveredCell].voltage !== null && (
            <div>{(cellData[hoveredCell].voltageDrop !== null || cellData[hoveredCell].type === 'pump') ? 'Out V' : 'V'}: {cellData[hoveredCell].voltage}V</div>
          )}
          {cellData[hoveredCell].voltageDrop !== null && <div>ΔV: {cellData[hoveredCell].voltageDrop}V</div>}
          {/* Show current - either total or directional for junctions */}
          {cellData[hoveredCell].currentData?.total !== undefined && (
            <div>I: {cellData[hoveredCell].currentData.total.toFixed(2)}A</div>
          )}
          {cellData[hoveredCell].currentData?.directional && (
            Object.entries(cellData[hoveredCell].currentData.directional).map(([dir, curr]) => (
              <div key={dir}>I ({dir}): {curr.toFixed(2)}A</div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CircuitWaterGame;