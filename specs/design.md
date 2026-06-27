# Technical Design

## Core Components

1. **Frontend / Canvas Manager**: An HTML5 Canvas element that loads the dynamically created pixel tie dye field. It utilizes the pixel's `getImageData` method on `mousemove` and `click` to retrieve the RGB values of specific pixels.
2. **Color Matcher**: A logic layer that calculates the Euclidean distance between the hovered RGB pixel and a predefined set of base colors to determine which CSV file is active.
3. **Data Service**: A local service utilizing a robust CSV parser to read `Red.csv`, `Green.csv`, etc. It indexes songs by color and extracts the comma-separated `Genres` string into an array for filtering.
4. **Blend Engine**: A function that takes an array of selected colors, finds common genres across their respective CSVs, and outputs a blended list of `spotify:track:URI` links.
5. **File Ingestion Engine**: An HTML drag-and-drop zone and `<input type="file" multiple>` element. It uses the `FileReader` API to read the text content of the uploaded `.csv` files entirely client-side.

## Data Flow

1. App initialization -> Display "Upload CSVs" UI.
2. User uploads files -> `FileReader` extracts text -> CSV Parser converts text to JSON objects in memory -> Hide Upload UI & Show Visualizer.
3. (Proceed with existing Hover/Blend flows)
