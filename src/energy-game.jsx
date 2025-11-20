import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw } from 'lucide-react';

const EnergyGame = () => {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('menu'); // menu, playing, levelComplete
  const [currentLevel, setCurrentLevel] = useState(1);
  
  // Game physics constants
  const GRAVITY = 0.5;
  const PLAYER_WALK_SPEED = 3;
  const PLAYER_RUN_SPEED = 6;
  const PLAYER_TURBO_SPEED = 10;
  const JUMP_FORCE = -12;
  const SPRING_CONSTANTS = [0.1, 0.2, 0.35]; // Three different spring constants
  const PUSH_FORCE = 2;
  const SPRING_LOCK_COMPRESSION = 10; // Exact compression distance for locking
  
  // Pulley height levels (discrete stops)
  const PULLEY_LEVELS = [380, 300, 220, 140]; // 4 discrete height levels
  
  // Level configurations
  const levels = {
    1: {
      name: "Level 1: Energy Basics",
      targetEnergy: 575, // Specific target requiring exact combination
      tolerance: 25,
      playerStart: { x: 50, y: 400 },
      platforms: [
        { x: 0, y: 450, width: 800, height: 20 }, // Ground
        { x: 200, y: 350, width: 200, height: 15 }, // Low-mid platform with spring
        { x: 380, y: 280, width: 100, height: 15 }, // Middle stepping platform
        { x: 80, y: 220, width: 150, height: 15 }, // Left high platform with button
        { x: 550, y: 150, width: 200, height: 15 }, // Right highest platform with pulley
      ],
      springs: [
        { x: 220, y: 350, naturalLength: 80, currentLength: 80, orientation: 'horizontal', locked: false, constantIndex: 0, lockedLength: 80, tabUp: false }
      ],
      pushableRocks: [],
      pulleyRocks: [
        { x: 640, y: 380, width: 40, height: 40, mass: 5, currentLevel: 0 }
      ],
      pulley: { x: 680, y: 150, ropeAttachY: 135 },
      button: { x: 140, y: 205, width: 30, height: 15 },
      door: { x: 720, y: 390 }
    },
    2: {
      name: "Level 2: Energy Challenge",
      targetEnergy: 775,
      tolerance: 25,
      playerStart: { x: 50, y: 400 },
      platforms: [
        { x: 0, y: 450, width: 800, height: 20 },
        { x: 200, y: 350, width: 200, height: 15 },
        { x: 380, y: 280, width: 100, height: 15 },
        { x: 80, y: 220, width: 150, height: 15 },
        { x: 550, y: 150, width: 200, height: 15 },
      ],
      springs: [
        { x: 220, y: 350, naturalLength: 80, currentLength: 80, orientation: 'horizontal', locked: false, constantIndex: 0, lockedLength: 80, tabUp: false }
      ],
      pushableRocks: [],
      pulleyRocks: [
        { x: 640, y: 380, width: 40, height: 40, mass: 5, currentLevel: 0 }
      ],
      pulley: { x: 680, y: 150, ropeAttachY: 135 },
      button: { x: 140, y: 205, width: 30, height: 15 },
      door: { x: 720, y: 390 }
    }
  };
  
  const gameRef = useRef({
    player: {
      x: 50,
      y: 400,
      width: 30,
      height: 40,
      vx: 0,
      vy: 0,
      onGround: false,
      speedMode: 'walk', // walk, run, turbo
      facingRight: true
    },
    platforms: [],
    springs: [],
    pushableRocks: [],
    pulleyRocks: [],
    pulley: null,
    button: null,
    keys: {},
    door: { x: 720, y: 390, width: 50, height: 60, open: false },
    targetEnergy: 575,
    tolerance: 25,
    currentEnergy: 0,
    buttonPressed: false,
    buttonCooldown: 0,
    pulleyUpPressed: false,
    pulleyDownPressed: false
  });
  
  const initLevel = (levelNum) => {
    const level = levels[levelNum];
    const game = gameRef.current;
    
    game.player = {
      x: level.playerStart.x,
      y: level.playerStart.y,
      width: 30,
      height: 40,
      vx: 0,
      vy: 0,
      onGround: false,
      speedMode: 'walk',
      facingRight: true
    };
    
    game.platforms = level.platforms.map(p => ({ ...p }));
    game.springs = level.springs.map(s => ({ ...s }));
    game.pushableRocks = level.pushableRocks.map(r => ({ ...r }));
    game.pulleyRocks = level.pulleyRocks.map(r => ({ ...r }));
    game.pulley = { ...level.pulley };
    game.button = { ...level.button };
    game.door = { ...level.door, width: 50, height: 60, open: false };
    game.targetEnergy = level.targetEnergy;
    game.tolerance = level.tolerance;
    game.keys = {};
    game.buttonPressed = false;
    game.buttonCooldown = 0;
    game.pulleyUpPressed = false;
    game.pulleyDownPressed = false;
    game.currentEnergy = 0;
  };
  
  const startGame = (level) => {
    setCurrentLevel(level);
    initLevel(level);
    setGameState('playing');
  };
  
  const resetLevel = () => {
    initLevel(currentLevel);
    setGameState('playing');
  };
  
  const calculateEnergy = () => {
    const game = gameRef.current;
    let totalEnergy = 0;
    
    const groundLevel = 450;
    
    // Kinetic energy of player: 0.5 * m * v^2
    const playerMass = 1;
    const playerSpeed = Math.sqrt(game.player.vx ** 2 + game.player.vy ** 2);
    const playerKE = 0.5 * playerMass * playerSpeed ** 2;
    totalEnergy += playerKE;
    
    // Gravitational PE of player: m * g * h
    const playerHeight = groundLevel - (game.player.y + game.player.height);
    const playerPE = playerMass * GRAVITY * playerHeight;
    totalEnergy += playerPE;
    
    // Energy from pushable rocks
    game.pushableRocks.forEach(rock => {
      const rockSpeed = Math.sqrt(rock.vx ** 2 + rock.vy ** 2);
      const rockKE = 0.5 * rock.mass * rockSpeed ** 2;
      totalEnergy += rockKE;
      
      const rockHeight = groundLevel - (rock.y + rock.height);
      const rockPE = rock.mass * GRAVITY * rockHeight;
      totalEnergy += rockPE;
    });
    
    // Energy from pulley rocks
    game.pulleyRocks.forEach(rock => {
      const rockHeight = groundLevel - (rock.y + rock.height);
      const rockPE = rock.mass * GRAVITY * rockHeight;
      totalEnergy += rockPE;
    });
    
    // Spring potential energy: 0.5 * k * x^2
    game.springs.forEach(spring => {
      const compression = spring.naturalLength - spring.currentLength;
      const k = SPRING_CONSTANTS[spring.constantIndex];
      const springPE = 0.5 * k * compression ** 2 * 10; // Scaled for visibility
      totalEnergy += springPE;
    });
    
    return Math.round(totalEnergy);
  };
  
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const game = gameRef.current;
    
    let animationId;
    
    const handleKeyDown = (e) => {
      game.keys[e.key] = true;
      if (e.key === 'Shift' && game.player.speedMode === 'walk') {
        game.player.speedMode = 'run';
      }
      if (e.key === 'q' || e.key === 'Q') {
        game.player.speedMode = 'turbo';
      }
    };
    
    const handleKeyUp = (e) => {
      game.keys[e.key] = false;
      if (e.key === 'Shift' && game.player.speedMode === 'run') {
        game.player.speedMode = 'walk';
      }
      if (e.key === 'q' || e.key === 'Q') {
        if (game.keys['Shift']) {
          game.player.speedMode = 'run';
        } else {
          game.player.speedMode = 'walk';
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    const checkPlatformCollision = (obj, platforms) => {
      let onPlatform = false;
      platforms.forEach(platform => {
        if (obj.x + obj.width > platform.x &&
            obj.x < platform.x + platform.width &&
            obj.y + obj.height >= platform.y &&
            obj.y + obj.height <= platform.y + 20 &&
            obj.vy >= 0) {
          obj.y = platform.y - obj.height;
          obj.vy = 0;
          onPlatform = true;
        }
      });
      return onPlatform;
    };
    
    const gameLoop = () => {
      const player = game.player;
      let speed = PLAYER_WALK_SPEED;
      if (player.speedMode === 'run') speed = PLAYER_RUN_SPEED;
      if (player.speedMode === 'turbo') speed = PLAYER_TURBO_SPEED;
      
      // Player movement
      if (game.keys['ArrowLeft'] || game.keys['a']) {
        player.vx = -speed;
        player.facingRight = false;
      } else if (game.keys['ArrowRight'] || game.keys['d']) {
        player.vx = speed;
        player.facingRight = true;
      } else {
        player.vx = 0;
      }
      
      // Jumping
      if ((game.keys['ArrowUp'] || game.keys['w'] || game.keys[' ']) && player.onGround) {
        player.vy = JUMP_FORCE;
        player.onGround = false;
      }
      
      // Apply gravity
      player.vy += GRAVITY;
      
      // Update position
      player.x += player.vx;
      player.y += player.vy;
      
      // Platform collision
      player.onGround = checkPlatformCollision(player, game.platforms);
      
      // Wall collision
      if (player.x < 0) player.x = 0;
      if (player.x > 800 - player.width) player.x = 800 - player.width;
      
      // Button interaction
      if (game.buttonCooldown > 0) {
        game.buttonCooldown--;
      }
      
      const button = game.button;
      if (game.keys['e'] && game.buttonCooldown === 0 &&
          player.x + player.width > button.x &&
          player.x < button.x + button.width &&
          Math.abs(player.y + player.height - button.y) < 50) {
        // Toggle spring constant
        game.springs.forEach(spring => {
          spring.constantIndex = (spring.constantIndex + 1) % SPRING_CONSTANTS.length;
        });
        game.buttonPressed = true;
        game.buttonCooldown = 20; // Cooldown to prevent rapid toggling
        setTimeout(() => {
          game.buttonPressed = false;
        }, 100);
      }
      
      // Update pushable rocks
      game.pushableRocks.forEach(rock => {
        // Friction
        rock.vx *= 0.95;
        
        // Apply gravity
        rock.vy += GRAVITY;
        
        // Update position
        rock.x += rock.vx;
        rock.y += rock.vy;
        
        // Platform collision
        rock.onGround = checkPlatformCollision(rock, game.platforms);
        
        // Wall collision
        if (rock.x < 0) {
          rock.x = 0;
          rock.vx = 0;
        }
        if (rock.x > 800 - rock.width) {
          rock.x = 800 - rock.width;
          rock.vx = 0;
        }
        
        // Player pushing rock
        if (player.x + player.width > rock.x &&
            player.x < rock.x + rock.width &&
            player.y + player.height > rock.y &&
            player.y < rock.y + rock.height) {
          if (player.vx > 0) {
            rock.vx = PUSH_FORCE;
            player.x = rock.x - player.width;
          } else if (player.vx < 0) {
            rock.vx = -PUSH_FORCE;
            player.x = rock.x + rock.width;
          }
        }
      });
      
      // Player spring interaction
      game.springs.forEach(spring => {
        const springRight = spring.x + spring.currentLength;
        const springTop = spring.y - 20;
        
        // Check if player is standing on the spring platform and overlapping with spring horizontally
        const isPlayerOnSpringPlatform = player.onGround && 
            Math.abs(player.y + player.height - spring.y) < 5;
        
        const playerOverlapsSpring = player.x < springRight + 5 && 
            player.x + player.width > spring.x;
        
        if (isPlayerOnSpringPlatform && playerOverlapsSpring && !spring.locked) {
          // Player is pushing into the spring from the right
          if (player.x < springRight && player.x + player.width > springRight - 10) {
            const overlap = springRight - player.x;
            
            const targetCompression = SPRING_LOCK_COMPRESSION;
            const newLength = spring.naturalLength - overlap;
            
            if (newLength >= spring.naturalLength - targetCompression) {
              spring.currentLength = newLength;
            } else {
              spring.currentLength = spring.naturalLength - targetCompression;
            }
            
            const currentCompression = spring.naturalLength - spring.currentLength;
            
            // Check if we've reached the lock compression point - lock permanently
            if (currentCompression >= targetCompression - 2) {
              spring.locked = true;
              spring.lockedLength = spring.naturalLength - targetCompression;
              spring.currentLength = spring.lockedLength;
              spring.tabUp = true;
            }
            
            // Push player back when not at lock point
            if (!spring.locked) {
              const k = SPRING_CONSTANTS[spring.constantIndex];
              const springForce = currentCompression * k * 0.2;
              player.x += springForce;
            }
          }
        }
        
        // Keep spring permanently locked once locked
        if (spring.locked) {
          spring.currentLength = spring.lockedLength;
          spring.tabUp = true;
        }
      });
      
      // Spring returns to natural length when not locked and no rock on it
      game.springs.forEach(spring => {
        if (!spring.locked && spring.currentLength < spring.naturalLength) {
          // Check if any rock is still touching the spring
          let rockTouching = false;
          game.pushableRocks.forEach(rock => {
            const springRight = spring.x + spring.currentLength;
            if (rock.x < springRight + 5 &&
                rock.x + rock.width > spring.x &&
                Math.abs(rock.y + rock.height - spring.y) < 10) {
              rockTouching = true;
            }
          });
          
          // Check if player is on spring
          const springRight = spring.x + spring.currentLength;
          const isPlayerOnSpring = player.x + player.width > spring.x &&
              player.x < springRight + 10 &&
              Math.abs(player.y + player.height - (spring.y - 20)) < 15;
          
          if (!rockTouching && !isPlayerOnSpring) {
            spring.currentLength += 0.3;
            if (spring.currentLength > spring.naturalLength) {
              spring.currentLength = spring.naturalLength;
            }
          }
        }
      });
      
      // Pulley interaction - discrete levels
      game.pulleyRocks.forEach(rock => {
        const pulleyPlatform = game.platforms.find(p => p.y === game.pulley.y);
        const nearPulley = pulleyPlatform &&
            player.x + player.width > pulleyPlatform.x &&
            player.x < pulleyPlatform.x + pulleyPlatform.width &&
            Math.abs(player.y + player.height - pulleyPlatform.y) < 5;
        
        if (nearPulley) {
          if (game.keys['f'] && !game.pulleyUpPressed) {
            // Move to next level up
            if (rock.currentLevel < PULLEY_LEVELS.length - 1) {
              rock.currentLevel++;
              rock.y = PULLEY_LEVELS[rock.currentLevel];
            }
            game.pulleyUpPressed = true;
          }
          
          if (game.keys['r'] && !game.pulleyDownPressed) {
            // Move to next level down
            if (rock.currentLevel > 0) {
              rock.currentLevel--;
              rock.y = PULLEY_LEVELS[rock.currentLevel];
            }
            game.pulleyDownPressed = true;
          }
        }
        
        // Reset press state when keys are released
        if (!game.keys['f']) {
          game.pulleyUpPressed = false;
        }
        if (!game.keys['r']) {
          game.pulleyDownPressed = false;
        }
      });
      
      // Calculate energy
      game.currentEnergy = calculateEnergy();
      
      // Check if door should open
      const energyDiff = Math.abs(game.currentEnergy - game.targetEnergy);
      game.door.open = energyDiff <= game.tolerance;
      
      // Check level completion
      if (game.door.open && 
          player.x + player.width > game.door.x &&
          player.x < game.door.x + game.door.width &&
          player.y + player.height > game.door.y) {
        if (currentLevel < 2) {
          setCurrentLevel(currentLevel + 1);
          initLevel(currentLevel + 1);
        } else {
          setGameState('levelComplete');
        }
      }
      
      // Render
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, 800, 500);
      
      // Platforms
      game.platforms.forEach(platform => {
        ctx.fillStyle = '#654321';
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        ctx.fillStyle = '#228B22';
        ctx.fillRect(platform.x, platform.y - 3, platform.width, 3);
      });
      
      // Button
      ctx.fillStyle = game.buttonPressed ? '#00FF00' : '#FF4444';
      ctx.fillRect(button.x, button.y, button.width, button.height);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeRect(button.x, button.y, button.width, button.height);
      
      // Button label
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('K', button.x + 10, button.y - 3);
      
      // Spring constant indicator near button with values
      const currentK = SPRING_CONSTANTS[game.springs[0].constantIndex];
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(button.x - 15, button.y - 45, 65, 35);
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`k=${currentK.toFixed(2)}`, button.x - 10, button.y - 30);
      ctx.fillStyle = '#AAA';
      ctx.font = '8px monospace';
      ctx.fillText('k options:', button.x - 10, button.y - 20);
      ctx.fillText('0.10,0.20', button.x - 10, button.y - 12);
      ctx.fillText('0.35', button.x - 10, button.y - 4);
      
      // Horizontal springs
      game.springs.forEach(spring => {
        ctx.strokeStyle = spring.locked ? '#FF0000' : '#FF6347';
        ctx.lineWidth = 4;
        ctx.beginPath();
        const segments = 10;
        const segmentWidth = spring.currentLength / segments;
        for (let i = 0; i <= segments; i++) {
          const x = spring.x + i * segmentWidth;
          const y = spring.y - 10 + (i % 2 === 0 ? -8 : 8);
          if (i === 0) ctx.moveTo(spring.x, spring.y - 10);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        
        // Spring ends
        ctx.fillStyle = '#666';
        ctx.fillRect(spring.x - 5, spring.y - 20, 5, 20);
        ctx.fillRect(spring.x + spring.currentLength, spring.y - 20, 5, 20);
        
        // Locking tab that pops up
        if (spring.tabUp) {
          const tabX = spring.x + spring.currentLength;
          ctx.fillStyle = '#FFD700';
          ctx.fillRect(tabX, spring.y, 8, 15);
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 1;
          ctx.strokeRect(tabX, spring.y, 8, 15);
        }
        
        // Lock indicator
        if (spring.locked) {
          ctx.fillStyle = '#FF0000';
          ctx.font = 'bold 12px monospace';
          ctx.fillText('LOCKED', spring.x + 10, spring.y - 25);
        }
      });
      
      // Pushable rocks (if any exist)
      game.pushableRocks.forEach(rock => {
        ctx.fillStyle = '#A9A9A9';
        ctx.fillRect(rock.x, rock.y, rock.width, rock.height);
        ctx.strokeStyle = '#696969';
        ctx.lineWidth = 2;
        ctx.strokeRect(rock.x, rock.y, rock.width, rock.height);
        
        // Texture lines
        ctx.strokeStyle = '#808080';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rock.x + 10, rock.y);
        ctx.lineTo(rock.x + 10, rock.y + rock.height);
        ctx.moveTo(rock.x + 30, rock.y);
        ctx.lineTo(rock.x + 30, rock.y + rock.height);
        ctx.stroke();
      });
      
      // Pulley system
      game.pulleyRocks.forEach(rock => {
        // Pulley wheel
        const pulley = game.pulley;
        ctx.fillStyle = '#666';
        ctx.beginPath();
        ctx.arc(pulley.x, pulley.ropeAttachY, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Rope with level indicators
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(pulley.x, pulley.ropeAttachY);
        ctx.lineTo(pulley.x, rock.y);
        ctx.stroke();
        
        // Level markers on rope
        PULLEY_LEVELS.forEach((level, idx) => {
          ctx.fillStyle = idx === rock.currentLevel ? '#FFD700' : '#666';
          ctx.beginPath();
          ctx.arc(pulley.x, level + 20, 4, 0, Math.PI * 2);
          ctx.fill();
        });
        
        // Rock
        ctx.fillStyle = '#A9A9A9';
        ctx.fillRect(rock.x, rock.y, rock.width, rock.height);
        ctx.strokeStyle = '#696969';
        ctx.lineWidth = 2;
        ctx.strokeRect(rock.x, rock.y, rock.width, rock.height);
        
        // Level indicator
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`L${rock.currentLevel + 1}`, rock.x + 8, rock.y - 5);
      });
      
      // Door
      const door = game.door;
      ctx.fillStyle = door.open ? '#90EE90' : '#8B4513';
      ctx.fillRect(door.x, door.y, door.width, door.height);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeRect(door.x, door.y, door.width, door.height);
      
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(door.x + 40, door.y + 30, 5, 0, Math.PI * 2);
      ctx.fill();
      
      // Player
      ctx.fillStyle = '#FF6B6B';
      ctx.fillRect(player.x, player.y, player.width, player.height);
      
      ctx.fillStyle = '#FFD1A4';
      ctx.fillRect(player.x + 5, player.y, 20, 10);
      
      ctx.fillStyle = '#000';
      if (player.facingRight) {
        ctx.fillRect(player.x + 18, player.y + 3, 3, 3);
      } else {
        ctx.fillRect(player.x + 9, player.y + 3, 3, 3);
      }
      
      // Speed indicator
      if (player.speedMode === 'run') {
        ctx.fillStyle = 'rgba(255, 255, 0, 0.4)';
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(player.x - 10 - i * 5, player.y + 10 * i, 8, 3);
        }
      } else if (player.speedMode === 'turbo') {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
        for (let i = 0; i < 5; i++) {
          ctx.fillRect(player.x - 12 - i * 6, player.y + 8 * i, 10, 4);
        }
      }
      
      // Visual Energy Meter
      const meterX = 10;
      const meterY = 10;
      const meterWidth = 250;
      const meterHeight = 110;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(meterX, meterY, meterWidth, meterHeight);
      
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('ENERGY METER', meterX + 10, meterY + 25);
      
      // Speed info
      ctx.font = '8px monospace';
      ctx.fillStyle = '#AAA';
      ctx.fillText('Walk:3 Run:6 Turbo:10', meterX + 10, meterY + 38);
      
      // Energy bar
      const barX = meterX + 10;
      const barY = meterY + 45;
      const barWidth = meterWidth - 20;
      const barHeight = 30;
      
      // Background
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      
      // Current energy bar
      const energyRatio = Math.min(game.currentEnergy / (game.targetEnergy + 300), 1);
      const currentBarWidth = barWidth * energyRatio;
      
      const diff = Math.abs(game.currentEnergy - game.targetEnergy);
      const isInRange = diff <= game.tolerance;
      
      if (isInRange) {
        ctx.fillStyle = '#00FF00';
      } else if (game.currentEnergy < game.targetEnergy) {
        ctx.fillStyle = '#FFA500';
      } else {
        ctx.fillStyle = '#FF4444';
      }
      ctx.fillRect(barX, barY, currentBarWidth, barHeight);
      
      // Target marker
      const targetRatio = game.targetEnergy / (game.targetEnergy + 500);
      const targetX = barX + barWidth * targetRatio;
      
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(targetX, barY - 5);
      ctx.lineTo(targetX, barY + barHeight + 5);
      ctx.stroke();
      
      // Triangle marker
      ctx.fillStyle = '#00FF00';
      ctx.beginPath();
      ctx.moveTo(targetX - 5, barY - 5);
      ctx.lineTo(targetX + 5, barY - 5);
      ctx.lineTo(targetX, barY);
      ctx.fill();
      
      // Text
      ctx.fillStyle = '#FFF';
      ctx.font = '12px monospace';
      ctx.fillText(`Current: ${game.currentEnergy}`, barX, barY + barHeight + 18);
      ctx.fillText(`Target: ${game.targetEnergy} ±${game.tolerance}`, barX + 120, barY + barHeight + 18);
      
      // Instructions and Physics Values
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(270, 10, 410, 90);
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('CONTROLS', 280, 25);
      ctx.font = '10px monospace';
      ctx.fillText('WASD/Arrows:Move Space:Jump Shift:Run Q:Turbo', 280, 40);
      ctx.fillText('E:Toggle K (left) | F/R:Pulley Up/Down (right)', 280, 53);
      
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('PHYSICS VALUES', 280, 68);
      ctx.font = '9px monospace';
      ctx.fillStyle = '#FFF';
      ctx.fillText(`g=${GRAVITY} | Player m=1 | Pulley Rock m=5`, 280, 80);
      ctx.fillText(`Spring x=${SPRING_LOCK_COMPRESSION} | Speeds: 3,6,10`, 280, 91);
      
      // Level name and additional physics info
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(690, 10, 100, 70);
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(levels[currentLevel].name, 693, 25);
      
      // Height reference info
      ctx.font = '8px monospace';
      ctx.fillStyle = '#AAA';
      ctx.fillText('Heights:', 695, 40);
      ctx.fillText('Ground:450', 695, 50);
      ctx.fillText('L1:380', 695, 58);
      ctx.fillText('L2:300', 695, 66);
      ctx.fillText('L3:220', 695, 74);
      
      animationId = requestAnimationFrame(gameLoop);
    };
    
    gameLoop();
    
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, currentLevel]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      {gameState === 'menu' && (
        <div className="bg-gray-800 p-8 rounded-lg shadow-2xl text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Energy Physics Puzzle</h1>
          <p className="text-gray-300 mb-6 max-w-md">
            Master kinetic, potential, and spring energy to open doors and progress through levels!
          </p>
          <div className="space-y-4">
            <button
              onClick={() => startGame(1)}
              className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold transition"
            >
              <Play size={20} /> Start Level 1
            </button>
            <button
              onClick={() => startGame(2)}
              className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition"
            >
              <Play size={20} /> Start Level 2
            </button>
          </div>
        </div>
      )}
      
      {gameState === 'playing' && (
        <div className="flex flex-col items-center gap-4">
          <canvas
            ref={canvasRef}
            width={800}
            height={500}
            className="border-4 border-gray-700 rounded-lg shadow-2xl"
          />
          <button
            onClick={resetLevel}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold transition"
          >
            <RotateCcw size={20} /> Reset Level
          </button>
        </div>
      )}
      
      {gameState === 'levelComplete' && (
        <div className="bg-gray-800 p-8 rounded-lg shadow-2xl text-center">
          <h1 className="text-4xl font-bold text-green-400 mb-4">All Levels Complete!</h1>
          <p className="text-gray-300 mb-6">
            Congratulations! You've mastered energy physics!
          </p>
          <button
            onClick={() => setGameState('menu')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition"
          >
            Back to Menu
          </button>
        </div>
      )}
    </div>
  );
};

export default EnergyGame;