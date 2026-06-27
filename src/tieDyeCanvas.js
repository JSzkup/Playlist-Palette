/**
 * Tie-Dye Canvas Generator
 *
 * Generates a procedural pixelated tie-dye pattern that mimics a real
 * hand-twisted single-spiral tie-dye shirt. Features:
 * - One off-center spiral origin
 * - Rainbow color bands radiating outward with spiral twist
 * - White/cream "cracks" along band edges (where dye didn't reach the folds)
 * - Imperfect, wobbly band edges with organic bleeding
 *
 * Each "pixel" is a color block (default 8×8 actual pixels).
 */

// Core playlist colors — saturated dye-like tones
const CORE_COLORS = [
  { name: "Red", rgb: [220, 25, 25] },
  { name: "Orange", rgb: [240, 130, 10] },
  { name: "Yellow", rgb: [245, 220, 20] },
  { name: "Green", rgb: [15, 150, 50] },
  { name: "Blue", rgb: [25, 50, 230] },
  { name: "Purple", rgb: [130, 20, 170] },
  { name: "Pink", rgb: [240, 80, 140] },
];

// The undyed fabric color (white/cream that shows in cracks)
const CRACK_COLOR = [250, 245, 235];

/**
 * Seeded PRNG (mulberry32).
 */
function createRNG(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Main export — generates the tie-dye pattern on the canvas.
 */
export function generateTieDye(canvas, options = {}) {
  const {
    pixelSize = 8,
    seed = Math.floor(Math.random() * 999999),
    rainbowMode = false,
    playlists = null,
  } = options;

  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const cols = Math.ceil(width / pixelSize);
  const rows = Math.ceil(height / pixelSize);

  if (rainbowMode && playlists) {
    generateRainbowMode(ctx, cols, rows, pixelSize, playlists, seed);
  } else {
    generateCrackedSpiral(ctx, cols, rows, pixelSize, seed);
  }
}

/**
 * Cracked spiral tie-dye — single spiral center with imperfect bands
 * and white cracks along fold lines.
 */
function generateCrackedSpiral(ctx, cols, rows, pixelSize, seed) {
  const rng = createRNG(seed);

  // Spiral center — slightly off-center for organic feel
  const cx = (0.35 + rng() * 0.3) * cols;
  const cy = (0.35 + rng() * 0.3) * rows;

  // How many color-widths fit in one full revolution
  const spiralTightness = 1.8 + rng() * 1.2; // controls band width
  const bandWidth = cols / (CORE_COLORS.length * spiralTightness);

  // Direction of spiral (clockwise or counter-clockwise)
  const spiralDir = rng() > 0.5 ? 1 : -1;

  // Generate a wobble noise field for imperfect band edges
  const wobbleGrid = makeNoiseGrid(cols, rows, 5 + Math.floor(rng() * 4), rng);

  // A second noise field for crack placement
  const crackGrid = makeNoiseGrid(cols, rows, 3 + Math.floor(rng() * 3), rng);

  // A third noise for radial distortion (makes bands uneven widths)
  const radialGrid = makeNoiseGrid(cols, rows, 7 + Math.floor(rng() * 5), rng);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const dx = col - cx;
      const dy = row - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx); // -PI to PI

      // Radial distortion — makes bands wobbly/uneven
      const radialWobble =
        sampleNoise(radialGrid, col, row, 7) * bandWidth * 0.6;

      // Spiral formula: combine distance and angle
      // Normalize angle to 0-1 range
      const normAngle = (angle + Math.PI) / (2 * Math.PI);

      // The spiral value determines which color band we're in
      const spiralVal =
        dist +
        radialWobble +
        normAngle * spiralDir * bandWidth * CORE_COLORS.length;

      // Edge wobble — distorts band boundaries
      const edgeWobble =
        sampleNoise(wobbleGrid, col, row, 5) * bandWidth * 0.35;
      const finalVal = spiralVal + edgeWobble;

      // Map to color band
      const bandFloat = finalVal / bandWidth;
      const bandIndex = Math.floor(bandFloat);
      const bandFraction = bandFloat - bandIndex; // 0-1 position within band

      // Color for this band
      const colorIdx =
        ((bandIndex % CORE_COLORS.length) + CORE_COLORS.length) %
        CORE_COLORS.length;
      const color = CORE_COLORS[colorIdx];

      // Crack detection: cracks are RADIAL — running outward from center,
      // cutting across the color bands (like fold lines in real tie-dye).
      const crackNoise = sampleNoise(crackGrid, col, row, 3);
      const isRadialCrack = isOnRadialCrack(
        col,
        row,
        cx,
        cy,
        dist,
        angle,
        crackNoise,
        seed,
      );

      if (isRadialCrack) {
        // White/cream crack
        const crackBrightness = 0.92 + rng() * 0.08;
        const r = Math.round(CRACK_COLOR[0] * crackBrightness);
        const g = Math.round(CRACK_COLOR[1] * crackBrightness);
        const b = Math.round(CRACK_COLOR[2] * crackBrightness);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      } else {
        // Dyed color with slight saturation variation
        const satVar = 0.82 + rng() * 0.25;
        // Slightly desaturate toward band edges for bleed effect
        const edgeProximity = Math.min(bandFraction, 1 - bandFraction);
        const edgeFade = 0.85 + edgeProximity * 0.3;
        const intensity = satVar * edgeFade;

        const r = Math.max(
          0,
          Math.min(255, Math.round(color.rgb[0] * intensity)),
        );
        const g = Math.max(
          0,
          Math.min(255, Math.round(color.rgb[1] * intensity)),
        );
        const b = Math.max(
          0,
          Math.min(255, Math.round(color.rgb[2] * intensity)),
        );
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      }

      ctx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
    }
  }
}

/**
 * Determines if a block falls on a radial crack — a line running outward
 * from the spiral center. These represent fold creases in the fabric
 * where dye couldn't reach. They cut ACROSS the color bands.
 *
 * Creates 6-10 radial crack lines at fixed angles with varying width,
 * intermittent gaps, and slight curvature.
 */
function isOnRadialCrack(col, row, cx, cy, dist, angle, noiseVal, seed) {
  if (dist < 3) return false; // No cracks right at center

  const crackRng = createRNG(seed + 555);
  const numCracks = 6 + Math.floor(crackRng() * 5); // 6-10 radial cracks

  for (let i = 0; i < numCracks; i++) {
    // Fixed angle for this crack line
    const crackAngle = -Math.PI + crackRng() * 2 * Math.PI;

    // Slight curve to the crack (not perfectly straight)
    const curvature = (crackRng() - 0.5) * 0.015;
    const curvedAngle = crackAngle + curvature * dist;

    // Angular distance from this block to the crack line
    let angleDiff = Math.abs(angle - curvedAngle);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

    // Crack width — varies along its length and gets slightly wider farther out
    const baseWidth = 0.02 + crackRng() * 0.02;
    const widthAtDist = baseWidth * (1 + dist * 0.005);

    // Noise-based modulation to make crack width uneven
    const widthMod = widthAtDist * (0.6 + (noiseVal + 1) * 0.4);

    if (angleDiff < widthMod) {
      // Intermittent gaps — crack doesn't run continuously
      // Use a hash of distance to create on/off segments
      const segmentPhase = Math.sin(dist * 0.8 + i * 17.3) * 0.5 + 0.5;
      const gapThreshold = 0.25 + crackRng() * 0.2; // 25-45% of length is gap

      if (segmentPhase > gapThreshold) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Create a low-resolution noise grid for spatial variation.
 */
function makeNoiseGrid(cols, rows, scale, rng) {
  const w = Math.ceil(cols / scale) + 2;
  const h = Math.ceil(rows / scale) + 2;
  const grid = [];
  for (let r = 0; r < h; r++) {
    grid[r] = [];
    for (let c = 0; c < w; c++) {
      grid[r][c] = rng() * 2 - 1; // -1 to 1
    }
  }
  return { data: grid, scale };
}

/**
 * Sample noise with bilinear interpolation.
 */
function sampleNoise(noiseObj, col, row, _unused) {
  const scale = noiseObj.scale;
  const grid = noiseObj.data;
  const fx = col / scale;
  const fy = row / scale;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const dx = fx - ix;
  const dy = fy - iy;

  // Smoothstep interpolation
  const sx = dx * dx * (3 - 2 * dx);
  const sy = dy * dy * (3 - 2 * dy);

  const r0 = grid[iy] || grid[0];
  const r1 = grid[iy + 1] || grid[0];

  const v00 = r0[ix] !== undefined ? r0[ix] : 0;
  const v10 = r0[ix + 1] !== undefined ? r0[ix + 1] : 0;
  const v01 = r1[ix] !== undefined ? r1[ix] : 0;
  const v11 = r1[ix + 1] !== undefined ? r1[ix + 1] : 0;

  const top = v00 + sx * (v10 - v00);
  const bottom = v01 + sx * (v11 - v01);
  return top + sy * (bottom - top);
}

/**
 * Custom Rainbow Mode: blocks distributed in spiral order from center,
 * with song count per color determining how many blocks of that color exist.
 */
function generateRainbowMode(ctx, cols, rows, pixelSize, playlists, seed) {
  const rng = createRNG(seed);
  const totalBlocks = cols * rows;

  // Build color assignments based on song counts
  const colorAssignments = [];
  for (const colorDef of CORE_COLORS) {
    const songs = playlists[colorDef.name] || [];
    for (let i = 0; i < songs.length; i++) {
      colorAssignments.push(colorDef);
    }
  }

  // Fill remainder with crack/background
  while (colorAssignments.length < totalBlocks) {
    colorAssignments.push(null);
  }

  // Spiral order from center
  const centerCol = Math.floor(cols / 2);
  const centerRow = Math.floor(rows / 2);
  const positions = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const dx = c - centerCol;
      const dy = r - centerRow;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      positions.push({ col: c, row: r, dist, angle });
    }
  }
  positions.sort((a, b) => a.dist - b.dist || a.angle - b.angle);

  // Draw
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    const colorDef = i < colorAssignments.length ? colorAssignments[i] : null;

    if (colorDef) {
      const brightness = 0.82 + rng() * 0.25;
      const r = Math.max(
        0,
        Math.min(255, Math.round(colorDef.rgb[0] * brightness)),
      );
      const g = Math.max(
        0,
        Math.min(255, Math.round(colorDef.rgb[1] * brightness)),
      );
      const b = Math.max(
        0,
        Math.min(255, Math.round(colorDef.rgb[2] * brightness)),
      );
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    } else {
      ctx.fillStyle = `rgb(${CRACK_COLOR[0]}, ${CRACK_COLOR[1]}, ${CRACK_COLOR[2]})`;
    }
    ctx.fillRect(
      pos.col * pixelSize,
      pos.row * pixelSize,
      pixelSize,
      pixelSize,
    );
  }
}
