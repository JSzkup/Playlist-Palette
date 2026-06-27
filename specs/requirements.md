# Playlist Visualizer Requirements

## Core User Stories

1. **Interactive Visualizer**: As a user, I want to hover my mouse over a rainbow image so that the application extracts the pixel color, maps it to the closest color category, and returns a single song from the corresponding `.csv` playlist. On hover it should show metadata of the song like the album, artist, cover art, and which color playlist it's a part of.
2. **Color Interpolation**: As a user, if I hover over a transitional color (e.g., Orange), I want the app to randomly select a song from either of the adjacent primary color playlists (Red or Yellow).
3. **Blended Playlists**: As a user, I want to click and select multiple colors from the image, so I can generate a new playlist containing songs of similar genres from the combined color playlists. Blended playlists will show on a slide out sidebar to the right of the rainbow.
4. **Future-Proofing (Hues)**: The system must retain the audio features (e.g., `Energy`, `Danceability`) from the CSVs in the application state so that future updates can algorithmically sort playlists into sub-categories ("Hues").
5. **Dynamic Data Ingestion**: As a user, I want to be able to drag-and-drop or select my own `.csv` files when I first visit the app, so that the visualizer uses my personal playlist data instead of hardcoded files. The app should automatically recognize the color category based on the file name (e.g., `Red.csv` maps to the Red color zone).
