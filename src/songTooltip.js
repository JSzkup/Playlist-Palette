/**
 * Song Tooltip
 *
 * Floating card that follows the mouse cursor and displays song metadata
 * when hovering over the tie-dye canvas.
 */

let tooltipEl = null;

// Color badge colors matching the core palette
const COLOR_MAP = {
  Red: "#ff0000",
  Orange: "#ffa500",
  Yellow: "#ffff00",
  Green: "#008000",
  Blue: "#0000ff",
  Purple: "#800080",
  Pink: "#ffc0cb",
};

/**
 * Creates the tooltip DOM element if it doesn't exist.
 * @returns {HTMLElement}
 */
function ensureTooltip() {
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.className = "song-tooltip";
    tooltipEl.setAttribute("aria-hidden", "true");
    document.body.appendChild(tooltipEl);
  }
  return tooltipEl;
}

/**
 * Shows the tooltip with song information at the given position.
 *
 * @param {object} song - Song object with Track Name, Artist Name(s), Album Name
 * @param {string} colorName - The matched color category
 * @param {number} x - Mouse X position (page coordinates)
 * @param {number} y - Mouse Y position (page coordinates)
 */
export function showTooltip(song, colorName, x, y) {
  const tip = ensureTooltip();

  const badgeColor = COLOR_MAP[colorName] || "#888";
  const trackName = song["Track Name"] || "Unknown Track";
  const artist = song["Artist Name(s)"] || "Unknown Artist";
  const album = song["Album Name"] || "Unknown Album";

  tip.innerHTML = `
    <div class="tooltip-header">
      <span class="tooltip-color-badge" style="background: ${badgeColor};"></span>
      <span class="tooltip-color-label">${colorName}</span>
    </div>
    <div class="tooltip-track">${escapeHtml(trackName)}</div>
    <div class="tooltip-artist">${escapeHtml(artist)}</div>
    <div class="tooltip-album">${escapeHtml(album)}</div>
  `;

  // Position offset from cursor
  const offsetX = 16;
  const offsetY = 16;

  tip.style.left = `${x + offsetX}px`;
  tip.style.top = `${y + offsetY}px`;
  tip.classList.add("visible");

  // Keep tooltip within viewport
  requestAnimationFrame(() => {
    const rect = tip.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      tip.style.left = `${x - rect.width - offsetX}px`;
    }
    if (rect.bottom > window.innerHeight) {
      tip.style.top = `${y - rect.height - offsetY}px`;
    }
  });
}

/**
 * Hides the tooltip.
 */
export function hideTooltip() {
  if (tooltipEl) {
    tooltipEl.classList.remove("visible");
  }
}

/**
 * Basic HTML escaping to prevent XSS in tooltip content.
 */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
