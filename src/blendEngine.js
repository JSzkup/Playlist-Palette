/**
 * Blend Engine
 *
 * Generates blended playlists by finding songs that share genres or
 * artist names across the selected color playlists. Only songs with
 * a genuine connection (shared genre or same artist) across at least
 * 2 selected colors are included — no random fallback.
 */

/**
 * Generates a blended playlist from the selected colors.
 * Includes only songs that share a genre or artist name with songs
 * from at least one OTHER selected color.
 *
 * @param {Record<string, object[]>} parsedData - Playlist data keyed by color
 * @param {string[]} selectedColors - Array of selected color names
 * @returns {object[]} Deduplicated array of song objects
 */
export function generateBlendedPlaylist(parsedData, selectedColors) {
  if (selectedColors.length < 2) return [];

  // Collect all songs from selected colors, tagged with their source color
  const songsByColor = new Map(); // color → songs[]
  for (const color of selectedColors) {
    const songs = (parsedData[color] || []).map((s) => ({
      ...s,
      _color: color,
    }));
    songsByColor.set(color, songs);
  }

  const allSongs = [];
  for (const songs of songsByColor.values()) {
    allSongs.push(...songs);
  }

  // Build genre → set of colors that have that genre
  const genreToColors = new Map();
  // Build genre → songs
  const genreToSongs = new Map();
  for (const song of allSongs) {
    const genres = song.Genres || [];
    for (const genre of genres) {
      const key = genre.toLowerCase().trim();
      if (!key) continue;

      if (!genreToColors.has(key)) {
        genreToColors.set(key, new Set());
        genreToSongs.set(key, []);
      }
      genreToColors.get(key).add(song._color);
      genreToSongs.get(key).push(song);
    }
  }

  // Build artist → set of colors that have that artist
  const artistToColors = new Map();
  const artistToSongs = new Map();
  for (const song of allSongs) {
    const artist = (song["Artist Name(s)"] || "").toLowerCase().trim();
    if (!artist) continue;

    if (!artistToColors.has(artist)) {
      artistToColors.set(artist, new Set());
      artistToSongs.set(artist, []);
    }
    artistToColors.get(artist).add(song._color);
    artistToSongs.get(artist).push(song);
  }

  // Collect songs that qualify: shared genre spanning 2+ colors
  const blendedSongs = new Map(); // Track URI → song (dedup)

  // Genre-based matches
  for (const [genre, colors] of genreToColors) {
    if (colors.size >= 2) {
      for (const song of genreToSongs.get(genre)) {
        const uri =
          song["Track URI"] ||
          `${song["Track Name"]}_${song["Artist Name(s)"]}`;
        if (!blendedSongs.has(uri)) {
          blendedSongs.set(uri, song);
        }
      }
    }
  }

  // Artist-based matches (same artist appearing in 2+ selected colors)
  for (const [artist, colors] of artistToColors) {
    if (colors.size >= 2) {
      for (const song of artistToSongs.get(artist)) {
        const uri =
          song["Track URI"] ||
          `${song["Track Name"]}_${song["Artist Name(s)"]}`;
        if (!blendedSongs.has(uri)) {
          blendedSongs.set(uri, song);
        }
      }
    }
  }

  // Sort results: songs with more cross-color connections first
  const results = Array.from(blendedSongs.values());
  results.sort((a, b) => {
    const aScore = getConnectionScore(a, genreToColors, artistToColors);
    const bScore = getConnectionScore(b, genreToColors, artistToColors);
    return bScore - aScore;
  });

  return results;
}

/**
 * Scores a song based on how many cross-color connections it has.
 * Higher = more genres/artist shared across selected colors.
 */
function getConnectionScore(song, genreToColors, artistToColors) {
  let score = 0;

  const genres = song.Genres || [];
  for (const genre of genres) {
    const key = genre.toLowerCase().trim();
    const colors = genreToColors.get(key);
    if (colors && colors.size >= 2) {
      score += colors.size;
    }
  }

  const artist = (song["Artist Name(s)"] || "").toLowerCase().trim();
  const artistColors = artistToColors.get(artist);
  if (artistColors && artistColors.size >= 2) {
    score += artistColors.size * 2; // Boost same-artist matches
  }

  return score;
}

// Pastel versions of each color for track backgrounds
const PASTEL_MAP = {
  Red: "rgba(255, 100, 100, 0.15)",
  Orange: "rgba(255, 180, 80, 0.15)",
  Yellow: "rgba(255, 240, 100, 0.12)",
  Green: "rgba(80, 220, 120, 0.15)",
  Blue: "rgba(100, 140, 255, 0.15)",
  Purple: "rgba(180, 100, 240, 0.15)",
  Pink: "rgba(255, 140, 180, 0.15)",
};

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
    listEl.innerHTML =
      '<li class="blend-empty">No shared genres or artists found between these colors</li>';
    return;
  }

  for (const song of songs) {
    const li = document.createElement("li");
    li.className = "blend-track";

    // Set pastel background based on the song's source color
    const pastelBg = PASTEL_MAP[song._color] || "transparent";
    li.style.backgroundColor = pastelBg;

    const trackName = song["Track Name"] || "Unknown";
    const artist = song["Artist Name(s)"] || "Unknown";
    const uri = song["Track URI"] || "";
    const genres = (song.Genres || []).join(", ");

    let trackHtml = `<span class="blend-track-name">${escapeHtml(trackName)}</span>`;
    if (uri && uri.startsWith("spotify:track:")) {
      const spotifyUrl = `https://open.spotify.com/track/${uri.replace("spotify:track:", "")}`;
      trackHtml = `<a href="${spotifyUrl}" target="_blank" rel="noopener" class="blend-track-link">${escapeHtml(trackName)}</a>`;
    }

    li.innerHTML = `
      <div class="blend-track-info">
        ${trackHtml}
        <span class="blend-track-artist">${escapeHtml(artist)}</span>
        ${genres ? `<span class="blend-track-genre">${escapeHtml(genres)}</span>` : ""}
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
