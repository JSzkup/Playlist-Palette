# UI & Interaction Standards

- **Visualizer Layout**: The UI centers around a user-uploaded static rainbow image. build out a dynamic pixelated tie dye pattern based on inputs/tie-dye-inspo.png There should be a button that lets you refresh and regenerate a new tie die pattern. There should be a toggle called "custom rainbow mode" to have it so that each pixel is mapped to a specific song of that playlist's color. So there would be a 1:1 ratio of red songs to red pixels.
- **Color Mapping Engine**: Implement a utility function that calculates the distance between the extracted RGB values and your core discrete playlist colors to determine the active category.
- **Interactions**: Prioritize highly responsive event handling for `mousemove` (which triggers a single song retrieval) and `click` (which adds a color to the multi-color blend selection).
