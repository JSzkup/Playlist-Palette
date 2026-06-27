/**
 * Color Matcher
 *
 * Calculates Euclidean distance between a pixel RGB value and the 7 core
 * playlist colors. Handles transitional/interpolated colors by randomly
 * picking from adjacent playlists when distances are close.
 *
 * White/near-white pixels (cracks) are treated as dead space — no match.
 */

// These RGB values must align with what tieDyeCanvas.js actually draws
const CORE_COLORS = [
  { name: "Red", rgb: [220, 25, 25] },
  { name: "Orange", rgb: [240, 130, 10] },
  { name: "Yellow", rgb: [245, 220, 20] },
  { name: "Green", rgb: [15, 150, 50] },
  { name: "Blue", rgb: [25, 50, 230] },
  { name: "Purple", rgb: [130, 20, 170] },
  { name: "Pink", rgb: [240, 80, 140] },
];

/**
 * Computes Euclidean distance between two RGB colors.
 */
function colorDistance(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Checks if a pixel is white/near-white (crack/dead space).
 * Returns true if the pixel is very light and low-saturation.
 */
function isDeadSpace(r, g, b) {
  // Check if all channels are high (near white)
  const minChannel = Math.min(r, g, b);
  const maxChannel = Math.max(r, g, b);
  // Near-white: all channels above 200 and low saturation (max-min < 50)
  return minChannel > 200 && maxChannel - minChannel < 50;
}

/**
 * Finds the closest color name for a given RGB pixel value.
 * Returns null for white/near-white pixels (dead space / cracks).
 * If the pixel is in a transitional zone (top 2 colors within 20% of each other),
 * randomly picks from either.
 *
 * @param {number} r - Red channel (0-255)
 * @param {number} g - Green channel (0-255)
 * @param {number} b - Blue channel (0-255)
 * @returns {string|null} The matched color name, or null for dead space
 */
export function findClosestColor(r, g, b) {
  // White/cream pixels are dead space (cracks in the tie-dye)
  if (isDeadSpace(r, g, b)) {
    return null;
  }

  const distances = CORE_COLORS.map((color) => ({
    name: color.name,
    distance: colorDistance(r, g, b, color.rgb[0], color.rgb[1], color.rgb[2]),
  }));

  // Sort by distance ascending
  distances.sort((a, b) => a.distance - b.distance);

  const closest = distances[0];
  const second = distances[1];

  // Check if we're in a transitional zone (within 20% of each other)
  if (closest.distance > 0) {
    const ratio = (second.distance - closest.distance) / closest.distance;
    if (ratio < 0.2) {
      // Randomly pick between the two closest colors
      return Math.random() < 0.5 ? closest.name : second.name;
    }
  }

  return closest.name;
}

/**
 * Gets a random song from the matched color playlist.
 *
 * @param {Record<string, object[]>} playlists - Parsed playlist data
 * @param {string} colorName - The matched color
 * @returns {object|null} A random song object, or null if no songs available
 */
export function getRandomSongForColor(playlists, colorName) {
  if (!colorName) return null;
  const songs = playlists[colorName];
  if (!songs || songs.length === 0) return null;
  const index = Math.floor(Math.random() * songs.length);
  return songs[index];
}
