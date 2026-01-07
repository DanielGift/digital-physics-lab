import React, { useState, useRef, useEffect } from 'react';
import { RotateCw, Play, SkipForward, Home } from 'lucide-react';

const CircuitWaterGame = () => {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [grid, setGrid] = useState([]);
  const [selectedTile, setSelectedTile] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [gameState, setGameState] = useState('playing'); // playing, success, disaster
  const [flowDirections, setFlowDirections] = useState({}); // tracks flow direction for each cell
  const canvasRef = useRef(null);

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
      name: "Level 3: Figure-8 Complex",
      description: "3 batteries and 5 resistors in a figure-8 pattern",
      gridSize: { rows: 8, cols: 10 },
      circuit: [
        // Top loop
        { type: 'battery', pos: [2, 1], dir: 'right' },
        { type: 'wire', pos: [3, 1], dir: 'horizontal' },
        { type: 'resistor', pos: [4, 1], dir: 'right' },
        { type: 'wire', pos: [5, 1], dir: 'horizontal' },
        { type: 'wire', pos: [5, 2], dir: 'vertical' },
        { type: 'resistor', pos: [5, 3], dir: 'down' },
        { type: 'wire', pos: [5, 4], dir: 'vertical' },
        { type: 'junction', pos: [5, 5], dir: 'cross' },
        { type: 'wire', pos: [4, 5], dir: 'horizontal' },
        { type: 'battery', pos: [3, 5], dir: 'left' },
        { type: 'wire', pos: [2, 5], dir: 'horizontal' },
        { type: 'wire', pos: [2, 4], dir: 'vertical' },
        { type: 'wire', pos: [2, 3], dir: 'vertical' },
        { type: 'wire', pos: [2, 2], dir: 'vertical' },
        // Bottom loop
        { type: 'wire', pos: [6, 5], dir: 'horizontal' },
        { type: 'resistor', pos: [7, 5], dir: 'right' },
        { type: 'wire', pos: [8, 5], dir: 'horizontal' },
        { type: 'wire', pos: [8, 6], dir: 'vertical' },
        { type: 'battery', pos: [8, 7], dir: 'down' },
        { type: 'wire', pos: [7, 7], dir: 'horizontal' },
        { type: 'resistor', pos: [6, 7], dir: 'left' },
        { type: 'wire', pos: [5, 7], dir: 'horizontal' },
        { type: 'wire', pos: [5, 6], dir: 'vertical' },
        { type: 'resistor', pos: [4, 3], dir: 'right' },
      ],
      solution: [
        { type: 'pump', pos: [2, 1], rotation: 0 },
        { type: 'channel', pos: [3, 1], rotation: 0 },
        { type: 'waterfall', pos: [4, 1], rotation: 0 },
        { type: 'corner', pos: [5, 1], rotation: 0 },
        { type: 'channel', pos: [5, 2], rotation: 90 },
        { type: 'waterfall', pos: [5, 3], rotation: 90 },
        { type: 'channel', pos: [5, 4], rotation: 90 },
        { type: 'junction', pos: [5, 5], rotation: 0 },
        { type: 'channel', pos: [4, 5], rotation: 0 },
        { type: 'pump', pos: [3, 5], rotation: 180 },
        { type: 'corner', pos: [2, 5], rotation: 90 },
        { type: 'channel', pos: [2, 4], rotation: 90 },
        { type: 'channel', pos: [2, 3], rotation: 90 },
        { type: 'corner', pos: [2, 2], rotation: 270 },
        { type: 'channel', pos: [6, 5], rotation: 0 },
        { type: 'waterfall', pos: [7, 5], rotation: 0 },
        { type: 'corner', pos: [8, 5], rotation: 0 },
        { type: 'channel', pos: [8, 6], rotation: 90 },
        { type: 'pump', pos: [8, 7], rotation: 90 },
        { type: 'channel', pos: [7, 7], rotation: 0 },
        { type: 'waterfall', pos: [6, 7], rotation: 180 },
        { type: 'corner', pos: [5, 7], rotation: 90 },
        { type: 'channel', pos: [5, 6], rotation: 90 },
        { type: 'waterfall', pos: [4, 3], rotation: 0 },
      ]
    }
  ];

  const tileTypes = [
    { type: 'channel', label: 'Channel', count: 20 },
    { type: 'corner', label: 'Corner', count: 15 },
    { type: 'pump', label: 'Pump', count: 5 },
    { type: 'waterfall', label: 'Small Drop', count: 8 },
    { type: 'waterfall-large', label: 'Large Drop', count: 8 },
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
  }, [currentLevel]);

  const handleCellClick = (row, col) => {
    if (!selectedTile || isAnimating) return;

    const newGrid = grid.map(r => [...r]);
    newGrid[row][col] = {
      type: selectedTile,
      rotation: rotation
    };
    setGrid(newGrid);
  };

  const handleRotate = () => {
    setRotation((rotation + 90) % 360);
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
    } else if (type === 'pump' || type === 'waterfall' || type === 'waterfall-large') {
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
      const counts = { pump: 0, waterfall: 0, 'waterfall-large': 0, channel: 0, corner: 0, junction: 0 };
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
    
    // First check: do we have the right number of CRITICAL components?
    // Channels and corners can vary based on layout, but pumps, waterfalls, and junctions must match
    const playerCounts = countComponents(grid);
    const solutionCounts = { pump: 0, waterfall: 0, 'waterfall-large': 0, channel: 0, corner: 0, junction: 0 };
    
    for (let sol of level.solution) {
      solutionCounts[sol.type]++;
    }
    
    console.log('Validation: Checking component counts...');
    
    // Validate critical components: pumps, waterfalls, waterfall-large, and junctions
    const criticalComponents = ['pump', 'waterfall', 'waterfall-large', 'junction'];
    for (let type of criticalComponents) {
      if (playerCounts[type] !== solutionCounts[type]) {
        return false;
      }
    }
    
    // Second check: verify all tiles are connected properly (no isolated pieces)
    // Find all non-empty cells
    const playerCells = [];
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        if (grid[row][col]) {
          playerCells.push([row, col]);
        }
      }
    }
    
    if (playerCells.length === 0) {
      console.log('No player cells found');
      return false;
    }
    
    console.log(`Total player cells: ${playerCells.length}`);
    
    // BFS to check connectivity
    const visited = new Set();
    const queue = [playerCells[0]];
    visited.add(`${playerCells[0][0]},${playerCells[0][1]}`);
    
    console.log(`Starting BFS from cell [${playerCells[0][0]},${playerCells[0][1]}] which is type: ${grid[playerCells[0][0]][playerCells[0][1]].type}`);
    
    while (queue.length > 0) {
      const [row, col] = queue.shift();
      const cell = grid[row][col];
      
      const connections = getConnections(cell.type, cell.rotation, row, col);
      console.log(`Cell [${row},${col}] (${cell.type}, rotation ${cell.rotation}) connects to:`, connections);
      
      for (let [nRow, nCol] of connections) {
        const key = `${nRow},${nCol}`;
        if (nRow >= 0 && nRow < grid.length && nCol >= 0 && nCol < grid[0].length) {
          const neighbor = grid[nRow][nCol];
          if (neighbor && !visited.has(key)) {
            // Check if neighbor connects back to this cell
            const neighborConnections = getConnections(neighbor.type, neighbor.rotation, nRow, nCol);
            const connectsBack = neighborConnections.some(([r, c]) => r === row && c === col);
            
            console.log(`  Checking neighbor [${nRow},${nCol}] (${neighbor.type}, rotation ${neighbor.rotation})`);
            console.log(`    Neighbor connects to:`, neighborConnections);
            console.log(`    Connects back? ${connectsBack}`);
            
            if (connectsBack) {
              visited.add(key);
              queue.push([nRow, nCol]);
            }
          } else if (!neighbor) {
            console.log(`  [${nRow},${nCol}] is empty`);
          }
        }
      }
    }
    
    console.log(`Connected cells: ${visited.size} out of ${playerCells.length}`);
    
    // All tiles should be connected
    if (visited.size !== playerCells.length) {
      return false;
    }
    
    // If we have the right components and they're all connected, it's correct!
    return true;
  };

  const handleAnimate = () => {
    if (isAnimating) {
      // Stop animation
      setIsAnimating(false);
      setGameState('playing');
      return;
    }
    
    const isCorrect = checkSolution();
    
    if (isCorrect) {
      // Calculate flow directions before starting animation
      calculateFlowDirections();
      setGameState('success');
      setIsAnimating(true);
      // Animation continues indefinitely until stopped
    } else {
      setGameState('disaster');
      setIsAnimating(true);
      setTimeout(() => {
        setIsAnimating(false);
        setGameState('playing');
      }, 3000);
    }
  };

  const calculateFlowDirections = () => {
    console.log('=== CALCULATING FLOW DIRECTIONS ===');
    
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
    
    if (!pumpCell) {
      console.log('No pump found!');
      return;
    }
    
    console.log(`Pump found at [${pumpRow},${pumpCol}] with rotation ${pumpCell.rotation}°`);
    
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
    
    console.log(`Pump output direction: ${directionName(outputDir)}`);
    
    // Trace the circuit from pump output
    // For junctions, we need to track ALL flows, so use arrays
    const directions = {};
    
    // SPECIAL HANDLING FOR LEVEL 2 (Parallel Circuit with 2 T-junctions)
    const isLevel2 = currentLevel === 1;
    const junctionsEncountered = []; // Track junctions in order: [first, second]
    
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
      const indent = '  '.repeat(depth);
      
      const cell = grid[row][col];
      if (!cell) return;
      
      // For junctions, we may visit multiple times from different directions
      // Store all entry directions in an array
      if (!directions[key]) {
        directions[key] = [];
      }
      
      // Check if we've already recorded this specific entry direction
      // This prevents infinite loops when the circuit forms a complete loop
      const alreadyHasThisDirection = directions[key].some(
        dir => dir[0] === entryDir[0] && dir[1] === entryDir[1]
      );
      
      if (alreadyHasThisDirection) {
        console.log(`${indent}[${row},${col}] ${cell.type} - Already traced from this direction, skipping`);
        return; // Already traced this path, stop to avoid infinite recursion
      }
      
      // Store the entry direction for this cell
      directions[key].push(entryDir);
      
      console.log(`${indent}[${row},${col}] ${cell.type} (rotation ${cell.rotation}°) - Flow entering from ${directionName(entryDir)}`);
      
      // LEVEL 2 SPECIFIC: Track junction encounters
      if (isLevel2 && cell.type === 'junction') {
        if (!junctionsEncountered.some(j => j.key === key)) {
          junctionsEncountered.push({ key, row, col, rotation: cell.rotation });
          console.log(`${indent}🔵 JUNCTION #${junctionsEncountered.length} encountered at [${row},${col}]`);
        }
      }
      
      // Get all cells this current cell connects to
      const connections = getConnections(cell.type, cell.rotation, row, col);
      
      // For each connected neighbor, trace the flow if it's NOT where we came from
      for (let [nRow, nCol] of connections) {
        // Calculate the reverse direction (from neighbor back to current cell)
        const reverseDir = [row - nRow, col - nCol];
        
        // Check if this neighbor is NOT where we came from
        // (reverseDir should NOT equal entryDir)
        if (!(reverseDir[0] === entryDir[0] && reverseDir[1] === entryDir[1])) {
          // This is an exit direction - calculate the direction TO the neighbor
          const exitDir = [nRow - row, nCol - col];
          console.log(`${indent}  → Exiting towards ${directionName(exitDir)} to [${nRow},${nCol}]`);
          
          // Recursively trace from the neighbor cell
          // The exitDir from this cell becomes the entryDir for the neighbor
          if (nRow >= 0 && nRow < grid.length && nCol >= 0 && nCol < grid[0].length) {
            trace(nRow, nCol, exitDir, depth + 1);
          }
        }
      }
    };
    
    // Start tracing from pump output
    const startRow = pumpRow + outputDir[0];
    const startCol = pumpCol + outputDir[1];
    directions[`${pumpRow},${pumpCol}`] = [outputDir];
    
    if (startRow >= 0 && startRow < grid.length && startCol >= 0 && startCol < grid[0].length) {
      console.log('\n--- FIRST PASS: Trace from pump ---');
      trace(startRow, startCol, outputDir, 0);
    }
    
    // LEVEL 2 SPECIFIC: After first pass, if we found 2 junctions, trace the second path
    if (isLevel2 && junctionsEncountered.length === 2) {
      console.log('\n--- LEVEL 2 SPECIAL: Tracing second path from first junction ---');
      const firstJunction = junctionsEncountered[0];
      const firstJunctionKey = firstJunction.key;
      const firstJunctionEntryDir = directions[firstJunctionKey][0]; // The direction we entered from
      
      console.log(`First junction at [${firstJunction.row},${firstJunction.col}] was entered from ${directionName(firstJunctionEntryDir)}`);
      console.log(`First junction connects to:`, getConnections('junction', firstJunction.rotation, firstJunction.row, firstJunction.col));
      
      // Get all connections from first junction
      const junctionConnections = getConnections('junction', firstJunction.rotation, firstJunction.row, firstJunction.col);
      
      // Find the connection we HAVEN'T traced yet
      for (let [nRow, nCol] of junctionConnections) {
        const reverseDir = [firstJunction.row - nRow, firstJunction.col - nCol];
        
        // Skip if this is where we came from
        if (reverseDir[0] === firstJunctionEntryDir[0] && reverseDir[1] === firstJunctionEntryDir[1]) {
          console.log(`  Skipping [${nRow},${nCol}] - that's where we came from`);
          continue;
        }
        
        const exitDir = [nRow - firstJunction.row, nCol - firstJunction.col];
        const neighborKey = `${nRow},${nCol}`;
        
        // Check if we've already traced TO this neighbor FROM the first junction
        const neighborCell = grid[nRow]?.[nCol];
        if (neighborCell) {
          const neighborDirections = directions[neighborKey] || [];
          const alreadyTracedThisExit = neighborDirections.some(
            dir => dir[0] === exitDir[0] && dir[1] === exitDir[1]
          );
          
          if (!alreadyTracedThisExit) {
            console.log(`  🔄 Tracing UNVISITED exit towards ${directionName(exitDir)} to [${nRow},${nCol}]`);
            trace(nRow, nCol, exitDir, 0);
          } else {
            console.log(`  Already traced exit to [${nRow},${nCol}] via ${directionName(exitDir)}`);
          }
        }
      }
    }
    
    console.log('=== FLOW DIRECTIONS CALCULATED ===');
    console.log('All flow directions:', directions);
    setFlowDirections(directions);
  };

  const drawCircuit = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const level = levels[currentLevel];
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw a proper series circuit for level 1
    if (currentLevel === 0) {
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      
      const startX = 50;
      const startY = 100;
      const width = 300;
      const height = 120;
      
      // Draw complete loop
      ctx.beginPath();
      
      // Top line with battery and resistors
      ctx.moveTo(startX, startY);
      
      // Battery
      ctx.lineTo(startX + 40, startY);
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 3;
      ctx.moveTo(startX + 40, startY - 15);
      ctx.lineTo(startX + 40, startY + 15);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.moveTo(startX + 50, startY - 10);
      ctx.lineTo(startX + 50, startY + 10);
      ctx.stroke();
      
      // Continue to first resistor
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX + 50, startY);
      ctx.lineTo(startX + 90, startY);
      
      // First resistor
      ctx.strokeStyle = '#dc2626';
      ctx.moveTo(startX + 90, startY);
      ctx.lineTo(startX + 95, startY - 8);
      ctx.lineTo(startX + 100, startY + 8);
      ctx.lineTo(startX + 105, startY - 8);
      ctx.lineTo(startX + 110, startY + 8);
      ctx.lineTo(startX + 115, startY - 8);
      ctx.lineTo(startX + 120, startY);
      ctx.stroke();
      
      // Continue to second resistor
      ctx.strokeStyle = '#333';
      ctx.beginPath();
      ctx.moveTo(startX + 120, startY);
      ctx.lineTo(startX + 160, startY);
      
      // Second resistor
      ctx.strokeStyle = '#dc2626';
      ctx.moveTo(startX + 160, startY);
      ctx.lineTo(startX + 165, startY - 8);
      ctx.lineTo(startX + 170, startY + 8);
      ctx.lineTo(startX + 175, startY - 8);
      ctx.lineTo(startX + 180, startY + 8);
      ctx.lineTo(startX + 185, startY - 8);
      ctx.lineTo(startX + 190, startY);
      ctx.stroke();
      
      // Complete the rectangle
      ctx.strokeStyle = '#333';
      ctx.beginPath();
      ctx.moveTo(startX + 190, startY);
      ctx.lineTo(startX + width, startY);
      ctx.lineTo(startX + width, startY + height);
      ctx.lineTo(startX, startY + height);
      ctx.lineTo(startX, startY);
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

  const renderWaterTile = (tile, size = 50, waterHeight = 'medium', flowDir = null) => {
    if (!tile) return null;

    const style = {
      width: size,
      height: size,
      transform: `rotate(${tile.rotation}deg)`,
      transition: 'transform 0.2s'
    };

    const flowAnimation = isAnimating && gameState === 'success';

    // Water height colors - now includes solid fill color
    const waterColors = {
      high: { 
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
      low: { 
        main: '#2563eb', 
        gradient: 'from-blue-600 via-blue-700 to-blue-800', 
        border: '#1e40af',
        solid: '#2563eb'
      }
    };

    const color = waterColors[waterHeight] || waterColors.medium;

    return (
      <div style={style} className="flex items-center justify-center relative overflow-hidden">
        {tile.type === 'channel' && (
          <div className="relative w-full h-full flex items-center justify-center">
            <svg width={size} height={size} viewBox="0 0 50 50">
              {/* Draw horizontal bar - CSS transform on parent div will rotate it */}
              <rect x="0" y="21.25" width="50" height="7.5" fill={color.solid} stroke={color.border} strokeWidth="1" />
              
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
                    
                    // For HORIZONTAL channels (rotation 0 or 180):
                    //   - The channel runs left-right in grid coordinates
                    //   - flowDir[1] tells us which way we're moving horizontally
                    //   - flowDir[1] = 1 (moved RIGHT) → flow left-to-right
                    //   - flowDir[1] = -1 (moved LEFT) → flow right-to-left
                    
                    // For VERTICAL channels (rotation 90 or 270):
                    //   - The channel runs up-down in grid coordinates
                    //   - But due to CSS rotation, horizontal in LOCAL coordinates
                    //   - flowDir[0] tells us which way we're moving vertically in grid
                    //   - flowDir[0] = 1 (moved DOWN) → in rotated space, this is "forward" = left-to-right
                    //   - flowDir[0] = -1 (moved UP) → in rotated space, this is "backward" = right-to-left
                    
                    if (rotation === 0 || rotation === 180) {
                      // Horizontal channel in grid coordinates
                      if (flowDir[1] === 1) {
                        // Moved RIGHT in grid → flow left-to-right in channel
                        path = "M 0 25 L 50 25";
                      } else {
                        // Moved LEFT in grid → flow right-to-left in channel
                        path = "M 50 25 L 0 25";
                      }
                    } else {
                      // Vertical channel in grid (rotation 90 or 270)
                      // The CSS rotation makes it appear horizontal in the LOCAL coordinate system
                      if (flowDir[0] === 1) {
                        // Moved DOWN in grid → in rotated space = left-to-right
                        path = "M 0 25 L 50 25";
                      } else {
                        // Moved UP in grid → in rotated space = right-to-left
                        path = "M 50 25 L 0 25";
                      }
                    }
                    
                    return (
                      <>
                        <circle className="animate-flow-dot" r="2.5" fill="#dbeafe">
                          <animateMotion dur="1.5s" repeatCount="indefinite" path={path} />
                        </circle>
                        <circle className="animate-flow-dot" r="2.5" fill="#bfdbfe">
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
                {/* L-shape centered: goes from center to RIGHT edge, and center to BOTTOM edge */}
                {/* This way rotation 0 = RIGHT+DOWN, 90° = DOWN+LEFT, 180° = LEFT+UP, 270° = UP+RIGHT */}
                <rect x="21.25" y="21.25" width="28.75" height="7.5" fill={color.solid} stroke={color.border} strokeWidth="1" />
                <rect x="21.25" y="21.25" width="7.5" height="28.75" fill={color.solid} stroke={color.border} strokeWidth="1" />
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
                      
                      // Corner connections by rotation (in SVG coordinates):
                      // rotation 0:   connects RIGHT (x=50) and DOWN (y=50)
                      // rotation 90:  connects DOWN (y=50) and LEFT (x=0)  
                      // rotation 180: connects LEFT (x=0) and UP (y=0)
                      // rotation 270: connects UP (y=0) and RIGHT (x=50)
                      
                      if (rotation === 0) {
                        // Connects RIGHT and DOWN
                        if (flowDir[1] === 1) {
                          // flowDir[1] = 1 means moved RIGHT
                          // Water entered from LEFT edge, exits DOWN
                          path = "M 45 25 L 25 25 L 25 45";
                        } else {
                          // flowDir[0] = 1 means moved DOWN
                          // Water entered from TOP edge, exits RIGHT
                          path = "M 25 45 L 25 25 L 45 25";
                        }
                      } else if (rotation === 90) {
                        // Connects DOWN and LEFT
                        if (flowDir[0] === 1) {
                          // flowDir[0] = 1 means moved DOWN
                          // Water entered from TOP edge, exits LEFT
                          path = "M 45 25 L 25 25 L 25 45";
                        } else {
                          // flowDir[1] = -1 means moved LEFT
                          // Water entered from RIGHT edge, exits DOWN
                          path = "M 25 45 L 25 25 L 45 25";
                        }
                      } else if (rotation === 180) {
                        // Connects LEFT and UP
                        if (flowDir[1] === -1) {
                          // flowDir[1] = -1 means moved LEFT
                          // Water entered from RIGHT edge, exits UP
                          path = "M 45 25 L 25 25 L 25 45";
                        } else {
                          // flowDir[0] = -1 means moved UP
                          // Water entered from BOTTOM edge, exits LEFT
                          path = "M 25 45 L 25 25 L 45 25";
                        }
                      } else { // 270
                        // Connects UP and RIGHT
                        if (flowDir[0] === -1) {
                          // flowDir[0] = -1 means moved UP
                          // Water entered from BOTTOM edge, exits RIGHT
                          path = "M 45 25 L 25 25 L 25 45";
                        } else {
                          // flowDir[1] = 1 means moved RIGHT
                          // Water entered from LEFT edge, exits UP
                          path = "M 25 45 L 25 25 L 45 25";
                        }
                      }
                      
                      return (
                        <circle className="animate-flow-dot" r="2.5" fill="#dbeafe">
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
        {tile.type === 'waterfall' && (
          <div className="w-full h-full flex items-center justify-center relative">
            <svg width={size} height={size} viewBox="0 0 50 50" className="absolute inset-0">
              <defs>
                <linearGradient id={`waterfall-grad-${Math.random()}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  {/* Dynamic gradient based on animation state and water height */}
                  {!flowAnimation ? (
                    // Static: always light to medium
                    <>
                      <stop offset="0%" stopColor="#bfdbfe" />
                      <stop offset="25%" stopColor="#93c5fd" />
                      <stop offset="50%" stopColor="#60a5fa" />
                      <stop offset="75%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </>
                  ) : waterHeight === 'high' ? (
                    // Animated, high input: light to medium
                    <>
                      <stop offset="0%" stopColor="#bfdbfe" />
                      <stop offset="25%" stopColor="#93c5fd" />
                      <stop offset="50%" stopColor="#60a5fa" />
                      <stop offset="75%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </>
                  ) : (
                    // Animated, medium input: medium to dark
                    <>
                      <stop offset="0%" stopColor="#60a5fa" />
                      <stop offset="25%" stopColor="#3b82f6" />
                      <stop offset="50%" stopColor="#2563eb" />
                      <stop offset="75%" stopColor="#1e40af" />
                      <stop offset="100%" stopColor="#1e3a8a" />
                    </>
                  )}
                </linearGradient>
              </defs>
              {/* Waterfall as a gradient bar showing water falling */}
              <rect x="17.5" y="5" width="15" height="40" 
                fill={`url(#waterfall-grad-${Math.random()})`} 
                stroke="#2563eb" 
                strokeWidth="1.5" />
              
              {/* Arrow overlay showing direction */}
              <path d="M 25 12 L 25 38 M 20 33 L 25 38 L 30 33" 
                stroke="#ffffff" 
                strokeWidth="2.5" 
                fill="none" 
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.8" />
              
              {flowAnimation && (
                <>
                  {/* Falling water droplets */}
                  <circle className="animate-drop" r="1.5" fill="#dbeafe" cx="20" cy="8" />
                  <circle className="animate-drop" r="1.5" fill="#dbeafe" cx="25" cy="8" style={{ animationDelay: '0.2s' }} />
                  <circle className="animate-drop" r="1.5" fill="#dbeafe" cx="30" cy="8" style={{ animationDelay: '0.4s' }} />
                  {/* Splash at bottom */}
                  <circle r="3" fill="#60a5fa" opacity="0.6" cx="25" cy="42">
                    <animate attributeName="r" values="0;4;0" dur="0.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0;0.8" dur="0.8s" repeatCount="indefinite" />
                  </circle>
                </>
              )}
            </svg>
          </div>
        )}
        {tile.type === 'waterfall-large' && (
          <div className="w-full h-full flex items-center justify-center relative">
            <svg width={size} height={size} viewBox="0 0 50 50" className="absolute inset-0">
              <defs>
                <linearGradient id={`waterfall-large-grad-${Math.random()}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  {/* Light to dark blue gradient */}
                  <stop offset="0%" stopColor="#bfdbfe" />
                  <stop offset="20%" stopColor="#93c5fd" />
                  <stop offset="40%" stopColor="#60a5fa" />
                  <stop offset="60%" stopColor="#3b82f6" />
                  <stop offset="80%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#1e40af" />
                </linearGradient>
              </defs>
              {/* Waterfall as a gradient bar showing water falling from light to dark */}
              <rect x="17.5" y="5" width="15" height="40" 
                fill={`url(#waterfall-large-grad-${Math.random()})`} 
                stroke="#1e40af" 
                strokeWidth="1.5" />
              
              {/* Arrow overlay showing direction - double arrow for large drop */}
              <path d="M 25 10 L 25 38 M 20 33 L 25 38 L 30 33 M 20 25 L 25 30 L 30 25" 
                stroke="#ffffff" 
                strokeWidth="2.5" 
                fill="none" 
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.8" />
              
              {flowAnimation && (
                <>
                  {/* Falling water droplets */}
                  <circle className="animate-drop" r="1.5" fill="#dbeafe" cx="20" cy="8" />
                  <circle className="animate-drop" r="1.5" fill="#dbeafe" cx="25" cy="8" style={{ animationDelay: '0.2s' }} />
                  <circle className="animate-drop" r="1.5" fill="#dbeafe" cx="30" cy="8" style={{ animationDelay: '0.4s' }} />
                  {/* Splash at bottom */}
                  <circle r="3" fill="#60a5fa" opacity="0.6" cx="25" cy="42">
                    <animate attributeName="r" values="0;4;0" dur="0.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0;0.8" dur="0.8s" repeatCount="indefinite" />
                  </circle>
                </>
              )}
            </svg>
          </div>
        )}
        {tile.type === 'junction' && (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Solid filled T-junction - thicker pipes */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg width={size} height={size} viewBox="0 0 50 50">
                {/* T-shaped filled region with thicker bars */}
                <path
                  d="M 0 21.25 L 50 21.25 L 50 28.75 L 28.75 28.75 L 28.75 50 L 21.25 50 L 21.25 28.75 L 0 28.75 Z"
                  fill={color.solid}
                  stroke={color.border}
                  strokeWidth="1"
                />
                {flowAnimation && flowDir && (
                  <>
                    {/* JUNCTION FLOW ANIMATION SYSTEM */}
                    {/* flowDir can be a single direction OR an array of directions for junctions */}
                    {/* Each direction in the array represents water flowing INTO this junction from that direction */}
                    {/* Direction format: [row_delta, col_delta] where [-1,0]=up, [1,0]=down, [0,-1]=left, [0,1]=right */}
                    {(() => {
                      // STEP 1: Normalize flowDir to always be an array for consistent handling
                      // If it's already an array (junction with multiple inflows), use it as-is
                      // If it's a single direction, wrap it in an array
                      const flowDirs = Array.isArray(flowDir) ? flowDir : [flowDir];
                      
                      // STEP 2: Determine which edges have INFLOW (water entering the junction)
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
                      
                      return (
                        <>
                          {/* JUNCTION ROTATION REFERENCE:
                              rotation 0°:   T shape → connects LEFT, RIGHT, DOWN (horizontal bar at top, stem pointing down)
                              rotation 90°:  ⊢ shape → connects UP, DOWN, LEFT (vertical bar at right, stem pointing left)
                              rotation 180°: ⊥ shape → connects LEFT, RIGHT, UP (horizontal bar at bottom, stem pointing up)
                              rotation 270°: ⊣ shape → connects UP, DOWN, RIGHT (vertical bar at left, stem pointing right)
                          */}
                          
                          {/* ============================================ */}
                          {/* INFLOW BUBBLES: Animate from edge TO center */}
                          {/* ============================================ */}
                          {/* These bubbles show water ENTERING the junction from connected edges */}
                          {/* Path format: "M <edge_x> <edge_y> L 25 25" (edge coords to center) */}
                          
                          {/* LEFT INFLOW: Bubble travels from left edge (x=0) to center (25,25) */}
                          {/* Shows when hasInflowLeft === true */}
                          {((hasInflowLeft && (tile.rotation === 0)) || (hasInflowUp && tile.rotation === 90) || (hasInflowRight && tile.rotation === 180)
                          || (hasInflowDown && tile.rotation ===270))&& (
                            <circle r="2" fill="#dbeafe" className="animate-flow-dot">
                              <animateMotion dur="1s" repeatCount="indefinite" path="M 0 25 L 25 25" />
                            </circle>
                          )}
                          
                          {/* RIGHT INFLOW: Bubble travels from right edge (x=50) to center (25,25) */}
                          {/* Shows when hasInflowRight === true */}
                          {((hasInflowRight && (tile.rotation === 0)) || (hasInflowDown && tile.rotation === 90) || (hasInflowLeft && tile.rotation === 180)
                          || (hasInflowUp && tile.rotation ===270)) && (
                            <circle r="2" fill="#dbeafe" className="animate-flow-dot">
                              <animateMotion dur="1s" repeatCount="indefinite" path="M 50 25 L 25 25" />
                            </circle>
                          )}
                          
                          {/* DOWN INFLOW: Bubble travels from bottom edge (y=50) to center (25,25) */}
                          {/* Shows when hasInflowDown === true */}
                          {((hasInflowDown && (tile.rotation === 0)) || (hasInflowLeft && tile.rotation === 90) || (hasInflowUp && tile.rotation === 180)
                          || (hasInflowRight && tile.rotation ===270)) && (
                            <circle r="2" fill="#dbeafe" className="animate-flow-dot">
                              <animateMotion dur="1s" repeatCount="indefinite" path="M 25 50 L 25 25" />
                            </circle>
                          )}
                          
                          {/* UP INFLOW: Bubble travels from top edge (y=0) to center (25,25) */}
                          {/* Shows when hasInflowUp === true */}
                          {/*hasInflowUp && (
                            <circle r="2" fill="#dbeafe" className="animate-flow-dot">
                              <animateMotion dur="1s" repeatCount="indefinite" path="M 25 0 L 25 25" />
                            </circle>
                          )*/}
                          
                          {/* ============================================ */}
                          {/* OUTFLOW BUBBLES: Animate from center TO edge */}
                          {/* ============================================ */}
                          {/* These bubbles show water LEAVING the junction to connected edges */}
                          {/* Path format: "M 25 25 L <edge_x> <edge_y>" (center to edge coords) */}
                          {/* 
                          LOGIC: Show outflow bubble IF:
                            1. The edge is CONNECTED (based on rotation), AND
                            2. There is NO INFLOW from that edge
                          
                          This handles both merge and split:
                            - MERGE (2 inflows → 1 outflow): 2 hasInflow=true, 1 hasInflow=false
                            - SPLIT (1 inflow → 2 outflows): 1 hasInflow=true, 2 hasInflow=false
                          
                          Junction connections by rotation:
                            - rotation 0°:   LEFT, RIGHT, DOWN connected
                            - rotation 90°:  UP, DOWN, LEFT connected
                            - rotation 180°: LEFT, RIGHT, UP connected
                            - rotation 270°: UP, DOWN, RIGHT connected
                          */}
                          
                          {/* LEFT OUTFLOW: Bubble travels from center (25,25) to left edge (x=0) */}
                          {/* Shows if: LEFT is connected (rot 0, 90, 180) AND no left inflow */}
                          {((!hasInflowLeft && (tile.rotation === 0)) || (!hasInflowUp && tile.rotation === 90) || (!hasInflowRight && tile.rotation === 180)
                          || (!hasInflowDown && tile.rotation ===270)) && (
                            <circle r="2" fill="#93c5fd" className="animate-flow-dot">
                              <animateMotion dur="1s" repeatCount="indefinite" path="M 25 25 L 0 25" />
                            </circle>
                          )}
                          
                          {/* RIGHT OUTFLOW: Bubble travels from center (25,25) to right edge (x=50) */}
                          {/* Shows if: RIGHT is connected (rot 0, 180, 270) AND no right inflow */}
                          {((!hasInflowLeft && (tile.rotation === 0)) || (!hasInflowUp && tile.rotation === 90) || (!hasInflowRight && tile.rotation === 180)
                          || (!hasInflowDown && tile.rotation ===270))&& (
                            <circle r="2" fill="#93c5fd" className="animate-flow-dot">
                              <animateMotion dur="1s" repeatCount="indefinite" path="M 25 25 L 50 25" />
                            </circle>
                          )}
                          
                          {/* DOWN OUTFLOW: Bubble travels from center (25,25) to bottom edge (y=50) */}
                          {/* Shows if: DOWN is connected (rot 0, 90, 270) AND no down inflow */}
                          {((!hasInflowLeft && (tile.rotation === 0)) || (!hasInflowUp && tile.rotation === 90) || (!hasInflowRight && tile.rotation === 180)
                          || (!hasInflowDown && tile.rotation ===270)) && (
                            <circle r="2" fill="#93c5fd" className="animate-flow-dot">
                              <animateMotion dur="1s" repeatCount="indefinite" path="M 25 25 L 25 50" />
                            </circle>
                          )}
                          
                          {/* UP OUTFLOW: Bubble travels from center (25,25) to top edge (y=0) */}
                          {/* Shows if: UP is connected (rot 90, 180, 270) AND no up inflow */}
                          {/*!hasInflowUp && (tile.rotation === 90 || tile.rotation === 180 || tile.rotation === 270) && (
                            <circle r="2" fill="#93c5fd" className="animate-flow-dot">
                              <animateMotion dur="1s" repeatCount="indefinite" path="M 25 25 L 25 0" />
                            </circle>
                          )*/}
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
      `}</style>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold mb-2">Circuit Water Flow Game</h1>
          <h2 className="text-xl text-blue-300">{level.name}</h2>
          <p className="text-gray-300">{level.description}</p>
        </div>

        <div className="flex gap-4 mb-4 justify-center">
          <button
            onClick={() => {
              setIsAnimating(false);
              setGameState('playing');
              setCurrentLevel(0);
            }}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded flex items-center gap-2"
          >
            <Home size={20} />
            Reset Level
          </button>
          <button
            onClick={handleAnimate}
            className={`px-6 py-2 rounded flex items-center gap-2 ${
              isAnimating 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            <Play size={20} />
            {isAnimating ? 'Stop Animation' : 'Animate Water Flow'}
          </button>
          {currentLevel < levels.length - 1 && (
            <button
              onClick={() => {
                setIsAnimating(false);
                setGameState('playing');
                setCurrentLevel(currentLevel + 1);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-2"
            >
              <SkipForward size={20} />
              Next Level
            </button>
          )}
        </div>

        {gameState === 'success' && (
          <div className="bg-green-600 text-white p-4 rounded mb-4 text-center text-xl font-bold animate-pulse">
            🎉 Perfect! The water flows correctly! 🎉
          </div>
        )}

        {gameState === 'disaster' && (
          <div className="bg-red-600 text-white p-4 rounded mb-4 text-center text-xl font-bold animate-pulse">
            💥 DISASTER! Water is flooding everywhere! Try again! 💥
          </div>
        )}

        <div className="flex gap-6 mb-4">
          {/* Circuit Diagram */}
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

          {/* Water Grid */}
          <div className="bg-slate-700 p-4 rounded-lg flex-1">
            <h3 className="text-xl font-bold mb-3">Water Flow Grid</h3>
            <div className="bg-slate-600 p-4 rounded inline-block">
              {grid.map((row, rowIndex) => (
                <div key={rowIndex} className="flex">
                  {row.map((cell, colIndex) => {
                    // Calculate water height based on position relative to pumps and waterfalls
                    let waterHeight = 'medium';
                    if (cell && gameState === 'success' && isAnimating) {
                      // For now, simple logic: after pump = high, after waterfall = low, else medium
                      // In a more complex implementation, we'd trace the circuit
                      if (cell.type === 'pump') {
                        waterHeight = 'medium'; // pump itself is transition
                      } else {
                        // Check if there's a pump before this position (going backwards in row/col)
                        let foundPump = false;
                        let foundWaterfall = false;
                        
                        // Simple heuristic: scan backwards from current position
                        for (let c = 0; c < colIndex; c++) {
                          if (grid[rowIndex][c]?.type === 'pump') foundPump = true;
                          if (grid[rowIndex][c]?.type === 'waterfall') foundWaterfall = true;
                        }
                        
                        if (foundPump && !foundWaterfall) {
                          waterHeight = 'high';
                        } else if (foundWaterfall) {
                          waterHeight = 'low';
                        }
                      }
                    }
                    
                    return (
                      <div
                        key={colIndex}
                        onClick={() => handleCellClick(rowIndex, colIndex)}
                        className={`w-12 h-12 border border-slate-500 cursor-pointer hover:bg-slate-500 flex items-center justify-center ${
                          isAnimating && gameState === 'disaster' ? 'bg-red-900 animate-bounce' : ''
                        }`}
                      >
                        {cell && renderWaterTile(cell, 48, waterHeight, flowDirections[`${rowIndex},${colIndex}`])}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tile Palette */}
        <div className="mt-6 bg-slate-700 p-4 rounded-lg">
          <h3 className="text-xl font-bold mb-3">Water Tiles</h3>
          <div className="flex gap-4 items-center flex-wrap">
            {tileTypes.map(tile => (
              <button
                key={tile.type}
                onClick={() => setSelectedTile(tile.type)}
                className={`p-4 rounded-lg border-4 transition-all ${
                  selectedTile === tile.type
                    ? 'border-yellow-400 bg-slate-600'
                    : 'border-slate-500 bg-slate-800 hover:bg-slate-600'
                }`}
              >
                <div className="mb-2">
                  {renderWaterTile({ type: tile.type, rotation: rotation }, 60, 'medium')}
                </div>
                <div className="text-sm text-center">{tile.label}</div>
                <div className="text-xs text-gray-400 text-center">×{tile.count}</div>
              </button>
            ))}
            <button
              onClick={handleRotate}
              className="p-4 bg-purple-600 hover:bg-purple-700 rounded-lg flex flex-col items-center gap-2"
            >
              <RotateCw size={32} />
              <div className="text-sm">Rotate</div>
              <div className="text-xs text-gray-300">{rotation}°</div>
            </button>
          </div>
        </div>

        <div className="mt-4 bg-slate-700 p-4 rounded-lg">
          <h3 className="text-lg font-bold mb-2">How to Play:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
            <li>Study the circuit diagram on the left</li>
            <li>Select a water tile from the palette below</li>
            <li>Use the Rotate button to orient it correctly</li>
            <li>Click on the grid to place the tile</li>
            <li>Recreate the circuit using water analogies: Pump = Battery, Waterfall = Resistor, Channel = Wire, Corner = 90° turn, 3-Way Junction = T-junction</li>
            <li>When ready, click "Animate Water Flow" to test your solution!</li>
            <li>Watch the realistic water flow animation if you got it right, or face a flooding disaster if wrong!</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CircuitWaterGame;