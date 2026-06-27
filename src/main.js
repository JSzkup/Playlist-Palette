/**
 * Main application entry point.
 * Sets up file ingestion, parses CSV data, manages app state transitions,
 * and wires up the visualizer after data is loaded.
 */

import { setupFileIngestion } from "./fileIngestion.js";
import { parsePlaylistData } from "./dataService.js";
import { generateTieDye } from "./tieDyeCanvas.js";
import { findClosestColor, getRandomSongForColor } from "./colorMatcher.js";
import { showTooltip, hideTooltip } from "./songTooltip.js";
import {
  initSelectionManager,
  toggleColor,
  getSelectedColors,
  clearSelection,
} from "./selectionManager.js";
import {
  generateBlendedPlaylist,
  renderBlendedPlaylist,
} from "./blendEngine.js";

// Application state
export const appState = {
  rawFiles: {},
  playlists: null,
  rainbowMode: false,
  currentSeed: Math.floor(Math.random() * 999999),
};

function init() {
  const dropZone = document.getElementById("drop-zone");
  const fileInput = document.getElementById("file-input");
  const fileStatus = document.getElementById("file-status");
  const uploadView = document.getElementById("upload-view");
  const visualizerView = document.getElementById("visualizer-view");

  setupFileIngestion({
    dropZone,
    fileInput,
    onFilesLoaded(result) {
      // Merge newly loaded files into app state
      Object.assign(appState.rawFiles, result.files);
      console.log("Files loaded into state:", Object.keys(appState.rawFiles));

      // Parse raw CSV text into structured playlist data
      appState.playlists = parsePlaylistData(appState.rawFiles);

      // Log parsed data summary
      for (const [color, songs] of Object.entries(appState.playlists)) {
        console.log(`${color}: ${songs.length} songs`);
      }

      // Task 8: Audit — log a sample song with all fields to verify data preservation
      const firstColor = Object.keys(appState.playlists)[0];
      if (firstColor && appState.playlists[firstColor].length > 0) {
        console.log(
          "[Data Audit] Sample song with all fields:",
          appState.playlists[firstColor][0],
        );
        const sample = appState.playlists[firstColor][0];
        const audioFeatures = [
          "Danceability",
          "Energy",
          "Key",
          "Loudness",
          "Mode",
          "Speechiness",
          "Acousticness",
          "Instrumentalness",
          "Liveness",
          "Valence",
          "Tempo",
          "Time Signature",
        ];
        const preserved = audioFeatures.filter((f) => sample[f] !== undefined);
        console.log(
          `[Data Audit] Audio features preserved: ${preserved.length}/${audioFeatures.length}`,
          preserved,
        );
      }

      // Toggle views
      uploadView.classList.add("hidden");
      visualizerView.classList.remove("hidden");

      // Initialize the visualizer
      initVisualizer();
    },
    onStatus(message, type) {
      fileStatus.textContent = message;
      fileStatus.className = `file-status ${type}`;
    },
  });
}

/**
 * Sets up the canvas visualizer, event listeners, and controls.
 */
function initVisualizer() {
  const canvas = document.getElementById("tie-dye-canvas");
  const regenerateBtn = document.getElementById("regenerate-btn");
  const rainbowToggle = document.getElementById("rainbow-mode-toggle");
  const selectionChips = document.getElementById("selection-chips");
  const generateBlendBtn = document.getElementById("generate-blend-btn");
  const clearBtn = document.getElementById("clear-selection-btn");
  const sidebar = document.getElementById("blend-sidebar");
  const closeSidebarBtn = document.getElementById("close-sidebar-btn");

  // Generate initial tie-dye pattern
  drawCanvas(canvas);

  // Selection manager
  initSelectionManager(selectionChips, (colors) => {
    generateBlendBtn.disabled = colors.length < 2;
  });

  // Regenerate button
  regenerateBtn.addEventListener("click", () => {
    appState.currentSeed = Math.floor(Math.random() * 999999);
    drawCanvas(canvas);
    requestAnimationFrame(cacheImageData);
  });

  // Rainbow mode toggle
  rainbowToggle.addEventListener("change", (e) => {
    appState.rainbowMode = e.target.checked;
    drawCanvas(canvas);
    requestAnimationFrame(cacheImageData);
  });

  // Canvas interaction — per color-block ("pixel")
  // A "pixel" = one color block, not one screen pixel.
  // We cache the image data and snap to block boundaries so the tooltip
  // is stable within a single block and only changes when you enter a new one.
  const PIXEL_SIZE = 8; // must match what we pass to generateTieDye
  let cachedImageData = null;
  let lastBlockCol = -1;
  let lastBlockRow = -1;
  let lastSong = null;
  let lastColorName = null;

  function cacheImageData() {
    const ctx = canvas.getContext("2d");
    cachedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  // Cache image data after initial draw
  cacheImageData();

  /**
   * Convert a mouse event to the block (col, row) it falls within.
   * Returns null if out of bounds.
   */
  function eventToBlock(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = Math.floor((e.clientX - rect.left) * scaleX);
    const canvasY = Math.floor((e.clientY - rect.top) * scaleY);

    if (
      canvasX < 0 ||
      canvasX >= canvas.width ||
      canvasY < 0 ||
      canvasY >= canvas.height
    ) {
      return null;
    }

    const blockCol = Math.floor(canvasX / PIXEL_SIZE);
    const blockRow = Math.floor(canvasY / PIXEL_SIZE);
    return { blockCol, blockRow, canvasX, canvasY };
  }

  /**
   * Get the color of the center of a block (avoids edge artifacts).
   */
  function getBlockColor(blockCol, blockRow) {
    // Sample the center pixel of the block
    const cx = blockCol * PIXEL_SIZE + Math.floor(PIXEL_SIZE / 2);
    const cy = blockRow * PIXEL_SIZE + Math.floor(PIXEL_SIZE / 2);
    const idx = (cy * canvas.width + cx) * 4;
    return {
      r: cachedImageData.data[idx],
      g: cachedImageData.data[idx + 1],
      b: cachedImageData.data[idx + 2],
    };
  }

  canvas.addEventListener("mousemove", (e) => {
    if (!cachedImageData || !appState.playlists) return;

    const block = eventToBlock(e);
    if (!block) {
      hideTooltip();
      return;
    }

    const { blockCol, blockRow } = block;

    // Only update song when we enter a NEW block
    if (blockCol !== lastBlockCol || blockRow !== lastBlockRow) {
      lastBlockCol = blockCol;
      lastBlockRow = blockRow;

      const { r, g, b } = getBlockColor(blockCol, blockRow);
      lastColorName = findClosestColor(r, g, b);
      lastSong = getRandomSongForColor(appState.playlists, lastColorName);
    }

    // Always update tooltip position (follows cursor smoothly)
    if (lastSong) {
      showTooltip(lastSong, lastColorName, e.pageX, e.pageY);
    } else {
      hideTooltip();
    }
  });

  canvas.addEventListener("mouseleave", () => {
    hideTooltip();
    lastBlockCol = -1;
    lastBlockRow = -1;
    lastSong = null;
    lastColorName = null;
  });

  // Canvas click — toggle color selection (per-block)
  canvas.addEventListener("click", (e) => {
    if (!cachedImageData || !appState.playlists) return;

    const block = eventToBlock(e);
    if (!block) return;

    const { r, g, b } = getBlockColor(block.blockCol, block.blockRow);
    const colorName = findClosestColor(r, g, b);
    toggleColor(colorName);
  });

  // Generate blend button
  generateBlendBtn.addEventListener("click", () => {
    const selected = getSelectedColors();
    if (selected.length < 2) return;

    const blended = generateBlendedPlaylist(appState.playlists, selected);
    renderBlendedPlaylist(sidebar, blended, selected);
    sidebar.classList.add("open");
  });

  // Clear selection
  clearBtn.addEventListener("click", () => {
    clearSelection();
    sidebar.classList.remove("open");
  });

  // Close sidebar
  closeSidebarBtn.addEventListener("click", () => {
    sidebar.classList.remove("open");
  });
}

/**
 * Draws the tie-dye pattern on the canvas with current settings.
 */
function drawCanvas(canvas) {
  generateTieDye(canvas, {
    pixelSize: 8,
    seed: appState.currentSeed,
    rainbowMode: appState.rainbowMode,
    playlists: appState.playlists,
  });
}

document.addEventListener("DOMContentLoaded", init);
