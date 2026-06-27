# Architecture Standards

- **Environment**: Local development on an M1 Mac.
- **Data Source**: The application relies strictly on local `.csv` files (e.g., `Red.csv`, `Green.csv`) for song metadata. Do not attempt to call external APIs for song data. File examples are in inputs/examplecsvplaylistfiles
- **Data Parsing**: Parse the CSV files on application startup and store them in memory. The CSVs contain standard headers like `Track URI`, `Track Name`, `Genres`, and various audio features.
- **Expandability**: Structure the data models so that future grouping by "Hues" can easily leverage the numerical audio feature columns (like `Acousticness`, `Valence`, or `Tempo`) without requiring a database rewrite.
