/**
 * Color Matcher
 *
 * Calculates Euclidean distance between a pixel RGB value and the 7 core
 * playlist colors. Handles transitional/interpolated colors by randomly
 * picking from adjacent playlists when distances are close.
 */

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
 * Computes Euclidean distance between two RGB colors.
 */
function colorDistance(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Finds the closest color name for a given RGB pixel value.
 * If the pixel is in a transitional zone (top 2 colors within 20% of each other),
 * randomly picks from either.
 *
 * @param {number} r - Red channel (0-255)
 * @param {number} g - Green channel (0-255)
 * @param {number} b - Blue channel (0-255)
 * @returns {string} The matched color name
 */
export function findClosestColor(r, g, b) {
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
  const songs = playlists[colorName];
  if (!songs || songs.length === 0) return null;
  const index = Math.floor(Math.random() * songs.length);
  return songs[index];
}
