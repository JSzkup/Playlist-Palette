/**
 * Tie-Dye Canvas Generator
 *
 * Generates a procedural pixelated tie-dye pattern that mimics real tie-dye:
 * bold concentric spiral color bands radiating from fold points.
 * Each "pixel" is a color block (e.g., 8×8 actual pixels).
 *
 * Supports "Custom Rainbow Mode" where block counts match song counts per color.
 */

// Core playlist colors with RGB values
const CORE_COLORS = [
  { name: "Red", rgb: [255, 30, 30] },
  { name: "Orange", rgb: [255, 140, 20] },
  { name: "Yellow", rgb: [255, 230, 30] },
  { name: "Green", rgb: [20, 160, 50] },
  { name: "Blue", rgb: [30, 60, 255] },
  { name: "Purple", rgb: [140, 30, 180] },
  { name: "Pink", rgb: [255, 100, 160] },
];

/**
 * Simple seeded pseudo-random number generator (mulberry32).
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
 * Generates the tie-dye pattern on the canvas.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {Object} options
 * @param {number} [options.pixelSize=8] - Size of each color block in actual pixels
 * @param {number} [options.seed] - Random seed
 * @param {boolean} [options.rainbowMode=false] - Custom rainbow mode
 * @param {Record<string, object[]>} [options.playlists] - Playlist data (for rainbow mode)
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
    generateSpiralTieDye(ctx, cols, rows, pixelSize, seed);
  }
}

/**
 * Spiral tie-dye: creates 2-4 fold centers, each radiating concentric
 * color bands that spiral outward. Colors transition in rainbow order
 * as you move away from the center, with slight wobble for organic feel.
 */
function generateSpiralTieDye(ctx, cols, rows, pixelSize, seed) {
  const rng = createRNG(seed);

  // Create fold/spiral centers (like where you'd pinch the fabric)
  const numCenters = 2 + Math.floor(rng() * 3); // 2-4 centers
  const centers = [];
  for (let i = 0; i < numCenters; i++) {
    centers.push({
      x: 0.15 + rng() * 0.7, // normalized 0-1, keep away from edges
      y: 0.15 + rng() * 0.7,
      // Each center starts at a different color offset for variety
      colorOffset: Math.floor(rng() * CORE_COLORS.length),
      // Spiral tightness — how fast bands repeat
      bandWidth: 3.5 + rng() * 3, // blocks per color band
      // Spiral rotation speed
      spiralTwist: 0.8 + rng() * 1.5,
      // Influence radius (normalized)
      influence: 0.4 + rng() * 0.4,
    });
  }

  // Pre-compute a wobble field for organic imperfection
  const wobbleScale = 8 + rng() * 6;
  const wobbleGrid = [];
  const wCols = Math.ceil(cols / wobbleScale) + 2;
  const wRows = Math.ceil(rows / wobbleScale) + 2;
  for (let r = 0; r < wRows; r++) {
    wobbleGrid[r] = [];
    for (let c = 0; c < wCols; c++) {
      wobbleGrid[r][c] = (rng() - 0.5) * 2; // -1 to 1
    }
  }

  // Assign each block a color
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Normalized position
      const nx = col / cols;
      const ny = row / rows;

      // Get wobble for this position (smooth interpolation)
      const wobble = sampleWobble(wobbleGrid, col, row, wobbleScale);

      // Find which center has the most influence on this block
      let bestColor = null;
      let bestWeight = -1;

      for (const center of centers) {
        const dx = nx - center.x;
        const dy = ny - center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Weight falls off with distance from center
        const normDist = dist / center.influence;
        if (normDist > 1.5) continue; // Too far from this center

        const weight = 1 / (1 + normDist * normDist);

        if (weight > bestWeight) {
          bestWeight = weight;

          // Angle from center (for spiral)
          const angle = Math.atan2(dy, dx);

          // Spiral: distance + angle creates the spiral arm pattern
          // The key to tie-dye is that color = f(distance + angle*twist)
          const spiralDist =
            dist * cols +
            (angle / (2 * Math.PI)) * center.spiralTwist * center.bandWidth;

          // Add wobble for organic imperfection
          const wobbledDist = spiralDist + wobble * 1.2;

          // Map distance to color band
          const bandIndex = Math.floor(wobbledDist / center.bandWidth);
          const colorIdx =
            (((bandIndex + center.colorOffset) % CORE_COLORS.length) +
              CORE_COLORS.length) %
            CORE_COLORS.length;

          bestColor = CORE_COLORS[colorIdx];
        }
      }

      // Fallback for blocks too far from any center
      if (!bestColor) {
        // Use a gentle gradient based on position
        const fallbackIdx = Math.floor(
          ((nx + ny) * 0.5 * CORE_COLORS.length + wobble * 0.5) %
            CORE_COLORS.length,
        );
        bestColor =
          CORE_COLORS[(fallbackIdx + CORE_COLORS.length) % CORE_COLORS.length];
      }

      // Slight per-block brightness variation for texture (subtle)
      const brightness = 0.9 + rng() * 0.2;
      const r = Math.max(
        0,
        Math.min(255, Math.round(bestColor.rgb[0] * brightness)),
      );
      const g = Math.max(
        0,
        Math.min(255, Math.round(bestColor.rgb[1] * brightness)),
      );
      const b = Math.max(
        0,
        Math.min(255, Math.round(bestColor.rgb[2] * brightness)),
      );

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
    }
  }
}

/**
 * Sample the wobble field with bilinear interpolation for smooth distortion.
 */
function sampleWobble(grid, col, row, scale) {
  const fx = col / scale;
  const fy = row / scale;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const dx = fx - ix;
  const dy = fy - iy;

  const r0 = grid[iy] || grid[0];
  const r1 = grid[iy + 1] || grid[0];

  const v00 = r0[ix] || 0;
  const v10 = r0[ix + 1] || 0;
  const v01 = r1[ix] || 0;
  const v11 = r1[ix + 1] || 0;

  const top = v00 + dx * (v10 - v00);
  const bottom = v01 + dx * (v11 - v01);
  return top + dy * (bottom - top);
}

/**
 * Custom Rainbow Mode: each color block maps 1:1 to a song.
 * Arranged in a spiral pattern from center outward for visual cohesion,
 * with colors grouped in rainbow-order arcs.
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

  // Fill remainder with dark background
  while (colorAssignments.length < totalBlocks) {
    colorAssignments.push(null);
  }

  // Create a spiral traversal order from center outward
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
  // Sort by distance then angle for spiral effect
  positions.sort((a, b) => a.dist - b.dist || a.angle - b.angle);

  // Assign colors to spiral positions (keeps same-color blocks clustered)
  // Add a small shuffle within each color group for texture
  let assignIdx = 0;
  for (const colorDef of CORE_COLORS) {
    const count = (playlists[colorDef.name] || []).length;
    const group = colorAssignments.slice(assignIdx, assignIdx + count);
    // Light shuffle within group (swap ~20% of positions)
    for (let i = group.length - 1; i > 0; i--) {
      if (rng() < 0.2) {
        const j = Math.floor(rng() * (i + 1));
        [group[i], group[j]] = [group[j], group[i]];
      }
    }
    assignIdx += count;
  }

  // Draw blocks in spiral order
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    const colorDef = i < colorAssignments.length ? colorAssignments[i] : null;

    if (colorDef) {
      const brightness = 0.85 + rng() * 0.3;
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
      ctx.fillStyle = "#1a1a2e";
    }
    ctx.fillRect(
      pos.col * pixelSize,
      pos.row * pixelSize,
      pixelSize,
      pixelSize,
    );
  }
}
