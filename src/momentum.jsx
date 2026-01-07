import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw } from 'lucide-react';

const MomentumGame = () => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  
  // Game state
  const [level, setLevel] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hardMode, setHardMode] = useState(false);
  
  // Physics parameters
  const [mass1] = useState(2); // kg - left block (constant)
  const [mass2, setMass2] = useState(3); // kg - right block (adjustable)
  const [reboundFraction, setReboundFraction] = useState(0.5); // fraction of speed block 1 rebounds with
  const [elasticity, setElasticity] = useState(0.8); // coefficient of restitution for hard mode
  const launchVelocity = 7; // m/s - constant launch speed
  const g = 0.125; // m/s² - slightly larger than 0.125 so blocks can just make it with a bit of velocity left
  
  // Block positions and velocities
  const [block1, setBlock1] = useState({ x: 200, v: 0, y: 0, initialV: 0, displayV: 0, postCollisionV: null, passed: false, settled: false, success: false, rollingBack: false, onHill: false, onFlatTop: false });
  const [block2, setBlock2] = useState({ x: 500, v: 0, y: 0, initialV: 0, displayV: 0, postCollisionV: null, passed: false, settled: false, success: false, rollingBack: false, onHill: false, onFlatTop: false });
  const [hasCollided, setHasCollided] = useState(false);
  
  // Gate pass states (persistent)
  const [leftGateStatus, setLeftGateStatus] = useState('neutral'); // 'neutral', 'success', 'fail'
  const [rightGateStatus, setRightGateStatus] = useState('neutral'); // 'neutral', 'success', 'fail'
  
  // Level configurations - gate velocities
  const levels = {
    1: { leftGate: -2, rightGate: 4, description: "Elastic collision basics" },
    2: { leftGate: -2.5, rightGate: 3.5, description: "Moderate elasticity" },
    3: { leftGate: -1.5, rightGate: 4.5, description: "High elasticity" },
  };
  
  const currentLevel = levels[level];
  
  // Canvas dimensions - made even wider
  const canvasWidth = 1050;
  const canvasHeight = 300;
  const blockSize = 40;
  const ground = 240;
  
  // Gate and hill positions - moved hills further from edges with flat tops
  const leftGateX = 150;
  const rightGateX = 700;
  const leftHillStart = 60;
  const leftHillEnd = 140;
  const rightHillStart = 810;
  const rightHillEnd = 890;
  
  // Calculate hill height based on required velocity
  // Using energy conservation: (1/2)mv² = mgh => h = v²/(2g)
  const getRequiredHeight = (velocity) => {
    return (velocity * velocity) / (2 * g);
  };
  
  const leftHillHeight = getRequiredHeight(Math.abs(currentLevel.leftGate))-1.0;
  const rightHillHeight = getRequiredHeight(currentLevel.rightGate)-2;
  
  // Calculate block 2 size based on mass
  const getBlock2Size = () => {
    // Scale block size proportionally to mass
    // Base size of 40 for mass of 2 kg
    return blockSize * Math.pow(mass2 / 2, 0.5); // Square root scaling for more reasonable visual scaling
  };
  
  const block2Size = getBlock2Size();
  
  // Hill function using arctan for smooth curve
  // Returns height at position x
  const getHillHeight = (x, hillStart, hillEnd, maxHeight, isLeft) => {
    if (isLeft) {
      // Left hill: rises as x decreases (going left)
      if (x >= hillEnd) return 0;
      if (x <= hillStart) return maxHeight;
      
      // Map x to range [0, 1] where 0 is hillEnd and 1 is hillStart
      const progress = (hillEnd - x) / (hillEnd - hillStart);
      // Use arctan to create smooth S-curve, scaled and shifted
      const curve = (Math.atan((progress - 0.5) * 6) / Math.atan(3) + 1) / 2;
      return curve * (maxHeight*1);
    } else {
      // Right hill: rises as x increases (going right)
      if (x <= hillStart) return 0;
      if (x >= hillEnd) return maxHeight;
      
      // Map x to range [0, 1] where 0 is hillStart and 1 is hillEnd
      const progress = (x - hillStart) / (hillEnd - hillStart);
      // Use arctan to create smooth S-curve
      const curve = (Math.atan((progress - 0.5) * 6) / Math.atan(3) + 1) / 2;
      return curve * (maxHeight*1);
    }
  };
  
  // Calculate maximum physically possible rebound fraction
  const getMaxReboundFraction = () => {
    const maxFraction = (mass2 - mass1) / (mass1 + mass2);
    return Math.max(0, Math.min(1, maxFraction));
  };
  
  // Calculate post-collision velocities based on elasticity (hard mode)
  const calculateElasticCollisionVelocities = (v1Before, v2Before, e) => {
    // Using coefficient of restitution formula
    // e = -(v1After - v2After) / (v1Before - v2Before)
    // Combined with conservation of momentum: m1*v1Before + m2*v2Before = m1*v1After + m2*v2After
    
    const totalMass = mass1 + mass2;
    const relativeVelocity = v1Before - v2Before;
    
    const v1After = ((mass1 - e * mass2) * v1Before + mass2 * (1 + e) * v2Before) / totalMass;
    const v2After = ((mass2 - e * mass1) * v2Before + mass1 * (1 + e) * v1Before) / totalMass;
    
    return { v1After, v2After };
  };
  
  // Reset simulation
  const reset = () => {
    setIsRunning(false);
    setGameOver(false);
    setSuccess(false);
    setBlock1({ x: 200, v: 0, y: 0, initialV: 0, displayV: 0, postCollisionV: null, passed: false, settled: false, success: false, rollingBack: false, onHill: false, onFlatTop: false });
    setBlock2({ x: 500, v: 0, y: 0, initialV: 0, displayV: 0, postCollisionV: null, passed: false, settled: false, success: false, rollingBack: false, onHill: false, onFlatTop: false });
    setHasCollided(false);
    setLeftGateStatus('neutral');
    setRightGateStatus('neutral');
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };
  
  // Launch block
  const launch = () => {
    if (isRunning) return;
    reset();
    setBlock1({ x: 200, v: launchVelocity, y: 0, initialV: 0, displayV: launchVelocity, postCollisionV: null, passed: false, settled: false, success: false, rollingBack: false, onHill: false, onFlatTop: false });
    setIsRunning(true);
  };
  
  // Physics simulation
  useEffect(() => {
    if (!isRunning || gameOver) return;
    
    const simulate = () => {
      setBlock1(prev => {
        if (prev.settled) return prev;
        
        let newX = prev.x;
        let newV = prev.v;
        let newY = prev.y;
        let newInitialV = prev.initialV;
        let newDisplayV = prev.displayV;
        let newPassed = prev.passed;
        let newSettled = prev.settled;
        let newSuccess = prev.success;
        let newRollingBack = prev.rollingBack;
        let newOnHill = prev.onHill;
        let newOnFlatTop = prev.onFlatTop;
        
        // Not on hill yet - move normally
        if (!newOnHill && !newOnFlatTop) {
          newX = prev.x + prev.v * 0.75;
          
          // Check left gate passage
          if (!prev.passed && newX <= leftGateX && prev.v < 0) {
            const threshold = 0.1;
            if (Math.abs(prev.v - currentLevel.leftGate) < threshold) {
              newPassed = true;
              setLeftGateStatus('success');
            } else {
              setLeftGateStatus('fail');
            }
          }
          
          // Check if entering the hill
          if (newX <= leftHillEnd && prev.v < 0 && !newOnHill) {
            newOnHill = true;
            newInitialV = Math.abs(prev.v);
            newDisplayV = prev.v; // Freeze display velocity when entering hill
          }
          
          // Check if going off screen to the left without hitting hill
          if (newX + blockSize < -100 && !newOnHill) {
            newSettled = true;
          }
        }
        
        // On hill or flat top - apply energy conservation physics
        if ((newOnHill || newOnFlatTop) && !prev.settled) {
          const initialSpeed = newInitialV;
          const maxPossibleHeight = (initialSpeed * initialSpeed) / (2 * g);
          
          // Move based on current velocity
          newX = prev.x + prev.v * 0.75;
          
          // Check if we just entered the flat top
          if (newX < leftHillStart && !prev.onFlatTop && newOnHill) {
            // Calculate remaining velocity at the flat top
            const speedSquared = initialSpeed * initialSpeed - 2 * g * leftHillHeight;
            
            // Only allow entering flat top if there's enough energy
            if (speedSquared > 0) {
              newOnFlatTop = true;
              newOnHill = false;
              
              const currentSpeed = Math.sqrt(speedSquared);
              newV = -currentSpeed;
              newY = leftHillHeight;
            }
            // If speedSquared <= 0, stay on hill and let rollback logic handle it
          } else if (newOnFlatTop) {
            // Already on flat top
            newY = leftHillHeight;
            
            const leftTargetX = 20;
            
            // Calculate where we would move to
            const potentialNewX = prev.x + prev.v * 0.75;
            
            // Check if we're moving slowly and close to or past the target
            const isMovingSlow = Math.abs(prev.v) < 0.25;
            const isNearOrPastTarget = prev.x <= leftTargetX + 10;
            
            if (isMovingSlow && isNearOrPastTarget) {
              // Lock into target
              newX = leftTargetX;
              newV = 0;
              newSettled = true;
              newSuccess = true;
            } else {
            
            // Check if we would cross the target
            if (prev.x > leftTargetX && potentialNewX <= leftTargetX) {
              // We're crossing the target this frame
              if (Math.abs(prev.v) < 0.08) {
                // Nearly zero velocity - perfect landing, stop at target
                newX = leftTargetX;
                newV = 0;
                newSettled = true;
                newSuccess = true;
              } else {
                // Too much velocity - continue past the target
                newX = potentialNewX;
                const frictionDecel = 0.004;
                newV = newV + frictionDecel; // Decelerate (v is negative)
              }
            } else if (potentialNewX <= leftTargetX) {
              // Already past the target - keep sliding off screen
              newX = potentialNewX;
              // Just keep the velocity, let it slide off
            } else {
              // Haven't reached target yet - continue sliding with friction
              newX = potentialNewX;
              const frictionDecel = 0.004;
              if (Math.abs(newV) < 0.05) {
                // Moving very slowly, reduce friction
                newV = newV * 0.99;
                // If we're very close to the target and moving slowly, snap to it
                if (Math.abs(newX - leftTargetX) < 10 && newX > leftTargetX) {
                  newX = leftTargetX;
                  newV = 0;
                  newSettled = true;
                  newSuccess = true;
                }
              } else {
                newV = newV + (newV > 0 ? -frictionDecel : frictionDecel);
              }
            }
            }
            
            // Check if going off screen
            if (newX + blockSize < -100) {
              newSettled = true;
            }
          } else if (newOnHill) {
            // On the slope - apply energy conservation
            // Don't clamp position - let it move naturally
            
            const targetHeight = getHillHeight(newX, leftHillStart, leftHillEnd, leftHillHeight, true);
            
            // Check if we've reached max height (too slow)
            if (targetHeight >= maxPossibleHeight -1&& !newRollingBack) {
              // Stop and start rolling back immediately
              newRollingBack = true;
              newV = 0.1; // Small velocity to start rolling back (positive = going right)
              newY = maxPossibleHeight;
            } else if (!newRollingBack) {
              // Still going up - calculate velocity from energy conservation
              const speedSquared = initialSpeed * initialSpeed - 2 * g * targetHeight;
              if (speedSquared > 0.01) {
                const currentSpeed = Math.sqrt(speedSquared);
                newV = -currentSpeed; // Negative when going left
                newY = targetHeight;
              } else {
                // Essentially at the turning point - start rolling back immediately
                newRollingBack = true;
                newV = 0.1; // Small velocity to start rolling back (positive = going right)
                newY = targetHeight;
              }
            } else {
              // Rolling back down
              if (newX >= leftGateX) {
                // Reached the gate - stop
                newX = leftGateX;
                newV = 0;
                newY = 0;
                newOnHill = false;
                newSettled = true;
              } else {
                // Still on hill, calculate velocity from energy
                const speedSquared = initialSpeed * initialSpeed - 2 * g * targetHeight;
                if (speedSquared > 0) {
                  const currentSpeed = Math.sqrt(speedSquared);
                  newV = currentSpeed; // Positive when rolling back (going right)
                  newY = targetHeight;
                }
              }
            }
          }
        }
        
        // Check if block went completely off screen
        if (newX + blockSize < -100 || newX > canvasWidth + 100) {
          newSettled = true;
        }
        
        return { ...prev, x: newX, v: newV, y: newY, initialV: newInitialV, displayV: newDisplayV, passed: newPassed, settled: newSettled, success: newSuccess, rollingBack: newRollingBack, onHill: newOnHill, onFlatTop: newOnFlatTop };
      });
      
      setBlock2(prev => {
        if (prev.settled) return prev;
        
        let newX = prev.x;
        let newV = prev.v;
        let newY = prev.y;
        let newInitialV = prev.initialV;
        let newDisplayV = prev.displayV;
        let newPassed = prev.passed;
        let newSettled = prev.settled;
        let newSuccess = prev.success;
        let newRollingBack = prev.rollingBack;
        let newOnHill = prev.onHill;
        let newOnFlatTop = prev.onFlatTop;
        
        // Not on hill yet - move normally
        if (!newOnHill && !newOnFlatTop) {
          newX = prev.x + prev.v * 0.75;
          
          // Check right gate passage
          if (newX >= rightGateX && prev.x < rightGateX && prev.v > 0) {
            const threshold = 0.1;
            if (Math.abs(prev.v - currentLevel.rightGate) < threshold) {
              newPassed = true;
              setRightGateStatus('success');
            } else {
              setRightGateStatus('fail');
            }
          }
          
          // Check if entering the hill
          if (newX + block2Size >= rightHillStart && prev.v > 0 && !newOnHill) {
            newOnHill = true;
            newInitialV = Math.abs(prev.v);
            newDisplayV = prev.v; // Freeze display velocity when entering hill
          }
          
          // Check if going off screen to the right without hitting hill
          if (newX > canvasWidth + 100 && !newOnHill) {
            newSettled = true;
          }
        }
        
        // On hill or flat top - apply energy conservation physics
        if ((newOnHill || newOnFlatTop) && !prev.settled) {
          const initialSpeed = newInitialV;
          const maxPossibleHeight = (initialSpeed * initialSpeed) / (2 * g);
          
          // Move based on current velocity
          newX = prev.x + prev.v * 0.75;
          
          // Check if we just entered the flat top
          if (newX + block2Size > rightHillEnd && !prev.onFlatTop && newOnHill) {
            // Calculate remaining velocity at the flat top
            const speedSquared = initialSpeed * initialSpeed - 2 * g * rightHillHeight;
            
            // Only allow entering flat top if there's enough energy
            if (speedSquared > 0) {
              newOnFlatTop = true;
              newOnHill = false;
              
              const currentSpeed = Math.sqrt(speedSquared);
              newV = currentSpeed;
              newY = rightHillHeight;
            }
            // If speedSquared <= 0, stay on hill and let rollback logic handle it
          } else if (newOnFlatTop) {
            // Already on flat top
            newY = rightHillHeight;
            
            const rightTargetX = rightHillEnd + 1;
            
            // Calculate where we would move to
            const potentialNewX = prev.x + prev.v * 0.75;
            
            // Check if we're moving slowly and close to or past the target
            const isMovingSlow = Math.abs(prev.v) < 0.2;
            const isNearOrPastTarget = prev.x >= rightTargetX - 10;
            
            if (isMovingSlow && isNearOrPastTarget) {
              // Lock into target
              newX = rightTargetX;
              newV = 0;
              newSettled = true;
              newSuccess = true;
            } else {
              // Moving too fast or not at target yet
              if (potentialNewX >= rightTargetX) {
                // Already at or past the target - keep sliding off screen
                newX = potentialNewX;
                // Just keep the velocity, let it slide off
              } else {
                // Haven't reached target yet - continue sliding with friction
                newX = potentialNewX;
                const frictionDecel = 0.004;
                if (Math.abs(newV) < 0.05) {
                  // Moving very slowly, reduce friction
                  newV = newV * 0.99;
                } else {
                  newV = newV - (newV > 0 ? frictionDecel : -frictionDecel);
                }
              }
            }
            
            // Check if going off screen
            if (newX > canvasWidth + 100) {
              newSettled = true;
            }
          } else if (newOnHill) {
            // On the slope - apply energy conservation
            // Don't clamp position - let it move naturally
            
            const targetHeight = getHillHeight(newX + block2Size, rightHillStart, rightHillEnd, rightHillHeight, false);
            
            // Check if we've reached max height (too slow)
            if (targetHeight >= maxPossibleHeight - 1 && !newRollingBack) {
              // Stop and start rolling back immediately
              newRollingBack = true;
              newV = -0.1; // Small velocity to start rolling back
              newY = maxPossibleHeight;
            } else if (!newRollingBack) {
              // Still going up - calculate velocity from energy conservation
              const speedSquared = initialSpeed * initialSpeed - 2 * g * targetHeight;
              if (speedSquared > 0.01) {
                const currentSpeed = Math.sqrt(speedSquared);
                newV = currentSpeed; // Positive when going right
                newY = targetHeight;
              } else {
                // Essentially at the turning point - start rolling back immediately
                newRollingBack = true;
                newV = -0.1; // Small velocity to start rolling back
                newY = targetHeight;
              }
            } else {
              // Rolling back down
              if (newX + block2Size <= rightGateX) {
                // Reached the gate - stop with right edge at gate
                newX = rightGateX - block2Size;
                newV = 0;
                newY = 0;
                newOnHill = false;
                newSettled = true;
              } else {
                // Still on hill, calculate velocity from energy
                const speedSquared = initialSpeed * initialSpeed - 2 * g * targetHeight;
                if (speedSquared > 0) {
                  const currentSpeed = Math.sqrt(speedSquared);
                  newV = -currentSpeed; // Negative when rolling back (going left)
                  newY = targetHeight;
                }
              }
            }
          }
        }
        
        // Check if block went completely off screen
        if (newX < -100 || newX > canvasWidth + 100) {
          newSettled = true;
        }
        
        return { ...prev, x: newX, v: newV, y: newY, initialV: newInitialV, displayV: newDisplayV, passed: newPassed, settled: newSettled, success: newSuccess, rollingBack: newRollingBack, onHill: newOnHill, onFlatTop: newOnFlatTop };
      });
      
      // Check for collision
      setBlock1(b1 => {
        setBlock2(b2 => {
          if (!hasCollided && b1.x + blockSize >= b2.x && b1.v > b2.v) {
            // Only collide if block1 is moving faster than block2 (approaching)
            // This prevents multiple collisions
            
            // ===== Physics check here =====
            const v1i = b1.v;
            const v2i = b2.v;
            const m1 = mass1;
            const m2 = mass2;
            
            console.log('COLLISION DETECTED:');
            console.log('  m1:', m1, 'kg, v1i:', v1i.toFixed(3), 'm/s');
            console.log('  m2:', m2, 'kg, v2i:', v2i.toFixed(3), 'm/s');
            console.log('  hardMode:', hardMode, 'reboundFraction:', reboundFraction, 'elasticity:', elasticity);
            
            let v1f, v2f;
            
            if (hardMode) {
              // Use elasticity coefficient in hard mode
              const velocities = calculateElasticCollisionVelocities(v1i, v2i, elasticity);
              v1f = velocities.v1After;
              v2f = velocities.v2After;
            } else {
              // Use simple rebound fraction in easy mode
              v1f = -reboundFraction * v1i;
              v2f = (m1 * v1i + m2 * v2i - m1 * v1f) / m2;
            }
            
            const initialMomentum = m1 * v1i + m2 * v2i;
            const finalMomentum = m1 * v1f + m2 * v2f;
            console.log('  v1f:', v1f.toFixed(3), 'm/s, v2f:', v2f.toFixed(3), 'm/s');
            console.log('  Initial momentum:', initialMomentum.toFixed(3), 'kg⋅m/s');
            console.log('  Final momentum:', finalMomentum.toFixed(3), 'kg⋅m/s');
            console.log('  Momentum conserved:', Math.abs(initialMomentum - finalMomentum) < 0.001);
            
            setHasCollided(true);
            
            // Separate the blocks to prevent re-collision
            const separationDistance = 10;
            
            // Set display velocities to freeze at collision values
            setBlock1({ ...b1, x: b1.x - separationDistance, v: v1f, displayV: v1f, postCollisionV: v1f });
            setBlock2({ ...b2, x: b2.x + separationDistance, v: v2f, displayV: v2f, postCollisionV: v2f });
            
            return { ...b2, x: b2.x + separationDistance, v: v2f, displayV: v2f, postCollisionV: v2f };
          }
          return b2;
        });
        return b1;
      });
      
      animationRef.current = requestAnimationFrame(simulate);
    };
    
    animationRef.current = requestAnimationFrame(simulate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, gameOver, hasCollided, mass1, mass2, reboundFraction, elasticity, hardMode, currentLevel, g, leftHillHeight, rightHillHeight]);
  
  // Separate effect to check for game over
  useEffect(() => {
    if (isRunning && !gameOver && block1.settled && block2.settled) {
      setGameOver(true);
      setSuccess(block1.success && block2.success);
    }
  }, [block1.settled, block2.settled, block1.success, block2.success, isRunning, gameOver]);
  
  // Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw ground
    ctx.fillStyle = '#8B7355';
    ctx.fillRect(0, ground, canvasWidth, canvasHeight - ground);
    
    // Get gate colors based on status
    const getGateColor = (status) => {
      if (status === 'success') return '#4CAF50';
      if (status === 'fail') return '#F44336';
      return '#2196F3';
    };
    
    // Draw left hill with flat top
    ctx.fillStyle = '#A0826D';
    ctx.beginPath();
    ctx.moveTo(0, ground);
    ctx.lineTo(0, ground - leftHillHeight);
    ctx.lineTo(leftHillStart, ground - leftHillHeight);
    for (let x = leftHillStart; x <= leftHillEnd; x += 2) {
      const h = getHillHeight(x, leftHillStart, leftHillEnd, leftHillHeight, true);
      ctx.lineTo(x, ground - h);
    }
    ctx.lineTo(leftHillEnd, ground);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#6B5444';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw right hill with flat top
    ctx.fillStyle = '#A0826D';
    ctx.beginPath();
    ctx.moveTo(rightHillStart, ground);
    for (let x = rightHillStart; x <= rightHillEnd; x += 2) {
      const h = getHillHeight(x, rightHillStart, rightHillEnd, rightHillHeight, false);
      ctx.lineTo(x, ground - h);
    }
    ctx.lineTo(rightHillEnd, ground - rightHillHeight);
    ctx.lineTo(canvasWidth, ground - rightHillHeight);
    ctx.lineTo(canvasWidth, ground);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#6B5444';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw target outlines on flat tops of hills - visible positions
    const leftTargetX = 20;
    const rightTargetX = rightHillEnd + 1;
    
    ctx.strokeStyle = '#666';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 3;
    ctx.strokeRect(leftTargetX, ground - leftHillHeight - blockSize, blockSize, blockSize);
    ctx.strokeRect(rightTargetX, ground - rightHillHeight - block2Size, block2Size, block2Size);
    ctx.setLineDash([]);
    
    // Draw gates
    ctx.strokeStyle = getGateColor(leftGateStatus);
    ctx.lineWidth = 4;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(leftGateX, Math.max(ground - leftHillHeight - 60, 20));
    ctx.lineTo(leftGateX, ground);
    ctx.stroke();
    
    ctx.strokeStyle = getGateColor(rightGateStatus);
    ctx.beginPath();
    ctx.moveTo(rightGateX, Math.max(ground - rightHillHeight - 60, 20));
    ctx.lineTo(rightGateX, ground);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Gate labels
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    
    ctx.fillStyle = getGateColor(leftGateStatus);
    ctx.fillText(`v = ${currentLevel.leftGate} m/s`, leftGateX, Math.max(ground - leftHillHeight - 70, 15));
    
    ctx.fillStyle = getGateColor(rightGateStatus);
    ctx.fillText(`v = ${currentLevel.rightGate} m/s`, rightGateX, Math.max(ground - rightHillHeight - 70, 15));
    
    // Draw block 1 (left)
    const block1Y = ground - block1.y;
    ctx.fillStyle = block1.success ? '#4CAF50' : '#FF5722';
    ctx.fillRect(block1.x, block1Y - blockSize, blockSize, blockSize);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(block1.x, block1Y - blockSize, blockSize, blockSize);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(mass1 + 'kg', block1.x + blockSize/2, block1Y - blockSize/2 + 5);
    
    // Draw block 2 (right)
    const block2Y = ground - block2.y;
    ctx.fillStyle = block2.success ? '#4CAF50' : '#2196F3';
    ctx.fillRect(block2.x, block2Y - block2Size, block2Size, block2Size);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(block2.x, block2Y - block2Size, block2Size, block2Size);
    ctx.fillStyle = '#000';
    const fontSize = Math.max(12, Math.min(16, block2Size / 3));
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillText(mass2 + 'kg', block2.x + block2Size/2, block2Y - block2Size/2 + fontSize/3);
    
    // Draw velocity vectors with values (using displayV for frozen values)
    if ((isRunning || gameOver) && (!block1.settled || !block2.settled)) {
      const scale = 10;
      
      // Block 1 velocity - use displayV if available
      const block1DisplayV = block1.displayV !== 0 ? block1.displayV : block1.v;
      if (Math.abs(block1DisplayV) > 0.1 && !block1.settled) {
        ctx.strokeStyle = '#FF5722';
        ctx.fillStyle = '#FF5722';
        ctx.lineWidth = 3;
        const arrowY = block1Y - blockSize - 10;
        ctx.beginPath();
        ctx.moveTo(block1.x + blockSize/2, arrowY);
        ctx.lineTo(block1.x + blockSize/2 + block1DisplayV * scale, arrowY);
        ctx.stroke();
        
        const angle = block1DisplayV > 0 ? 0 : Math.PI;
        ctx.beginPath();
        ctx.moveTo(block1.x + blockSize/2 + block1DisplayV * scale, arrowY);
        ctx.lineTo(block1.x + blockSize/2 + block1DisplayV * scale - 5 * Math.cos(angle - Math.PI/6), arrowY - 5 * Math.sin(angle - Math.PI/6));
        ctx.lineTo(block1.x + blockSize/2 + block1DisplayV * scale - 5 * Math.cos(angle + Math.PI/6), arrowY - 5 * Math.sin(angle + Math.PI/6));
        ctx.fill();
        
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FF5722';
        ctx.fillText(`${block1DisplayV.toFixed(2)} m/s`, block1.x + blockSize/2, arrowY - 15);
      }
      
      // Block 2 velocity - use displayV if available
      const block2DisplayV = block2.displayV !== 0 ? block2.displayV : block2.v;
      if (Math.abs(block2DisplayV) > 0.1 && !block2.settled) {
        ctx.strokeStyle = '#2196F3';
        ctx.fillStyle = '#2196F3';
        ctx.lineWidth = 3;
        const arrowY = block2Y - block2Size - 10;
        ctx.beginPath();
        ctx.moveTo(block2.x + block2Size/2, arrowY);
        ctx.lineTo(block2.x + block2Size/2 + block2DisplayV * scale, arrowY);
        ctx.stroke();
        
        const angle = block2DisplayV > 0 ? 0 : Math.PI;
        ctx.beginPath();
        ctx.moveTo(block2.x + block2Size/2 + block2DisplayV * scale, arrowY);
        ctx.lineTo(block2.x + block2Size/2 + block2DisplayV * scale - 5 * Math.cos(angle - Math.PI/6), arrowY - 5 * Math.sin(angle - Math.PI/6));
        ctx.lineTo(block2.x + block2Size/2 + block2DisplayV * scale - 5 * Math.cos(angle + Math.PI/6), arrowY - 5 * Math.sin(angle + Math.PI/6));
        ctx.fill();
        
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#2196F3';
        ctx.fillText(`${block2DisplayV.toFixed(2)} m/s`, block2.x + block2Size/2, arrowY - 15);
      }
    }
  }, [block1, block2, isRunning, gameOver, mass2, currentLevel, leftGateStatus, rightGateStatus, leftHillHeight, rightHillHeight, block2Size]);
  
  // Update rebound fraction if it exceeds physical limit (only in easy mode)
  useEffect(() => {
    if (!hardMode) {
      const maxFraction = getMaxReboundFraction();
      if (reboundFraction > maxFraction) {
        setReboundFraction(maxFraction);
      }
    }
  }, [mass2, hardMode]);
  
  const maxReboundFraction = getMaxReboundFraction();
  
  return (
    <div className="w-full max-w-7xl mx-auto p-4 bg-gradient-to-b from-blue-50 to-white rounded-lg shadow-lg relative">
      <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
        Momentum Collision Game
      </h1>
      <p className="text-center text-gray-600 mb-3">
        Level {level}: {currentLevel.description}
      </p>
      
      {/* Try Again Message Overlay */}
      {gameOver && !success && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black bg-opacity-30 rounded-lg">
          <div className="bg-red-100 bg-opacity-90 border-4 border-red-500 rounded-lg p-8 max-w-md shadow-2xl">
            <p className="text-4xl mb-4 text-center">❌</p>
            <p className="text-3xl font-bold text-red-800 text-center mb-4">Try Again!</p>
            <p className="text-base text-red-700 text-center mb-6">
              {!block1.success && !block2.success && "Neither block achieved the target velocity."}
              {block1.success && !block2.success && "Only the left block achieved the target velocity."}
              {!block1.success && block2.success && "Only the right block achieved the target velocity."}
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={reset}
                className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Success Message */}
      {gameOver && success && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 w-11/12 max-w-md">
          <div className="p-6 rounded-lg text-center font-bold text-lg shadow-2xl border-4 bg-green-100 bg-opacity-90 text-green-800 border-green-500">
            <p className="text-4xl mb-3">🎉 Success!</p>
            <p className="text-base mb-4">Both blocks landed perfectly on the hills!</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={reset}
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
              >
                Play Again
              </button>
              {level < 3 && (
                <button
                  onClick={() => {
                    setLevel(level + 1);
                    reset();
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Next Level
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Controls */}
      <div className="bg-white p-3 rounded-lg shadow mb-3 space-y-3">
        {/* Level Selector */}
        <div className="mb-3">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Level</label>
          <div className="flex gap-2">
            {[1, 2, 3].map(lvl => (
              <button
                key={lvl}
                onClick={() => {
                  setLevel(lvl);
                  reset();
                }}
                disabled={isRunning}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${
                  level === lvl
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Level {lvl}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">{currentLevel.description}</p>
        </div>
        
        <div className="flex items-center gap-3 mb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hardMode}
              onChange={(e) => setHardMode(e.target.checked)}
              disabled={isRunning}
              className="w-5 h-5"
            />
            <span className="text-sm font-semibold text-gray-700">Hard Mode (Elasticity)</span>
          </label>
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Block 2 Mass: {mass2.toFixed(1)} kg
          </label>
          <input
            type="range"
            min="1"
            max="10"
            step="0.1"
            value={mass2}
            onChange={(e) => setMass2(parseFloat(e.target.value))}
            disabled={isRunning}
            className="w-full"
          />
        </div>
        
        {!hardMode ? (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Fraction of original speed that block 1 will rebound with: {reboundFraction.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max={maxReboundFraction}
              step="0.01"
              value={Math.min(reboundFraction, maxReboundFraction)}
              onChange={(e) => setReboundFraction(parseFloat(e.target.value))}
              disabled={isRunning}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum physically possible: {maxReboundFraction.toFixed(2)} (for mass {mass2} kg)
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Elasticity (Coefficient of Restitution): {elasticity.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={elasticity}
              onChange={(e) => setElasticity(parseFloat(e.target.value))}
              disabled={isRunning}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              e = 0: perfectly inelastic, e = 1: perfectly elastic
            </p>
          </div>
        )}
      </div>
      
      {/* Physics Display */}
      <div className="bg-gray-100 p-3 rounded-lg mb-3 flex justify-between gap-4 text-sm text-gray-800">
        <div>
          <p className="font-semibold text-gray-900">Initial Conditions:</p>
          <p>Block 1: m₁ = {mass1} kg, v₁ = {launchVelocity} m/s</p>
          <p>Block 2: m₂ = {mass2.toFixed(1)} kg, v₂ = 0 m/s</p>
          <p>{hardMode ? `Elasticity: ${elasticity.toFixed(2)}` : `Rebound fraction: ${reboundFraction.toFixed(2)}`}</p>
        </div>
        <div className="text-right ml-auto">
          <p className="font-semibold text-gray-900">Post-Collision Velocities:</p>
          {block1.postCollisionV !== null ? (
            <>
              <p>Block 1: v₁ = {block1.postCollisionV.toFixed(2)} m/s {block1.passed && '✓'}</p>
              <p>Block 2: v₂ = {block2.postCollisionV.toFixed(2)} m/s {block2.passed && '✓'}</p>
            </>
          ) : (
            <>
              <p>Block 1: —</p>
              <p>Block 2: —</p>
            </>
          )}
        </div>
      </div>
      
      {/* Canvas */}
      <div className="bg-sky-100 rounded-lg p-3 mb-3 overflow-x-auto">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="border-2 border-gray-300 rounded bg-gradient-to-b from-sky-200 to-sky-100"
        />
      </div>
      
      {/* Buttons */}
      <div className="flex gap-4 justify-center mb-3">
        <button
          onClick={launch}
          disabled={isRunning}
          className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          <Play size={20} />
          Launch
        </button>
        <button
          onClick={reset}
          className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition"
        >
          <RotateCcw size={20} />
          Reset
        </button>
      </div>
      
      {/* Instructions */}
      <div className="bg-blue-50 p-3 rounded-lg text-sm text-gray-700">
        <p className="font-semibold mb-2">How to Play:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Adjust Block 2's mass and the {hardMode ? 'elasticity coefficient' : 'rebound fraction'}</li>
          <li>Press Launch to send Block 1 toward Block 2</li>
          <li>Goal: Make both blocks land in the gray outlines on top of the hills</li>
          <li>Blocks convert kinetic energy (½mv²) to potential energy (mgh) as they climb</li>
          <li>Perfect velocity stops exactly at the top - too slow rolls back to the gate!</li>
          {hardMode && <li>Hard Mode: Use coefficient of restitution (e) to control collision elasticity</li>}
        </ul>
      </div>
    </div>
  );
};

export default MomentumGame;