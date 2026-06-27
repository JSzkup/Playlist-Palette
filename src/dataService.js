/**
 * Data Service
 *
 * Parses raw CSV text into structured playlist data using PapaParse.
 * Handles genre splitting and preserves all audio feature columns as numbers.
 */

import Papa from "papaparse";

/**
 * Parses the raw CSV text for each color playlist into structured song objects.
 *
 * @param {Record<string, string>} rawFiles - Map of color name → raw CSV text
 * @returns {Record<string, object[]>} Parsed data keyed by color name
 */
export function parsePlaylistData(rawFiles) {
  const parsed = {};

  for (const [colorName, csvText] of Object.entries(rawFiles)) {
    const result = Papa.parse(csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
    });

    // Split the Genres field from a comma-separated string into an array
    const songs = result.data.map((row) => ({
      ...row,
      Genres: parseGenres(row.Genres),
    }));

    parsed[colorName] = songs;
  }

  return parsed;
}

/**
 * Splits a genres string into an array. Handles empty strings and null values.
 *
 * @param {string|null|undefined} genresValue
 * @returns {string[]}
 */
function parseGenres(genresValue) {
  if (!genresValue || typeof genresValue !== "string") {
    return [];
  }
  return genresValue
    .split(",")
    .map((g) => g.trim())
    .filter((g) => g.length > 0);
}

/**
 * Returns the array of songs for a given color.
 *
 * @param {Record<string, object[]>} parsedData - The structured playlist data
 * @param {string} colorName - The color to look up
 * @returns {object[]} Array of song objects, or empty array if color not found
 */
export function getAllSongsForColor(parsedData, colorName) {
  return parsedData[colorName] || [];
}
