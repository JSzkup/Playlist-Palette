/**
 * File Ingestion Engine
 *
 * Handles drag-and-drop and file input events, reads CSV files
 * via the FileReader API, and stores raw text keyed by color name.
 */

/**
 * @typedef {Object} FileIngestionResult
 * @property {Record<string, string>} files - Map of color name → raw CSV text
 * @property {string[]} errors - Any validation errors encountered
 */

/**
 * Extracts the color category from a filename.
 * e.g. "Red.csv" → "Red", "Dark Blue.csv" → "Dark Blue"
 * @param {string} filename
 * @returns {string}
 */
export function extractColorFromFilename(filename) {
  return filename.replace(/\.csv$/i, "");
}

/**
 * Validates that a file has a .csv extension.
 * @param {File} file
 * @returns {boolean}
 */
export function isValidCsvFile(file) {
  return file.name.toLowerCase().endsWith(".csv");
}

/**
 * Reads a single File object using FileReader and resolves with its text content.
 * @param {File} file
 * @returns {Promise<string>}
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () =>
      reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsText(file);
  });
}

/**
 * Processes an array of File objects:
 * - Validates each is a .csv
 * - Reads text content via FileReader
 * - Stores raw text keyed by color name (derived from filename)
 *
 * @param {File[]} files
 * @returns {Promise<FileIngestionResult>}
 */
export async function ingestFiles(files) {
  const result = { files: {}, errors: [] };

  const validFiles = [];
  for (const file of files) {
    if (!isValidCsvFile(file)) {
      result.errors.push(`Skipped "${file.name}" — not a .csv file`);
    } else {
      validFiles.push(file);
    }
  }

  const readPromises = validFiles.map(async (file) => {
    try {
      const text = await readFileAsText(file);
      const colorName = extractColorFromFilename(file.name);
      result.files[colorName] = text;
    } catch (err) {
      result.errors.push(err.message);
    }
  });

  await Promise.all(readPromises);
  return result;
}

/**
 * Sets up the drag-and-drop zone and file input listeners.
 * Calls `onFilesLoaded` with the ingestion result once all files are processed.
 *
 * @param {Object} options
 * @param {HTMLElement} options.dropZone - The drop zone element
 * @param {HTMLInputElement} options.fileInput - The file input element
 * @param {(result: FileIngestionResult) => void} options.onFilesLoaded - Callback when files are loaded
 * @param {(message: string, type: 'info'|'error'|'success') => void} [options.onStatus] - Optional status update callback
 */
export function setupFileIngestion({
  dropZone,
  fileInput,
  onFilesLoaded,
  onStatus,
}) {
  // Prevent default drag behaviors on the entire document
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    document.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  // Visual feedback for dragover
  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.remove("dragover");
    });
  });

  // Handle drop
  dropZone.addEventListener("drop", async (e) => {
    const files = Array.from(e.dataTransfer.files);
    await handleFiles(files, onFilesLoaded, onStatus);
  });

  // Handle file input change
  fileInput.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files);
    await handleFiles(files, onFilesLoaded, onStatus);
    // Reset so the same files can be selected again
    e.target.value = "";
  });

  // Clicking the drop zone triggers the file input
  dropZone.addEventListener("click", (e) => {
    // Don't trigger if clicking the actual input/label
    if (e.target === fileInput || e.target.closest(".file-input-label")) return;
    fileInput.click();
  });
}

/**
 * Internal handler that processes files and invokes callbacks.
 * @param {File[]} files
 * @param {(result: FileIngestionResult) => void} onFilesLoaded
 * @param {(message: string, type: string) => void} [onStatus]
 */
async function handleFiles(files, onFilesLoaded, onStatus) {
  if (files.length === 0) return;

  if (onStatus) {
    onStatus(
      `Reading ${files.length} file${files.length > 1 ? "s" : ""}...`,
      "info",
    );
  }

  const result = await ingestFiles(files);
  const loadedCount = Object.keys(result.files).length;

  if (loadedCount === 0) {
    if (onStatus) {
      onStatus(
        result.errors.join(". ") || "No valid CSV files found.",
        "error",
      );
    }
    return;
  }

  if (onStatus) {
    const colors = Object.keys(result.files).join(", ");
    const msg = `Loaded ${loadedCount} playlist${loadedCount > 1 ? "s" : ""}: ${colors}`;
    onStatus(
      result.errors.length > 0 ? `${msg} (${result.errors.join("; ")})` : msg,
      "success",
    );
  }

  onFilesLoaded(result);
}
