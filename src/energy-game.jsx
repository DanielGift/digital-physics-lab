import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw } from 'lucide-react';

const EnergyGame = () => {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('menu');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hoveredElement, setHoveredElement] = useState(null);
  
  const GRAVITY = 0.5;
  const PLAYER_WALK_SPEED = 6;
  const PLAYER_RUN_SPEED = 6;
  const PLAYER_TURBO_SPEED = 10;
  const JUMP_FORCE = -12;
  const SPRING_CONSTANTS = [0.01, 0.02, 0.03];
  const PUSH_FORCE = 2;
  const SPRING_LOCK_COMPRESSION = 30;
  const PULLEY_LEVELS = [380, 300, 220, 140];
  
  const levels = {
    1: {
      name: "Level 1: Energy Basics",
      targetEnergy: 575,
      tolerance: 10,
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
      door: { x: 720, y: 390 },
      barriers: []
    },
    2: {
      name: "Level 2: Energy Challenge",
      targetEnergy: 680,
      tolerance: 10,
      playerStart: { x: 50, y: 400 },
      platforms: [
        { x: 0, y: 450, width: 800, height: 20 },
        { x: 50, y: 310, width: 150, height: 15 },
        { x: 80, y: 180, width: 120, height: 15 },
        { x: 600, y: 350, width: 150, height: 15 },
        { x: 600, y: 220, width: 150, height: 15 },
      ],
      springs: [
        { x: 70, y: 310, naturalLength: 80, currentLength: 80, orientation: 'horizontal', locked: false, constantIndex: 0, lockedLength: 80, tabUp: false },
        { x: 620, y: 350, naturalLength: 80, currentLength: 80, orientation: 'horizontal', locked: false, constantIndex: 0, lockedLength: 80, tabUp: false }
      ],
      pushableRocks: [],
      pulleyRocks: [
        { x: 130, y: 390, width: 40, height: 40, mass: 5, currentLevel: 0 }
      ],
      pulley: { x: 130, y: 180, ropeAttachY: 165 },
      button: { x: 665, y: 205, width: 30, height: 15 },
      door: { x: 720, y: 390 },
      barriers: [
        { x: 390, y: 50, width: 20, height: 400, type: 'vertical', openWhen: 'below', threshold: 500 },
        { x: 10, y: 230, width: 380, height: 20, type: 'horizontal', openWhen: 'above', threshold: 200 }
      ]
    }
  };
  
  const gameRef = useRef({
    player: {
      x: 50, y: 400, width: 30, height: 40,
      vx: 0, vy: 0, onGround: false,
      speedMode: 'walk', facingRight: true
    },
    platforms: [], springs: [], pushableRocks: [], pulleyRocks: [],
    pulley: null, button: null, keys: {},
    door: { x: 720, y: 390, width: 50, height: 60, open: false },
    barriers: [],
    targetEnergy: 575, tolerance: 10, currentEnergy: 0,
    buttonPressed: false, buttonCooldown: 0,
    pulleyUpPressed: false, pulleyDownPressed: false
  });
  
  const initLevel = (levelNum) => {
    const level = levels[levelNum];
    const game = gameRef.current;
    
    game.player = {
      x: level.playerStart.x, y: level.playerStart.y,
      width: 30, height: 40, vx: 0, vy: 0,
      onGround: false, speedMode: 'walk', facingRight: true
    };
    
    game.platforms = level.platforms.map(p => ({ ...p }));
    game.springs = level.springs.map(s => ({ ...s }));
    game.pushableRocks = level.pushableRocks.map(r => ({ ...r }));
    game.pulleyRocks = level.pulleyRocks.map(r => ({ ...r }));
    game.pulley = { ...level.pulley };
    game.button = { ...level.button };
    game.door = { ...level.door, width: 50, height: 60, open: false };
    game.barriers = level.barriers ? level.barriers.map(b => ({ ...b, open: false })) : [];
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
    
    const playerMass = 1;
    const playerSpeed = Math.sqrt(game.player.vx ** 2 + game.player.vy ** 2);
    totalEnergy += 0.5 * playerMass * playerSpeed ** 2;
    
    const playerHeight = groundLevel - (game.player.y + game.player.height);
    totalEnergy += playerMass * GRAVITY * playerHeight;
    
    game.pushableRocks.forEach(rock => {
      const rockSpeed = Math.sqrt(rock.vx ** 2 + rock.vy ** 2);
      totalEnergy += 0.5 * rock.mass * rockSpeed ** 2;
      const rockHeight = groundLevel - (rock.y + rock.height);
      totalEnergy += rock.mass * GRAVITY * rockHeight;
    });
    
    game.pulleyRocks.forEach(rock => {
      const rockHeight = groundLevel - (rock.y + rock.height);
      totalEnergy += rock.mass * GRAVITY * rockHeight;
    });
    
    game.springs.forEach(spring => {
      const compression = spring.naturalLength - spring.currentLength;
      const k = SPRING_CONSTANTS[spring.constantIndex];
      totalEnergy += 0.5 * k * compression ** 2 * 10;
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
        game.player.speedMode = 'turbo';
      }
    };
    
    const handleKeyUp = (e) => {
      game.keys[e.key] = false;
      if (e.key === 'Shift') {
        game.player.speedMode = 'walk';
      }

    };
    
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setMousePos({ x, y });
      
      let hovered = null;
      const player = game.player;
      
      if (x >= player.x && x <= player.x + player.width &&
          y >= player.y && y <= player.y + player.height) {
        hovered = 'player';
      }
      
      game.springs.forEach((spring, idx) => {
        if (x >= spring.x && x <= spring.x + spring.currentLength &&
            y >= spring.y - 25 && y <= spring.y) {
          hovered = `spring-${idx}`;
        }
      });
      
      game.pulleyRocks.forEach((rock, idx) => {
        if (x >= rock.x && x <= rock.x + rock.width &&
            y >= rock.y && y <= rock.y + rock.height) {
          hovered = `pulley-${idx}`;
        }
      });
      
      setHoveredElement(hovered);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    
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
      let speed = player.speedMode === 'turbo' ? PLAYER_TURBO_SPEED :
                  player.speedMode === 'run' ? PLAYER_RUN_SPEED : PLAYER_WALK_SPEED;
      
      if (game.keys['ArrowLeft'] || game.keys['a']) {
        player.vx = -speed;
        player.facingRight = false;
      } else if (game.keys['ArrowRight'] || game.keys['d']) {
        player.vx = speed;
        player.facingRight = true;
      } else {
        player.vx = 0;
      }
      
      if ((game.keys['ArrowUp'] || game.keys['w'] || game.keys[' ']) && player.onGround) {
        player.vy = JUMP_FORCE;
        player.onGround = false;
      }
      
      player.vy += GRAVITY;
      player.x += player.vx;
      player.y += player.vy;
      
      player.onGround = checkPlatformCollision(player, game.platforms);
      
      if (player.x < 0) player.x = 0;
      if (player.x > 800 - player.width) player.x = 800 - player.width;
      
      if (game.buttonCooldown > 0) game.buttonCooldown--;
      
      const button = game.button;
      if (game.keys['e'] && game.buttonCooldown === 0 &&
          player.x + player.width > button.x &&
          player.x < button.x + button.width &&
          Math.abs(player.y + player.height - button.y) < 50) {
        game.springs.forEach(spring => {
          spring.constantIndex = (spring.constantIndex + 1) % SPRING_CONSTANTS.length;
        });
        game.buttonPressed = true;
        game.buttonCooldown = 20;
        setTimeout(() => { game.buttonPressed = false; }, 100);
      }
      
      if (game.keys['x'] && game.buttonCooldown === 0) {
        game.springs.forEach(spring => {
          spring.currentLength = spring.naturalLength;
          spring.locked = false;
          spring.tabUp = false;
        });
        game.buttonCooldown = 20;
      }
      
      game.pushableRocks.forEach(rock => {
        rock.vx *= 0.95;
        rock.vy += GRAVITY;
        rock.x += rock.vx;
        rock.y += rock.vy;
        rock.onGround = checkPlatformCollision(rock, game.platforms);
        
        if (rock.x < 0) { rock.x = 0; rock.vx = 0; }
        if (rock.x > 800 - rock.width) { rock.x = 800 - rock.width; rock.vx = 0; }
        
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
      
      game.springs.forEach(spring => {
        const springRight = spring.x + spring.currentLength;
        const isPlayerOnSpringPlatform = player.onGround && 
            Math.abs(player.y + player.height - spring.y) < 5;
        const playerOverlapsSpring = player.x < springRight + 5 && 
            player.x + player.width > spring.x;
        
        if (isPlayerOnSpringPlatform && playerOverlapsSpring && !spring.locked) {
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
            
            if (currentCompression >= targetCompression - 2) {
              spring.locked = true;
              spring.lockedLength = spring.naturalLength - targetCompression;
              spring.currentLength = spring.lockedLength;
              spring.tabUp = true;
            }
            
            if (!spring.locked) {
              const k = SPRING_CONSTANTS[spring.constantIndex];
              const springForce = currentCompression * k * 0.2;
              player.x += springForce;
            }
          }
        }
        
        if (spring.locked) {
          spring.currentLength = spring.lockedLength;
          spring.tabUp = true;
        }
      });
      
      game.springs.forEach(spring => {
        if (!spring.locked && spring.currentLength < spring.naturalLength) {
          let rockTouching = false;
          game.pushableRocks.forEach(rock => {
            const springRight = spring.x + spring.currentLength;
            if (rock.x < springRight + 5 &&
                rock.x + rock.width > spring.x &&
                Math.abs(rock.y + rock.height - spring.y) < 10) {
              rockTouching = true;
            }
          });
          
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
      
      game.pulleyRocks.forEach(rock => {
        const pulleyPlatform = game.platforms.find(p => 
          Math.abs(p.y - game.pulley.y) < 5
        );
        const nearPulley = pulleyPlatform &&
            player.x + player.width > pulleyPlatform.x &&
            player.x < pulleyPlatform.x + pulleyPlatform.width &&
            Math.abs(player.y + player.height - pulleyPlatform.y) < 5;
        
        if (nearPulley) {
          if (game.keys['f'] && !game.pulleyUpPressed) {
            if (rock.currentLevel > 0) {
              rock.currentLevel--;
              rock.y = PULLEY_LEVELS[rock.currentLevel];
            }
            game.pulleyUpPressed = true;
          }
          
          if (game.keys['r'] && !game.pulleyDownPressed) {
            if (rock.currentLevel < PULLEY_LEVELS.length - 1) {
              rock.currentLevel++;
              rock.y = PULLEY_LEVELS[rock.currentLevel];
            }
            game.pulleyDownPressed = true;
          }
        }
        
        if (!game.keys['f']) game.pulleyUpPressed = false;
        if (!game.keys['r']) game.pulleyDownPressed = false;
      });
      
      game.currentEnergy = calculateEnergy();
      
      game.barriers.forEach(barrier => {
        if (barrier.openWhen === 'below') {
          barrier.open = game.currentEnergy < barrier.threshold;
        } else if (barrier.openWhen === 'above') {
          barrier.open = game.currentEnergy > barrier.threshold;
        }
      });
      
      game.barriers.forEach(barrier => {
        if (!barrier.open) {
          if (player.x + player.width > barrier.x &&
              player.x < barrier.x + barrier.width &&
              player.y + player.height > barrier.y &&
              player.y < barrier.y + barrier.height) {
            if (barrier.type === 'vertical') {
              if (player.vx > 0) {
                player.x = barrier.x - player.width;
              } else if (player.vx < 0) {
                player.x = barrier.x + barrier.width;
              }
              player.vx = 0;
            } else if (barrier.type === 'horizontal') {
              if (player.vy > 0) {
                player.y = barrier.y - player.height;
                player.vy = 0;
                player.onGround = true;
              } else if (player.vy < 0) {
                player.y = barrier.y + barrier.height;
                player.vy = 0;
              }
            }
          }
        }
      });
      
      const energyDiff = Math.abs(game.currentEnergy - game.targetEnergy);
      game.door.open = energyDiff <= game.tolerance;
      
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
      
      // RENDER
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, 800, 500);
      
      game.platforms.forEach(platform => {
        ctx.fillStyle = '#654321';
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        ctx.fillStyle = '#228B22';
        ctx.fillRect(platform.x, platform.y - 3, platform.width, 3);
      });
      
      ctx.fillStyle = game.buttonPressed ? '#00FF00' : '#FF4444';
      ctx.fillRect(button.x, button.y, button.width, button.height);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeRect(button.x, button.y, button.width, button.height);
      
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('K', button.x + 8, button.y - 5);
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(button.x - 10, button.y - 70, 90, 50);
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('Spring K:', button.x - 5, button.y - 50);
      
      for (let i = 0; i < SPRING_CONSTANTS.length; i++) {
        ctx.fillStyle = i === game.springs[0].constantIndex ? '#00FF00' : '#666';
        ctx.beginPath();
        ctx.arc(button.x + 5 + i * 18, button.y - 33, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      
      game.springs.forEach(spring => {
        ctx.strokeStyle = spring.locked ? '#FF0000' : '#FF6347';
        ctx.lineWidth = 5;
        ctx.beginPath();
        const segments = 12;
        const segmentWidth = spring.currentLength / segments;
        const compressionRatio = spring.currentLength / spring.naturalLength;
        const waveHeight = 12 * compressionRatio;
        
        for (let i = 0; i <= segments; i++) {
          const x = spring.x + i * segmentWidth;
          const y = spring.y - 10 + (i % 2 === 0 ? -waveHeight : waveHeight);
          if (i === 0) ctx.moveTo(spring.x, spring.y - 10);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        
        ctx.fillStyle = '#666';
        ctx.fillRect(spring.x - 5, spring.y - 20, 5, 20);
        ctx.fillRect(spring.x + spring.currentLength, spring.y - 20, 5, 20);
        
        if (spring.tabUp) {
          const tabX = spring.x + spring.currentLength;
          ctx.fillStyle = '#FFD700';
          ctx.fillRect(tabX, spring.y, 8, 15);
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 1;
          ctx.strokeRect(tabX, spring.y, 8, 15);
        }
        
        if (spring.locked) {
          ctx.fillStyle = '#FF0000';
          ctx.font = 'bold 12px monospace';
          ctx.fillText('LOCKED', spring.x + 10, spring.y - 25);
        }
      });
      
      game.pushableRocks.forEach(rock => {
        ctx.fillStyle = '#A9A9A9';
        ctx.fillRect(rock.x, rock.y, rock.width, rock.height);
        ctx.strokeStyle = '#696969';
        ctx.lineWidth = 2;
        ctx.strokeRect(rock.x, rock.y, rock.width, rock.height);
        
        ctx.strokeStyle = '#808080';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rock.x + 10, rock.y);
        ctx.lineTo(rock.x + 10, rock.y + rock.height);
        ctx.moveTo(rock.x + 30, rock.y);
        ctx.lineTo(rock.x + 30, rock.y + rock.height);
        ctx.stroke();
      });
      
      game.pulleyRocks.forEach(rock => {
        const pulley = game.pulley;
        ctx.fillStyle = '#666';
        ctx.beginPath();
        ctx.arc(pulley.x, pulley.ropeAttachY, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(pulley.x, pulley.ropeAttachY);
        ctx.lineTo(pulley.x, rock.y);
        ctx.stroke();
        
        PULLEY_LEVELS.forEach((level, idx) => {
          ctx.fillStyle = idx === rock.currentLevel ? '#FFD700' : '#666';
          ctx.beginPath();
          ctx.arc(pulley.x, level + 20, 4, 0, Math.PI * 2);
          ctx.fill();
        });
        
        ctx.fillStyle = '#A9A9A9';
        ctx.fillRect(rock.x, rock.y, rock.width, rock.height);
        ctx.strokeStyle = '#696969';
        ctx.lineWidth = 2;
        ctx.strokeRect(rock.x, rock.y, rock.width, rock.height);
        
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`L${rock.currentLevel + 1}`, rock.x + 8, rock.y - 5);
      });
      
      game.barriers.forEach(barrier => {
        ctx.fillStyle = barrier.open ? 'rgba(100, 100, 100, 0.3)' : '#8B0000';
        ctx.fillRect(barrier.x, barrier.y, barrier.width, barrier.height);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeRect(barrier.x, barrier.y, barrier.width, barrier.height);
        
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 12px monospace';
        ctx.save();
        
        if (barrier.type === 'vertical') {
          ctx.translate(barrier.x + 10, barrier.y + barrier.height / 2);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(barrier.open ? 'OPEN' : 'CLOSED', 0, 0);
        } else {
          ctx.fillText(barrier.open ? 'OPEN' : 'CLOSED', barrier.x + barrier.width / 2 - 25, barrier.y + 13);
        }
        ctx.restore();
        
        if (!barrier.open) {
          ctx.fillStyle = '#FF0000';
          ctx.font = '12px monospace';
          const conditionText = barrier.openWhen === 'below' 
            ? `Opens when E<${barrier.threshold}` 
            : `Opens when E>${barrier.threshold}`;
          
          if (barrier.type === 'vertical') {
            ctx.fillText(conditionText, barrier.x + 25,  barrier.y + barrier.height/5 );
          } else {
          
            ctx.fillText(conditionText, barrier.x , barrier.y - 5);
          }
           ctx.restore();
        }
      });
      
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
      
      const meterX = 10, meterY = 10, meterWidth = 250, meterHeight = 100;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(meterX, meterY, meterWidth, meterHeight);
      
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 18px monospace';
      ctx.fillText('ENERGY METER', meterX + 10, meterY + 25);
      
      ctx.font = '11px monospace';
      ctx.fillStyle = '#AAA';
      
      const barX = meterX + 10, barY = meterY + 50;
      const barWidth = meterWidth - 20, barHeight = 25;
      
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      
      const maxEnergy = game.targetEnergy + 300;
      const energyRatio = Math.min(game.currentEnergy / maxEnergy, 1);
      const currentBarWidth = barWidth * energyRatio;
      
      const diff = Math.abs(game.currentEnergy - game.targetEnergy);
      const isInRange = diff <= game.tolerance;
      
      ctx.fillStyle = isInRange ? '#00FF00' : 
                      game.currentEnergy < game.targetEnergy ? '#FFA500' : '#FF4444';
      ctx.fillRect(barX, barY, currentBarWidth, barHeight);
      
      const targetRatio = game.targetEnergy / maxEnergy;
      const targetX = barX + barWidth * targetRatio;
      
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(targetX, barY - 5);
      ctx.lineTo(targetX, barY + barHeight + 5);
      ctx.stroke();
      
      ctx.fillStyle = '#00FF00';
      ctx.beginPath();
      ctx.moveTo(targetX - 5, barY - 5);
      ctx.lineTo(targetX + 5, barY - 5);
      ctx.lineTo(targetX, barY);
      ctx.fill();
      
      ctx.fillStyle = '#FFF';
      ctx.font = '13px monospace';
      ctx.fillText(`Current: ${game.currentEnergy}`, barX, barY + barHeight + 16);
      ctx.fillText(`Target: ${game.targetEnergy} ±${game.tolerance}`, barX + 120, barY + barHeight + 16);
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(270, 10, 520, 70);
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('CONTROLS', 280, 28);
      ctx.font = '12px monospace';
      ctx.fillText('WASD/Arrows:Move Space:Jump Shift: Turbo', 280, 45);
      ctx.fillText('E:Toggle K (left) | F/R:Pulley Up/Down | X:Reset Springs', 280, 62);
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(270, 85, 520, 25);
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(levels[currentLevel].name, 280, 102);
      
      if (hoveredElement) {
        const tooltipWidth = 320;
        const tooltipHeight = 120;
        const tooltipX = Math.min(mousePos.x + 15, 800 - tooltipWidth - 10);
        const tooltipY = Math.max(mousePos.y - tooltipHeight - 15, 10);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
        ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
        
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 14px monospace';
        
        if (hoveredElement === 'player') {
          ctx.fillText('KINETIC ENERGY', tooltipX + 10, tooltipY + 22);
          ctx.fillStyle = '#FFF';
          ctx.font = '12px monospace';
          ctx.fillText('Energy of motion:', tooltipX + 10, tooltipY + 42);
          ctx.fillText('KE = 1/2 × m × v²', tooltipX + 10, tooltipY + 60);
          ctx.fillText('Increases with speed!', tooltipX + 10, tooltipY + 78);
          ctx.fillText('Try running and jumping', tooltipX + 10, tooltipY + 96);
        } else if (hoveredElement.startsWith('spring')) {
          ctx.fillText('SPRING POTENTIAL ENERGY', tooltipX + 10, tooltipY + 22);
          ctx.fillStyle = '#FFF';
          ctx.font = '12px monospace';
          ctx.fillText('Energy stored when compressed:', tooltipX + 10, tooltipY + 42);
          ctx.fillText('PE = 1/2 × k × x²', tooltipX + 10, tooltipY + 60);
          ctx.fillText('k = spring constant', tooltipX + 10, tooltipY + 78);
          ctx.fillText('x = compression distance', tooltipX + 10, tooltipY + 96);
        } else if (hoveredElement.startsWith('pulley')) {
          ctx.fillText('GRAVITATIONAL POTENTIAL ENERGY', tooltipX + 10, tooltipY + 22);
          ctx.fillStyle = '#FFF';
          ctx.font = '12px monospace';
          ctx.fillText('Energy from height:', tooltipX + 10, tooltipY + 42);
          ctx.fillText('PE = m × g × h', tooltipX + 10, tooltipY + 60);
          ctx.fillText('m = mass, g = gravity', tooltipX + 10, tooltipY + 78);
          ctx.fillText('h = height above ground', tooltipX + 10, tooltipY + 96);
        }
      }
      
      animationId = requestAnimationFrame(gameLoop);
    };
    
    gameLoop();
    
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [gameState, currentLevel, mousePos, hoveredElement]);
  
  return (
    <div className="fixed inset-0 bg-gray-900 text-white flex items-center justify-center">
      {gameState === 'menu' && (
        <div className="bg-gray-800 p-10 rounded-2xl shadow-2xl text-center max-w-xl w-full">
          <h1 className="text-4xl font-bold mb-4">
            Energy Physics Puzzle
          </h1>
          <p className="text-gray-300 mb-8">
            Store, harness, and gain energy to reach the critical value to unlock the door to the next level!
            You will compress springs, change the spring constant, move a rock up and down, and move yourself at different speeds all to adjust the total energy of the game to reach the critical value (within 5 points).</p>
            
           <p> <strong>Controls:</strong> </p>
            
            <p> <strong>WASD/Arrows</strong>: Move  </p>
             <p><strong>Shift</strong>: Turbo Speed</p>
             <p><strong>e</strong>: Press the K-changing button</p>
             <p><strong>r/f</strong>:Pulley Up/Down </p>
             <p><strong>x</strong>:Reset Springs</p>
             
             <p> .</p>
            
        
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
        <div className="bg-gray-800 p-8 rounded-lg shadow-2xl text-center max-w-xl w-full">
          <h1 className="text-4xl font-bold text-green-400 mb-4">
            All Levels Complete!
          </h1>
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