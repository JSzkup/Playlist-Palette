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

  // Canvas mousemove — show song tooltip
  let cachedImageData = null;

  function cacheImageData() {
    const ctx = canvas.getContext("2d");
    cachedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  // Cache image data after initial draw
  cacheImageData();

  canvas.addEventListener("mousemove", (e) => {
    if (!cachedImageData || !appState.playlists) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
      hideTooltip();
      return;
    }

    const idx = (y * canvas.width + x) * 4;
    const r = cachedImageData.data[idx];
    const g = cachedImageData.data[idx + 1];
    const b = cachedImageData.data[idx + 2];

    const colorName = findClosestColor(r, g, b);
    const song = getRandomSongForColor(appState.playlists, colorName);

    if (song) {
      showTooltip(song, colorName, e.pageX, e.pageY);
    } else {
      hideTooltip();
    }
  });

  canvas.addEventListener("mouseleave", () => {
    hideTooltip();
  });

  // Canvas click — toggle color selection
  canvas.addEventListener("click", (e) => {
    if (!cachedImageData || !appState.playlists) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return;

    const idx = (y * canvas.width + x) * 4;
    const r = cachedImageData.data[idx];
    const g = cachedImageData.data[idx + 1];
    const b = cachedImageData.data[idx + 2];

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
