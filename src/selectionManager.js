/**
 * Selection Manager
 *
 * Tracks which colors have been clicked/selected for blend generation.
 * Provides visual feedback via colored chips below the canvas.
 */

const selectedColors = new Set();
let chipContainer = null;
let onChangeCallback = null;

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
 * Initializes the selection manager with a container for color chips.
 *
 * @param {HTMLElement} container - The chip bar element
 * @param {(colors: string[]) => void} [onChange] - Callback when selection changes
 */
export function initSelectionManager(container, onChange) {
  chipContainer = container;
  onChangeCallback = onChange;
  renderChips();
}

/**
 * Toggles a color in/out of the selection.
 *
 * @param {string} colorName - The color to toggle
 */
export function toggleColor(colorName) {
  if (selectedColors.has(colorName)) {
    selectedColors.delete(colorName);
  } else {
    selectedColors.add(colorName);
  }
  renderChips();
  if (onChangeCallback) {
    onChangeCallback(getSelectedColors());
  }
}

/**
 * Returns the currently selected colors.
 *
 * @returns {string[]}
 */
export function getSelectedColors() {
  return Array.from(selectedColors);
}

/**
 * Clears all selections.
 */
export function clearSelection() {
  selectedColors.clear();
  renderChips();
  if (onChangeCallback) {
    onChangeCallback([]);
  }
}

/**
 * Renders the colored chips UI showing current selections.
 */
function renderChips() {
  if (!chipContainer) return;

  chipContainer.innerHTML = "";

  if (selectedColors.size === 0) {
    chipContainer.innerHTML =
      '<span class="chip-hint">Click colors on the canvas to select</span>';
    return;
  }

  for (const color of selectedColors) {
    const chip = document.createElement("button");
    chip.className = "color-chip";
    chip.style.backgroundColor = COLOR_MAP[color] || "#888";
    chip.textContent = color;
    chip.title = `Remove ${color}`;
    chip.setAttribute("aria-label", `Deselect ${color}`);
    chip.addEventListener("click", () => toggleColor(color));
    chipContainer.appendChild(chip);
  }
}
