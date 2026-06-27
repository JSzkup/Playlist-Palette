/**
 * Tie-Dye Canvas Generator
 *
 * Generates a procedural pixelated tie-dye pattern using value noise
 * with the 7 core playlist colors. Supports "Custom Rainbow Mode"
 * where pixel counts match song counts per color.
 */

// Core playlist colors with RGB values
const CORE_COLORS = [
  { name: "Red", rgb: [255, 0, 0] },
  { name: "Orange", rgb: [255, 165, 0] },
  { name: "Yellow", rgb: [255, 255, 0] },
  { name: "Green", rgb: [0, 128, 0] },
  { name: "Blue", rgb: [0, 0, 255] },
  { name: "Purple", rgb: [128, 0, 128] },
  { name: "Pink", rgb: [255, 192, 203] },
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
 * Generates smooth value noise for tie-dye swirls.
 */
function generateNoiseGrid(cols, rows, scale, rng) {
  // Create a grid of random values at lower resolution
  const noiseW = Math.ceil(cols / scale) + 2;
  const noiseH = Math.ceil(rows / scale) + 2;
  const grid = [];
  for (let i = 0; i < noiseH; i++) {
    grid[i] = [];
    for (let j = 0; j < noiseW; j++) {
      grid[i][j] = rng();
    }
  }
  return grid;
}

/**
 * Bicubic-ish interpolation for smoother noise.
 */
function smoothNoise(grid, x, y, scale) {
  const fx = x / scale;
  const fy = y / scale;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const dx = fx - ix;
  const dy = fy - iy;

  // Smoothstep
  const sx = dx * dx * (3 - 2 * dx);
  const sy = dy * dy * (3 - 2 * dy);

  const row = grid[iy] || grid[0];
  const rowNext = grid[iy + 1] || grid[0];

  const v00 = row[ix] || 0;
  const v10 = row[ix + 1] || 0;
  const v01 = rowNext[ix] || 0;
  const v11 = rowNext[ix + 1] || 0;

  const top = v00 + sx * (v10 - v00);
  const bottom = v01 + sx * (v11 - v01);
  return top + sy * (bottom - top);
}

/**
 * Multi-octave noise for organic patterns.
 */
function fractalNoise(grids, x, y, scales) {
  let value = 0;
  let amplitude = 1;
  let totalAmp = 0;
  for (let i = 0; i < grids.length; i++) {
    value += smoothNoise(grids[i], x, y, scales[i]) * amplitude;
    totalAmp += amplitude;
    amplitude *= 0.5;
  }
  return value / totalAmp;
}

/**
 * Generates the tie-dye pattern on the canvas.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {Object} options
 * @param {number} [options.pixelSize=8] - Size of each pixel block
 * @param {number} [options.seed] - Random seed (auto-generated if omitted)
 * @param {boolean} [options.rainbowMode=false] - Custom rainbow mode
 * @param {Record<string, object[]>} [options.playlists] - Playlist data (needed for rainbow mode)
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
    generateTieDyePattern(ctx, cols, rows, pixelSize, seed);
  }
}

/**
 * Standard tie-dye pattern using multi-octave noise with swirl distortion.
 */
function generateTieDyePattern(ctx, cols, rows, pixelSize, seed) {
  const rng = createRNG(seed);

  // Generate noise layers at different scales for organic look
  const scales = [12, 6, 3];
  const grids = scales.map((s) => generateNoiseGrid(cols, rows, s, rng));

  // Create swirl centers for tie-dye effect
  const numSwirls = 3 + Math.floor(rng() * 4);
  const swirls = [];
  for (let i = 0; i < numSwirls; i++) {
    swirls.push({
      x: rng() * cols,
      y: rng() * rows,
      strength: 0.5 + rng() * 2,
      radius: 10 + rng() * 30,
    });
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Apply swirl distortion
      let dx = col;
      let dy = row;
      for (const swirl of swirls) {
        const sdx = col - swirl.x;
        const sdy = row - swirl.y;
        const dist = Math.sqrt(sdx * sdx + sdy * sdy);
        if (dist < swirl.radius) {
          const angle = (swirl.strength * (swirl.radius - dist)) / swirl.radius;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          dx += (sdx * cos - sdy * sin - sdx) * 0.3;
          dy += (sdx * sin + sdy * cos - sdy) * 0.3;
        }
      }

      // Get noise value and map to color
      const noise = fractalNoise(grids, Math.abs(dx), Math.abs(dy), scales);
      const colorIndex =
        Math.floor(noise * CORE_COLORS.length) % CORE_COLORS.length;
      const color = CORE_COLORS[Math.abs(colorIndex)];

      // Add slight variation for organic feel
      const variation = (rng() - 0.5) * 30;
      const r = Math.max(0, Math.min(255, color.rgb[0] + variation));
      const g = Math.max(0, Math.min(255, color.rgb[1] + variation));
      const b = Math.max(0, Math.min(255, color.rgb[2] + variation));

      ctx.fillStyle = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
      ctx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
    }
  }
}

/**
 * Custom Rainbow Mode: each pixel maps 1:1 to a song of that color.
 * Number of colored pixels equals number of songs in each playlist.
 */
function generateRainbowMode(ctx, cols, rows, pixelSize, playlists, seed) {
  const rng = createRNG(seed);
  const totalPixels = cols * rows;

  // Build a flat array of color assignments based on song counts
  const colorAssignments = [];
  for (const colorDef of CORE_COLORS) {
    const songs = playlists[colorDef.name] || [];
    for (let i = 0; i < songs.length; i++) {
      colorAssignments.push(colorDef);
    }
  }

  // If we have fewer songs than pixels, fill remainder with dark background
  while (colorAssignments.length < totalPixels) {
    colorAssignments.push(null);
  }

  // Shuffle for visual distribution (Fisher-Yates)
  for (let i = colorAssignments.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [colorAssignments[i], colorAssignments[j]] = [
      colorAssignments[j],
      colorAssignments[i],
    ];
  }

  // Draw pixels
  let idx = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const colorDef =
        idx < colorAssignments.length ? colorAssignments[idx] : null;
      if (colorDef) {
        const variation = (rng() - 0.5) * 20;
        const r = Math.max(0, Math.min(255, colorDef.rgb[0] + variation));
        const g = Math.max(0, Math.min(255, colorDef.rgb[1] + variation));
        const b = Math.max(0, Math.min(255, colorDef.rgb[2] + variation));
        ctx.fillStyle = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
      } else {
        ctx.fillStyle = "#1a1a2e";
      }
      ctx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
      idx++;
    }
  }
}
