/**
 * Blend Engine
 *
 * Generates blended playlists by finding songs with shared genres
 * across multiple selected color playlists.
 */

/**
 * Generates a blended playlist from the selected colors.
 * Finds songs that share genres across multiple selected colors.
 * Falls back to a random mix if no genre overlap exists.
 *
 * @param {Record<string, object[]>} parsedData - Playlist data keyed by color
 * @param {string[]} selectedColors - Array of selected color names
 * @returns {object[]} Deduplicated array of song objects
 */
export function generateBlendedPlaylist(parsedData, selectedColors) {
  if (selectedColors.length < 2) return [];

  // Collect all songs from selected colors
  const allSongs = [];
  for (const color of selectedColors) {
    const songs = parsedData[color] || [];
    for (const song of songs) {
      allSongs.push({ ...song, _color: color });
    }
  }

  // Build a genre map: genre → songs from different colors
  const genreMap = new Map();
  for (const song of allSongs) {
    const genres = song.Genres || [];
    for (const genre of genres) {
      const key = genre.toLowerCase().trim();
      if (!key) continue;
      if (!genreMap.has(key)) {
        genreMap.set(key, []);
      }
      genreMap.set(key, [...genreMap.get(key), song]);
    }
  }

  // Find genres that span multiple selected colors
  const blendedSongs = new Map(); // Track URI → song (for dedup)

  for (const [genre, songs] of genreMap) {
    const colorsInGenre = new Set(songs.map((s) => s._color));
    // Only include if the genre spans at least 2 of the selected colors
    if (colorsInGenre.size >= 2) {
      for (const song of songs) {
        const uri = song["Track URI"] || song["Track Name"];
        if (!blendedSongs.has(uri)) {
          blendedSongs.set(uri, song);
        }
      }
    }
  }

  // If we found genre overlaps, return those songs
  if (blendedSongs.size > 0) {
    return Array.from(blendedSongs.values());
  }

  // Fallback: random mix from all selected colors (up to 30 songs)
  const shuffled = allSongs.sort(() => Math.random() - 0.5);
  const fallback = new Map();
  for (const song of shuffled) {
    const uri = song["Track URI"] || song["Track Name"];
    if (!fallback.has(uri)) {
      fallback.set(uri, song);
    }
    if (fallback.size >= 30) break;
  }

  return Array.from(fallback.values());
}

/**
 * Renders the blended playlist into the sidebar element.
 *
 * @param {HTMLElement} sidebar - The sidebar DOM element
 * @param {object[]} songs - The blended playlist songs
 * @param {string[]} selectedColors - Which colors were blended
 */
export function renderBlendedPlaylist(sidebar, songs, selectedColors) {
  const listEl = sidebar.querySelector(".blend-list");
  const headerEl = sidebar.querySelector(".blend-header-text");

  if (headerEl) {
    headerEl.textContent = `Blended: ${selectedColors.join(" + ")} (${songs.length} tracks)`;
  }

  if (!listEl) return;
  listEl.innerHTML = "";

  if (songs.length === 0) {
    listEl.innerHTML = '<li class="blend-empty">No matching songs found</li>';
    return;
  }

  for (const song of songs) {
    const li = document.createElement("li");
    li.className = "blend-track";

    const trackName = song["Track Name"] || "Unknown";
    const artist = song["Artist Name(s)"] || "Unknown";
    const uri = song["Track URI"] || "";

    let trackHtml = `<span class="blend-track-name">${escapeHtml(trackName)}</span>`;
    if (uri && uri.startsWith("spotify:track:")) {
      const spotifyUrl = `https://open.spotify.com/track/${uri.replace("spotify:track:", "")}`;
      trackHtml = `<a href="${spotifyUrl}" target="_blank" rel="noopener" class="blend-track-link">${escapeHtml(trackName)}</a>`;
    }

    li.innerHTML = `
      <div class="blend-track-info">
        ${trackHtml}
        <span class="blend-track-artist">${escapeHtml(artist)}</span>
      </div>
      <span class="blend-track-color">${song._color || ""}</span>
    `;
    listEl.appendChild(li);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
