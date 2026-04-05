/**
 * DOUBLE SLIT EXPERIMENT SIMULATOR
 * ================================
 *
 * This simulator demonstrates wave-particle duality and quantum measurement through
 * the famous double slit experiment. It shows three key physics concepts:
 *
 * 1. WAVE INTERFERENCE (Water Waves & Light modes):
 *    - Waves passing through two slits create an interference pattern
 *    - This is explained by Huygens' Principle: each point in a slit acts as a
 *      secondary wave source, and these waves combine (interfere) on the other side
 *    - Constructive interference (waves in phase) creates bright bands
 *    - Destructive interference (waves out of phase) creates dark bands
 *
 * 2. CLASSICAL PARTICLES (Tiny Balls mode):
 *    - Classical particles travel in straight lines through ONE slit or the other
 *    - They create TWO peaks on the detection screen (directly behind each slit)
 *    - NO interference pattern - particles don't interfere with themselves
 *    - This is what we'd expect if light were simply made of tiny bullets
 *
 * 3. QUANTUM BEHAVIOR (Single Photon mode):
 *    - Individual photons are emitted one at a time
 *    - WITHOUT observation: Each photon travels as a WAVE through BOTH slits,
 *      interferes with ITSELF, then collapses to a single point on detection
 *    - Over many photons, an interference pattern builds up - even though each
 *      photon went through individually!
 *    - WITH observation: Measuring which slit the photon passes through "collapses"
 *      the wave function. The photon now behaves like a classical particle,
 *      and the interference pattern disappears (two peaks instead)
 *
 * This demonstrates the central mystery of quantum mechanics: the act of measurement
 * fundamentally changes the behavior of quantum objects.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";

// =============================================================================
// CANVAS LAYOUT CONSTANTS
// =============================================================================
// The simulation space is laid out as:
// [Source] -> [Barrier with two slits] -> [Propagation region] -> [Detection Screen]

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const SOURCE_X = 50;        // Where waves/particles originate
const BARRIER_X = 300;      // Location of the double-slit barrier
const SCREEN_X = 680;       // Detection screen location
const CENTER_Y = CANVAS_HEIGHT / 2;  // Vertical center (between the two slits)

// =============================================================================
// WAVE PHYSICS: HUYGENS' PRINCIPLE IMPLEMENTATION
// =============================================================================
/**
 * Calculates the wave amplitude at any point (x, y) at a given time.
 *
 * PHYSICS: Huygens' Principle states that every point on a wavefront can be
 * considered as a source of secondary spherical wavelets. The new wavefront
 * is the envelope of all these wavelets.
 *
 * For the double slit:
 * - Before the barrier: Simple plane wave traveling from source
 * - After the barrier: Each point in each slit acts as a secondary source
 *   The total amplitude is the superposition (sum) of waves from all these points
 *
 * The interference pattern emerges because waves from different points travel
 * different distances, arriving with different phases. When phases align
 * (constructive interference), amplitude is high. When phases oppose
 * (destructive interference), amplitude cancels out.
 *
 * @param x - Horizontal position
 * @param y - Vertical position
 * @param time - Current time (for wave animation)
 * @param slitY1 - Y position of top slit center
 * @param slitY2 - Y position of bottom slit center
 * @param wavelength - Distance between wave peaks
 * @param slitWidth - Width of each slit opening
 * @returns Amplitude value between -1 and 1
 */
function calculateWaveAmplitude(x, y, time, slitY1, slitY2, wavelength, slitWidth) {
  // Before the barrier: simple traveling plane wave
  // The wave equation: A = cos(kx - ωt) where k = 2π/λ and ω is angular frequency
  if (x <= BARRIER_X) {
    const distance = x - SOURCE_X;
    const omega = 0.1;  // Angular frequency (controls wave animation speed)
    const phase = (2 * Math.PI * distance / wavelength) - (omega * time);
    return Math.cos(phase);
  }

  // After the barrier: Apply Huygens' Principle
  // Sum contributions from multiple point sources across both slits
  let amplitude = 0;
  const omega = 0.1;
  const numPoints = Math.ceil(slitWidth / 3);  // Sample points across slit width
  const slits = [slitY1, slitY2];

  for (const slitY of slits) {
    for (let i = 0; i < numPoints; i++) {
      // Calculate position of this point source within the slit
      const pointY = slitY - slitWidth/2 + (slitWidth * i / (numPoints - 1 || 1));

      // Distance from this point source to the observation point
      const dx = x - BARRIER_X;
      const dy = y - pointY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Phase depends on distance traveled (each wavelength = 2π phase)
      const phase = (2 * Math.PI * distance / wavelength) - (omega * time);

      // Amplitude contribution: cos(phase) / sqrt(distance)
      // The 1/sqrt(r) factor accounts for 2D wave spreading (energy conservation)
      amplitude += Math.cos(phase) / Math.sqrt(Math.max(distance, 1));
    }
  }

  return amplitude / numPoints;
}

// =============================================================================
// DETECTION PROBABILITY: INTERFERENCE PATTERN CALCULATION
// =============================================================================
/**
 * Calculates the detection probability/intensity at a point on the screen.
 *
 * PHYSICS: The intensity (probability of detection) is proportional to the
 * square of the amplitude. This function calculates where particles are
 * most likely to land.
 *
 * Two cases:
 * 1. WITHOUT observer: Full interference pattern
 *    - Uses path difference between the two slits: Δ = d₂ - d₁
 *    - Intensity ~ cos²(πΔ/λ) (from superposition of two waves)
 *    - Includes single-slit diffraction envelope: sinc²(β) where β = πa·sin(θ)/λ
 *
 * 2. WITH observer: Classical two-peak pattern
 *    - Each photon is detected at one slit, so no interference
 *    - Pattern is sum of two Gaussian peaks centered on each slit
 *    - This is what we'd see with classical particles
 *
 * @param y - Vertical position on screen
 * @param slitY1, slitY2 - Slit positions
 * @param wavelength - Wave wavelength
 * @param slitWidth - Width of slits
 * @param hasObserver - Whether which-path information is being measured
 * @returns Relative intensity/probability at this position
 */
function calculateIntensity(y, slitY1, slitY2, wavelength, slitWidth, hasObserver) {
  const x = SCREEN_X;

  // WITH OBSERVER: Classical behavior - no interference
  // The pattern is simply two Gaussian peaks centered on each slit position
  // This is because each photon is detected going through ONE specific slit
  if (hasObserver) {
    const d1 = Math.abs(y - slitY1);
    const d2 = Math.abs(y - slitY2);
    const sigma = slitWidth * 2;  // Spread of each peak
    // Sum of two Gaussian distributions (one per slit)
    return Math.exp(-d1*d1/(2*sigma*sigma)) + Math.exp(-d2*d2/(2*sigma*sigma));
  }

  // WITHOUT OBSERVER: Full quantum interference pattern
  // Calculate path lengths from each slit to this screen position
  const d1 = Math.sqrt((x - BARRIER_X) ** 2 + (y - slitY1) ** 2);
  const d2 = Math.sqrt((x - BARRIER_X) ** 2 + (y - slitY2) ** 2);

  // Path difference determines interference
  // When Δ = nλ (integer wavelengths), we get constructive interference (bright)
  // When Δ = (n+½)λ (half-integer), we get destructive interference (dark)
  const pathDiff = d2 - d1;
  const phase = (2 * Math.PI * pathDiff) / wavelength;

  // Two-slit interference: I ~ cos²(φ/2) where φ is the phase difference
  const intensity = Math.cos(phase / 2) ** 2;

  // Single-slit diffraction envelope (modulates the interference pattern)
  // Each slit has finite width, causing its own diffraction pattern
  // The overall pattern is interference fringes modulated by this envelope
  const theta = Math.atan2(y - CENTER_Y, x - BARRIER_X);
  const beta = (Math.PI * slitWidth * Math.sin(theta)) / wavelength;
  const envelope = beta !== 0 ? (Math.sin(beta) / beta) ** 2 : 1;

  return intensity * envelope * 4;
}

// =============================================================================
// MONTE CARLO SAMPLING: QUANTUM PROBABILITY TO PARTICLE DETECTION
// =============================================================================
/**
 * Generates a random landing position based on the probability distribution.
 *
 * PHYSICS: In quantum mechanics, we can only predict PROBABILITIES of where
 * a particle will be detected, not exact positions. This function uses
 * rejection sampling to generate random positions weighted by the intensity
 * distribution (either interference pattern or two-peak classical pattern).
 *
 * For particles: Simple random selection of which slit, with Gaussian spread
 * For waves: Sample from the interference pattern probability distribution
 *
 * @returns Y position where the particle/photon will land on the screen
 */
function sampleFromDistribution(slitY1, slitY2, wavelength, slitWidth, hasObserver, mode) {
  // Classical particles: randomly choose one slit, land near it
  if (mode === 'particles') {
    const slit = Math.random() < 0.5 ? slitY1 : slitY2;
    const spread = slitWidth * 0.5;
    return slit + (Math.random() - 0.5) * spread * 2;
  }

  // Quantum case: use rejection sampling on the intensity distribution
  // This ensures particles land according to |ψ|² (Born rule)
  const maxIntensity = 5;
  let attempts = 0;
  while (attempts < 1000) {
    const y = Math.random() * CANVAS_HEIGHT;
    const intensity = calculateIntensity(y, slitY1, slitY2, wavelength, slitWidth, hasObserver);
    // Accept this position with probability proportional to intensity
    if (Math.random() < intensity / maxIntensity) {
      return y;
    }
    attempts++;
  }
  return CENTER_Y;  // Fallback
}

// =============================================================================
// MAIN REACT COMPONENT
// =============================================================================
export default function DoubleSlit() {
  // Mode selection: 'water' (classical waves), 'light' (photons), 'particles' (classical balls)
  const [mode, setMode] = useState('water');
  const [isRunning, setIsRunning] = useState(true);

  // Physical parameters (in pixels - serves as arbitrary units)
  const [slitWidth, setSlitWidth] = useState(20);
  const [slitSeparation, setSlitSeparation] = useState(80);
  const [wavelength, setWavelength] = useState(40);

  // Observer effect: only meaningful in single photon mode
  // In quantum mechanics, measuring "which path" destroys interference
  const [observerTop, setObserverTop] = useState(false);
  const [observerBottom, setObserverBottom] = useState(false);

  // Single photon mode settings
  const [singleEmission, setSingleEmission] = useState(false);  // Emit one photon at a time
  const [manualEmit, setManualEmit] = useState(false);          // Click to emit each photon
  const [emissionRate, setEmissionRate] = useState(10);         // Auto-emission speed

  const [showMeasurements, setShowMeasurements] = useState(true);

  // Observer effect only applies in single photon mode
  // Classical waves (water, continuous light) always interfere - no observer effect
  const hasObserver = singleEmission && (observerTop || observerBottom);

  // Calculate slit positions (symmetric about center)
  const slitY1 = CENTER_Y - slitSeparation / 2;  // Top slit
  const slitY2 = CENTER_Y + slitSeparation / 2;  // Bottom slit

  // Animation state stored in refs to avoid re-render loops
  const canvasRef = useRef(null);
  const timeRef = useRef(0);
  const particlesRef = useRef([]);  // Active particles/photons in flight
  const hitCountsRef = useRef(new Array(CANVAS_HEIGHT).fill(0));  // Detection histogram
  const animationRef = useRef(null);

  const [, forceUpdate] = useState(0);

  const clearScreen = useCallback(() => {
    hitCountsRef.current = new Array(CANVAS_HEIGHT).fill(0);
    particlesRef.current = [];
    forceUpdate(n => n + 1);
  }, []);

  const handleReset = useCallback(() => {
    timeRef.current = 0;
    clearScreen();
    setIsRunning(true);
  }, [clearScreen]);

  // ---------------------------------------------------------------------------
  // MANUAL PHOTON EMISSION
  // ---------------------------------------------------------------------------
  /**
   * Emit a single photon. The key physics:
   *
   * WITHOUT observer: The photon's landing position is determined by the
   * interference pattern probability distribution, even though only ONE photon
   * is emitted. This is the quantum mystery - the photon "knows" about both slits.
   *
   * WITH observer: The photon is "detected" at one slit (randomly chosen).
   * It then lands directly across from that slit, like a classical particle.
   * The act of observation has changed the outcome!
   */
  const emitPhoton = useCallback(() => {
    if (hasObserver) {
      // WITH OBSERVER: Photon detected at one slit, behaves classically after
      // Randomly choose which slit the photon is "detected" at
      const detectedSlitY = Math.random() < 0.5 ? slitY1 : slitY2;
      // Lands directly across from that slit (with small spread from slit width)
      const landingY = detectedSlitY + (Math.random() - 0.5) * slitWidth * 0.8;

      particlesRef.current.push({
        x: SOURCE_X,
        y: CENTER_Y,
        vx: 4,
        vy: 0,
        landingY,
        detectedSlitY,
        isPhoton: true,
        isObserved: true,
        birthTime: timeRef.current
      });
    } else {
      // WITHOUT OBSERVER: Landing position sampled from interference pattern
      // Even single photons land according to the interference probability!
      const landingY = sampleFromDistribution(slitY1, slitY2, wavelength, slitWidth, false, 'light');

      particlesRef.current.push({
        x: SOURCE_X,
        y: CENTER_Y,
        vx: 4,
        vy: 0,
        landingY,
        detectedSlitY: null,  // Not detected at any particular slit
        isPhoton: true,
        isObserved: false,
        birthTime: timeRef.current
      });
    }
    forceUpdate(n => n + 1);
  }, [hasObserver, slitY1, slitY2, slitWidth, wavelength]);

  // ===========================================================================
  // DRAWING FUNCTIONS
  // ===========================================================================

  /**
   * Draw continuous wave field (water waves or continuous light).
   *
   * Uses Huygens' principle to calculate amplitude at each pixel,
   * then maps amplitude to color. This shows the interference pattern
   * as waves - bright bands where waves constructively interfere,
   * dark bands where they destructively interfere.
   *
   * NOTE: Classical waves (water) always show interference.
   * There is no "observer effect" for classical waves.
   */
  function drawWaves(ctx, time, slitY1, slitY2, wavelength, slitWidth, mode) {
    const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const data = imageData.data;
    const step = 4;  // Sample every 4 pixels for performance

    for (let x = SOURCE_X; x < SCREEN_X - 10; x += step) {
      for (let y = 0; y < CANVAS_HEIGHT; y += step) {
        // Skip pixels that are inside the barrier (not in slits)
        if (x > BARRIER_X - 5 && x < BARRIER_X + 5) {
          const inTopSlit = Math.abs(y - slitY1) < slitWidth / 2;
          const inBottomSlit = Math.abs(y - slitY2) < slitWidth / 2;
          if (!inTopSlit && !inBottomSlit) continue;
        }

        // Calculate wave amplitude using Huygens' principle
        const amplitude = calculateWaveAmplitude(x, y, time, slitY1, slitY2, wavelength, slitWidth);

        // Map amplitude to color
        let r, g, b;
        if (mode === 'water') {
          // Blue color scheme for water waves
          const intensity = (amplitude + 1) / 2;  // Map [-1,1] to [0,1]
          r = Math.floor(20 + intensity * 60);
          g = Math.floor(60 + intensity * 140);
          b = Math.floor(120 + intensity * 135);
        } else {
          // Yellow color scheme for light
          const intensity = Math.max(0, amplitude);  // Only positive (bright)
          const boosted = Math.pow(intensity, 0.7);  // Gamma correction for visibility
          r = Math.floor(40 + 215 * boosted);
          g = Math.floor(30 + 190 * boosted);
          b = Math.floor(10 + 40 * boosted);
        }

        // Fill the sampled region with this color
        for (let dx = 0; dx < step; dx++) {
          for (let dy = 0; dy < step; dy++) {
            const px = x + dx;
            const py = y + dy;
            if (px < CANVAS_WIDTH && py < CANVAS_HEIGHT) {
              const idx = (py * CANVAS_WIDTH + px) * 4;
              data[idx] = r;
              data[idx + 1] = g;
              data[idx + 2] = b;
              data[idx + 3] = 255;
            }
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Draw individual photon wave packets in single photon mode.
   *
   * PHYSICS VISUALIZATION:
   * - Before the barrier: Photon shown as a localized wave packet expanding
   *   from the source. This represents the photon's wavefunction.
   *
   * - After the barrier (NO observer): The wave packet emerges from BOTH slits
   *   simultaneously and interferes with itself. This is the quantum superposition -
   *   the photon is "in both places at once" until detected.
   *
   * - After the barrier (WITH observer): The wave packet emerges from only ONE slit
   *   (the one where it was detected). The observation collapsed the superposition.
   *   The photon now behaves like a classical particle traveling from that slit.
   *
   * The wave packet is drawn with a Gaussian envelope (fading rings) to represent
   * the localization of a real photon (which has finite spatial extent).
   */
  function drawPhotonWavePackets(ctx, photons, slitY1, slitY2, wavelength, slitWidth, currentTime) {
    for (const p of photons) {
      const waveRadius = p.x - SOURCE_X;
      if (waveRadius <= 0) continue;

      // Wave packet width (localization of the photon)
      const packetWidth = wavelength * 1.5;

      if (p.x < BARRIER_X) {
        // BEFORE BARRIER: Expanding wave packet from source
        // Visualized as concentric arcs with Gaussian envelope
        const spread = 1 + (p.x - SOURCE_X) / 600;  // Packet spreads as it propagates
        const effectiveWidth = packetWidth * spread;

        // Draw rings at fixed intervals from the leading edge
        for (let i = 0; i < 6; i++) {
          const ringRadius = waveRadius - i * (wavelength / 2);
          if (ringRadius <= 0) continue;

          // Gaussian envelope - strongest at front, fading behind
          const distFromFront = i * (wavelength / 2);
          const envelope = Math.exp(-distFromFront * distFromFront / (2 * effectiveWidth * effectiveWidth / 4));
          const alpha = envelope * 0.7;

          if (alpha > 0.05) {
            ctx.beginPath();
            ctx.arc(SOURCE_X, CENTER_Y, ringRadius, -Math.PI / 3, Math.PI / 3);
            ctx.strokeStyle = `rgba(255, 221, 68, ${alpha})`;
            ctx.lineWidth = 3;
            ctx.stroke();
          }
        }

        // Glow at the leading edge of the packet
        const gradient = ctx.createRadialGradient(p.x, CENTER_Y, 0, p.x, CENTER_Y, 12);
        gradient.addColorStop(0, 'rgba(255, 255, 200, 0.7)');
        gradient.addColorStop(1, 'rgba(255, 221, 68, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, CENTER_Y, 12, 0, Math.PI * 2);
        ctx.fill();

      } else {
        // AFTER BARRIER: Behavior depends on observation
        const distFromBarrier = p.x - BARRIER_X;

        if (p.isObserved) {
          // WITH OBSERVER: Wave packet emerges from ONE slit only
          // The observation "collapsed" the superposition to one definite slit
          const spread = 1 + distFromBarrier / 500;
          const effectiveWidth = packetWidth * spread;

          // Draw wave packet from the detected slit only
          for (let i = 0; i < 5; i++) {
            const ringRadius = distFromBarrier - i * (wavelength / 2);
            if (ringRadius <= 0) continue;

            const distFromFront = i * (wavelength / 2);
            const envelope = Math.exp(-distFromFront * distFromFront / (2 * effectiveWidth * effectiveWidth / 4));
            const alpha = envelope * 0.6;

            if (alpha > 0.03) {
              ctx.beginPath();
              ctx.arc(BARRIER_X, p.detectedSlitY, ringRadius, -Math.PI / 2, Math.PI / 2);
              ctx.strokeStyle = `rgba(255, 221, 68, ${alpha})`;
              ctx.lineWidth = 2;
              ctx.stroke();
            }
          }

          // Glow traveling horizontally from the slit
          const gradient = ctx.createRadialGradient(p.x, p.landingY, 0, p.x, p.landingY, 10);
          gradient.addColorStop(0, 'rgba(255, 255, 200, 0.6)');
          gradient.addColorStop(1, 'rgba(255, 221, 68, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(p.x, p.landingY, 10, 0, Math.PI * 2);
          ctx.fill();

        } else {
          // WITHOUT OBSERVER: Wave packet emerges from BOTH slits simultaneously
          // This is quantum superposition - the photon goes through both slits!
          // These two wave packets will interfere with each other
          const spread = 1 + distFromBarrier / 500;
          const effectiveWidth = packetWidth * spread;

          for (const slitY of [slitY1, slitY2]) {
            // Draw rings emerging from each slit
            for (let i = 0; i < 5; i++) {
              const ringRadius = distFromBarrier - i * (wavelength / 2);
              if (ringRadius <= 0) continue;

              const distFromFront = i * (wavelength / 2);
              const envelope = Math.exp(-distFromFront * distFromFront / (2 * effectiveWidth * effectiveWidth / 4));
              const alpha = envelope * 0.5;

              if (alpha > 0.03) {
                ctx.beginPath();
                ctx.arc(BARRIER_X, slitY, ringRadius, -Math.PI / 2, Math.PI / 2);
                ctx.strokeStyle = `rgba(255, 221, 68, ${alpha})`;
                ctx.lineWidth = 2;
                ctx.stroke();
              }
            }

            // Glow at leading edge of each slit's wave
            const leadX = BARRIER_X + distFromBarrier;
            const gradient = ctx.createRadialGradient(leadX, slitY, 0, leadX, slitY, 10);
            gradient.addColorStop(0, 'rgba(255, 255, 200, 0.4)');
            gradient.addColorStop(1, 'rgba(255, 221, 68, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(leadX, slitY, 10, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  }

  /**
   * Draw classical particles (tiny balls mode).
   *
   * Classical particles travel in straight lines. Each particle goes through
   * exactly ONE slit (or bounces off the barrier). This is what we'd expect
   * from macroscopic objects like bullets or marbles.
   *
   * The resulting pattern is TWO peaks (one behind each slit) - NO interference.
   * This contrasts with the interference pattern from waves/photons.
   */
  function drawParticles(ctx, particles, slitY1, slitY2, slitWidth) {
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw trail behind particle
      if (p.trail && p.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(p.trail[0].x, p.trail[0].y);
        for (let i = 1; i < p.trail.length; i++) {
          ctx.lineTo(p.trail[i].x, p.trail[i].y);
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  /**
   * Draw the barrier with two slits.
   */
  function drawBarrier(ctx, slitY1, slitY2, slitWidth) {
    ctx.fillStyle = '#4a4a6a';
    // Top section (above top slit)
    ctx.fillRect(BARRIER_X - 5, 0, 10, slitY1 - slitWidth / 2);
    // Middle section (between slits)
    ctx.fillRect(BARRIER_X - 5, slitY1 + slitWidth / 2, 10, slitY2 - slitY1 - slitWidth);
    // Bottom section (below bottom slit)
    ctx.fillRect(BARRIER_X - 5, slitY2 + slitWidth / 2, 10, CANVAS_HEIGHT - slitY2 - slitWidth / 2);
  }

  /**
   * Draw the source.
   * - For particles: A stretched vertical bar (particles emit from random y positions)
   * - For waves: A circular source point
   */
  function drawSource(ctx, mode, singleEmission, slitSeparation, slitWidth) {
    if (mode === 'particles') {
      // Stretched vertical source for particles
      const sourceHeight = slitSeparation + slitWidth * 2;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(SOURCE_X - 8, CENTER_Y - sourceHeight / 2, 16, sourceHeight, 8);
      ctx.fill();
      ctx.strokeStyle = '#aaaaaa';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      // Circular source for waves
      ctx.beginPath();
      ctx.arc(SOURCE_X, CENTER_Y, 15, 0, Math.PI * 2);

      if (mode === 'water') {
        ctx.fillStyle = '#4488ff';
      } else {
        ctx.fillStyle = '#ffdd44';
      }
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    const label = mode === 'light' && singleEmission ? 'Photon Gun' : 'Source';
    ctx.fillText(label, SOURCE_X, CENTER_Y + (mode === 'particles' ? slitSeparation / 2 + slitWidth + 20 : 35));
  }

  /**
   * Draw an "observer" (detector) at a slit.
   *
   * PHYSICS: In quantum mechanics, "observation" or "measurement" means
   * any interaction that extracts which-path information. This could be
   * a photon detector, an electron microscope, or any device that determines
   * which slit the particle went through.
   *
   * The key insight: it's not about human consciousness - it's about
   * physical interaction that gains information about the particle's path.
   */
  function drawObserver(ctx, slitY, slitWidth) {
    const eyeX = BARRIER_X + 40;
    const eyeY = slitY;

    // Detection beam visualization
    ctx.beginPath();
    ctx.moveTo(BARRIER_X + 5, slitY - slitWidth/2);
    ctx.lineTo(eyeX, eyeY);
    ctx.lineTo(BARRIER_X + 5, slitY + slitWidth/2);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 100, 100, 0.3)';
    ctx.fill();

    // Eye icon representing detector/observer
    ctx.beginPath();
    ctx.ellipse(eyeX, eyeY, 15, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#ff6666';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#333333';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#4488ff';
    ctx.fill();
  }

  /**
   * Draw the detection screen with accumulated hit histogram.
   *
   * This shows the pattern that builds up over time:
   * - Interference pattern (multiple bands) for unobserved waves/photons
   * - Two peaks for classical particles or observed photons
   */
  function drawDetectionScreen(ctx, hitCounts, mode) {
    // Screen background
    ctx.fillStyle = '#2a2a4a';
    ctx.fillRect(SCREEN_X - 10, 0, 120, CANVAS_HEIGHT);

    // Draw histogram of hits
    const maxHits = Math.max(...hitCounts, 1);
    const barWidth = 60;

    for (let y = 0; y < CANVAS_HEIGHT; y++) {
      const count = hitCounts[y];
      if (count > 0) {
        const width = (count / maxHits) * barWidth;

        // Color based on mode
        if (mode === 'water') {
          ctx.fillStyle = `rgba(68, 136, 255, ${0.3 + 0.7 * count / maxHits})`;
        } else if (mode === 'light') {
          ctx.fillStyle = `rgba(255, 221, 68, ${0.3 + 0.7 * count / maxHits})`;
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + 0.7 * count / maxHits})`;
        }

        ctx.fillRect(SCREEN_X, y, width, 1);
      }
    }

    // Screen edge line
    ctx.strokeStyle = '#8888aa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(SCREEN_X - 5, 0);
    ctx.lineTo(SCREEN_X - 5, CANVAS_HEIGHT);
    ctx.stroke();
  }

  /**
   * Draw measurement ruler along the screen (positions in pixels).
   */
  function drawMeasurements(ctx, slitY1, slitY2, slitWidth) {
    ctx.strokeStyle = '#666688';
    ctx.fillStyle = '#aaaacc';
    ctx.font = '10px Arial';

    const rulerX = SCREEN_X + 65;
    ctx.beginPath();
    ctx.moveTo(rulerX, 20);
    ctx.lineTo(rulerX, CANVAS_HEIGHT - 20);
    ctx.stroke();

    ctx.textAlign = 'left';
    for (let y = 50; y <= CANVAS_HEIGHT - 50; y += 50) {
      ctx.beginPath();
      ctx.moveTo(rulerX - 4, y);
      ctx.lineTo(rulerX + 4, y);
      ctx.stroke();

      const relY = y - CENTER_Y;
      ctx.fillText(`${relY}`, rulerX + 8, y + 3);
    }

    // Mark center (y=0)
    ctx.strokeStyle = '#88aa88';
    ctx.beginPath();
    ctx.moveTo(rulerX - 6, CENTER_Y);
    ctx.lineTo(rulerX + 6, CENTER_Y);
    ctx.stroke();
    ctx.fillStyle = '#88cc88';
    ctx.fillText('0', rulerX + 8, CENTER_Y + 3);
  }

  // ===========================================================================
  // MAIN ANIMATION LOOP
  // ===========================================================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const animate = () => {
      if (isRunning) {
        timeRef.current += 1;
      }

      // Clear canvas
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw waves (continuous mode - water or light without single photon)
      if ((mode === 'water' || mode === 'light') && !(mode === 'light' && singleEmission)) {
        drawWaves(ctx, timeRef.current, slitY1, slitY2, wavelength, slitWidth, mode);
      }

      // Draw photon wave packets (single photon mode)
      if (mode === 'light' && singleEmission) {
        drawPhotonWavePackets(ctx, particlesRef.current, slitY1, slitY2, wavelength, slitWidth, timeRef.current);
      }

      // Draw classical particles (tiny balls mode)
      if (mode === 'particles') {
        drawParticles(ctx, particlesRef.current, slitY1, slitY2, slitWidth);
      }

      // Draw barrier
      drawBarrier(ctx, slitY1, slitY2, slitWidth);

      // Draw observers if active (only shown in single photon mode)
      if (singleEmission && observerTop) drawObserver(ctx, slitY1, slitWidth);
      if (singleEmission && observerBottom) drawObserver(ctx, slitY2, slitWidth);

      // Draw source
      drawSource(ctx, mode, singleEmission, slitSeparation, slitWidth);

      // Draw detection screen with accumulated hits
      drawDetectionScreen(ctx, hitCountsRef.current, mode);

      // Draw measurements
      if (showMeasurements) {
        drawMeasurements(ctx, slitY1, slitY2, slitWidth);
      }

      // -----------------------------------------------------------------------
      // PHYSICS UPDATE
      // -----------------------------------------------------------------------
      if (isRunning) {

        // UPDATE CLASSICAL PARTICLES (Tiny Balls mode)
        if (mode === 'particles') {
          const updated = [];
          for (const p of particlesRef.current) {
            const newX = p.x + p.vx;
            const newY = p.y + p.vy;

            // Particle reached the screen - record hit
            if (newX >= SCREEN_X - 10) {
              const hitY = Math.round(Math.max(0, Math.min(CANVAS_HEIGHT - 1, newY)));
              hitCountsRef.current[hitY]++;
              continue;
            }

            // Check barrier collision - particles travel straight
            if (p.x < BARRIER_X && newX >= BARRIER_X - 5) {
              const inTopSlit = Math.abs(newY - slitY1) < slitWidth / 2;
              const inBottomSlit = Math.abs(newY - slitY2) < slitWidth / 2;
              if (!inTopSlit && !inBottomSlit) {
                // Hit the barrier - bounce back
                if (!p.bounced) {
                  p.vx = -p.vx * 0.5;
                  p.bounced = true;
                }
              }
            }

            // Remove particles that bounced back past source
            if (p.bounced && newX < SOURCE_X - 20) {
              continue;
            }

            const trail = [...(p.trail || []), { x: p.x, y: p.y }].slice(-15);
            updated.push({ ...p, x: newX, y: newY, trail });
          }
          particlesRef.current = updated;

          // Emit new particles from stretched vertical source
          // They travel horizontally - only those aligned with slits pass through
          if (timeRef.current % 4 === 0) {
            const sourceHeight = slitSeparation + slitWidth * 2;
            const startY = CENTER_Y + (Math.random() - 0.5) * sourceHeight;
            const speed = 3;

            particlesRef.current.push({
              x: SOURCE_X,
              y: startY,
              vx: speed,
              vy: 0,
              trail: [],
              bounced: false
            });
          }
        }

        // UPDATE PHOTONS (Single Photon mode)
        if (mode === 'light' && singleEmission) {
          const updated = [];
          for (const p of particlesRef.current) {
            const newX = p.x + p.vx;

            // Photon reached screen - record hit at predetermined landing position
            if (newX >= SCREEN_X - 10) {
              const hitY = p.landingY;
              hitCountsRef.current[Math.round(Math.max(0, Math.min(CANVAS_HEIGHT - 1, hitY)))]++;
              continue;
            }

            updated.push({ ...p, x: newX });
          }
          particlesRef.current = updated;

          // Auto-emit photons (if not in manual mode)
          if (!manualEmit && timeRef.current % Math.max(3, 51 - emissionRate) === 0) {
            if (hasObserver) {
              // WITH OBSERVER: Photon detected at one slit
              const detectedSlitY = Math.random() < 0.5 ? slitY1 : slitY2;
              const landingY = detectedSlitY + (Math.random() - 0.5) * slitWidth * 0.8;

              particlesRef.current.push({
                x: SOURCE_X,
                y: CENTER_Y,
                vx: 4,
                vy: 0,
                landingY,
                detectedSlitY,
                isPhoton: true,
                isObserved: true,
                birthTime: timeRef.current
              });
            } else {
              // WITHOUT OBSERVER: Landing determined by interference pattern
              const landingY = sampleFromDistribution(slitY1, slitY2, wavelength, slitWidth, false, 'light');

              particlesRef.current.push({
                x: SOURCE_X,
                y: CENTER_Y,
                vx: 4,
                vy: 0,
                landingY,
                detectedSlitY: null,
                isPhoton: true,
                isObserved: false,
                birthTime: timeRef.current
              });
            }
          }
        }

        // CONTINUOUS WAVE DETECTION (water and continuous light)
        // Waves always show interference - no observer effect for classical waves
        if ((mode === 'water' || (mode === 'light' && !singleEmission)) && timeRef.current % 3 === 0) {
          for (let i = 0; i < 5; i++) {
            const y = sampleFromDistribution(slitY1, slitY2, wavelength, slitWidth, false, mode);
            const idx = Math.round(Math.max(0, Math.min(CANVAS_HEIGHT - 1, y)));
            hitCountsRef.current[idx]++;
          }
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, mode, slitY1, slitY2, wavelength, slitWidth, observerTop, observerBottom, hasObserver, singleEmission, manualEmit, emissionRate, showMeasurements]);

  // Mode descriptions for UI
  const modeInfo = {
    water: "Water waves demonstrate classical wave interference. Waves always interfere - there is no observer effect for classical waves.",
    light: "Light behaves as a wave. In single photon mode, each photon travels as a wave through BOTH slits, interfering with itself!",
    particles: "Classical particles (tiny balls) travel through one slit OR the other. No interference - just two peaks."
  };

  const barrierToScreen = SCREEN_X - BARRIER_X;

  // ===========================================================================
  // RENDER UI
  // ===========================================================================
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      padding: '20px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '20px' }}>
        <Link to="/" style={{
          background: '#4a4a6a',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 20px',
          color: '#ffffff',
          cursor: 'pointer',
          textDecoration: 'none',
          fontSize: '14px'
        }}>
          ← Back
        </Link>
        <h1 style={{ margin: 0, fontSize: '28px' }}>Double Slit Experiment</h1>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{
              border: '2px solid #4a4a6a',
              borderRadius: '8px',
              background: '#1a1a2e'
            }}
          />
        </div>

        <div style={{
          background: 'rgba(74, 74, 106, 0.3)',
          borderRadius: '12px',
          padding: '20px',
          width: '280px'
        }}>
          {/* Mode Selection */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '14px', marginBottom: '8px', color: '#aaa' }}>Mode</div>
            <div style={{ display: 'flex', gap: '5px' }}>
              {[
                { id: 'water', label: 'Water Waves' },
                { id: 'light', label: 'Light' },
                { id: 'particles', label: 'Tiny Balls' }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => { setMode(m.id); clearScreen(); }}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    background: mode === m.id ? '#6366f1' : '#4a4a6a',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Playback Controls */}
          <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setIsRunning(!isRunning)}
              style={{
                flex: 1,
                padding: '10px',
                background: isRunning ? '#ef4444' : '#22c55e',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {isRunning ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={handleReset}
              style={{
                flex: 1,
                padding: '10px',
                background: '#4a4a6a',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Reset
            </button>
          </div>

          <button
            onClick={clearScreen}
            style={{
              width: '100%',
              padding: '10px',
              background: '#4a4a6a',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              cursor: 'pointer',
              marginBottom: '20px',
              fontSize: '14px'
            }}
          >
            Clear Screen
          </button>

          {/* Physical Parameter Sliders */}
          <div style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
              <span>Slit Width</span>
              <span>{slitWidth}px</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              value={slitWidth}
              onChange={e => setSlitWidth(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
              <span>Slit Separation</span>
              <span>{slitSeparation}px</span>
            </div>
            <input
              type="range"
              min="30"
              max="150"
              value={slitSeparation}
              onChange={e => setSlitSeparation(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '20px', opacity: mode === 'particles' ? 0.5 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
              <span>Wavelength</span>
              <span>{wavelength}px</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              value={wavelength}
              onChange={e => setWavelength(Number(e.target.value))}
              disabled={mode === 'particles'}
              style={{ width: '100%' }}
            />
          </div>

          {/* Measurements Display */}
          <div style={{
            background: 'rgba(100, 100, 150, 0.2)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '15px'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showMeasurements}
                onChange={e => setShowMeasurements(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: '13px' }}>Show Measurements</span>
            </label>
            <div style={{ fontSize: '12px', color: '#aaa' }}>
              <div>Slit to Screen: <span style={{ color: '#fff' }}>{barrierToScreen}px</span></div>
              <div>Slit Separation: <span style={{ color: '#fff' }}>{slitSeparation}px</span></div>
              <div>Slit Width: <span style={{ color: '#fff' }}>{slitWidth}px</span></div>
            </div>
          </div>

          {/* Single Photon Mode Controls (Light mode only) */}
          {mode === 'light' && (
            <div style={{
              background: 'rgba(255, 221, 68, 0.1)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '15px'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={singleEmission}
                  onChange={e => { setSingleEmission(e.target.checked); clearScreen(); }}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontSize: '14px', color: '#ffdd44' }}>Single Photon Mode</span>
              </label>

              {singleEmission && (
                <>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={manualEmit}
                      onChange={e => setManualEmit(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '13px' }}>Manual Emit Only</span>
                  </label>

                  {manualEmit ? (
                    <button
                      onClick={emitPhoton}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: '#ffdd44',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#1a1a2e',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                    >
                      Emit Photon
                    </button>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
                        <span>Emission Rate</span>
                        <span>{emissionRate}</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="50"
                        value={emissionRate}
                        onChange={e => setEmissionRate(Number(e.target.value))}
                        style={{ width: '100%' }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Observer Effect Controls (Single Photon mode only) */}
          {mode === 'light' && singleEmission && (
            <div style={{
              background: 'rgba(255, 100, 100, 0.1)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '15px'
            }}>
              <div style={{ fontSize: '14px', marginBottom: '10px', color: '#ff8888' }}>
                Observer Effect
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={observerTop}
                  onChange={e => { setObserverTop(e.target.checked); clearScreen(); }}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontSize: '13px' }}>Watch Top Slit</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={observerBottom}
                  onChange={e => { setObserverBottom(e.target.checked); clearScreen(); }}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontSize: '13px' }}>Watch Bottom Slit</span>
              </label>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '8px' }}>
                Observing which slit the photon passes through collapses the wave function.
              </div>
            </div>
          )}

          {/* Info Panel */}
          <div style={{
            background: 'rgba(100, 100, 255, 0.1)',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '12px',
            lineHeight: '1.5'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
              {mode === 'water' ? 'Water Waves' : mode === 'light' ? 'Light' : 'Classical Particles'}
            </div>
            {modeInfo[mode]}
            {hasObserver && (
              <div style={{ marginTop: '10px', color: '#ff8888' }}>
                Observer active: The photon collapses at the slit and travels as a particle - no interference.
              </div>
            )}
            {mode === 'light' && singleEmission && !hasObserver && (
              <div style={{ marginTop: '10px', color: '#ffdd44' }}>
                Each photon goes through BOTH slits as a wave, interferes with itself, then collapses to one spot!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
