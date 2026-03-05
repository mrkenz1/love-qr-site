# Love QR Landing Page

A mobile-friendly romantic page that works online.

## What this includes
- Hero section with "Open Your Love Letter"
- Letter section
- Memory cards with modal preview
- Playlist-style section
- QR generator section for sharing
- Personal link support using query params:
  - `?to=Name`
  - `?from=YourName`
  - `?note=ShortMessage`

## Run locally
Because this project is static files, you can open `index.html` directly.

For a local server (recommended):

```powershell
cd c:\Users\Lenovo\OneDrive\8
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Put it online (quick)

### Option 1: Netlify Drop
1. Go to `https://app.netlify.com/drop`
2. Drag and drop this folder (or zipped folder)
3. Netlify gives you a public URL

### Option 2: GitHub Pages
1. Push files to a GitHub repository
2. Enable Pages for the repository branch
3. Use the generated public URL

## How to send with QR
1. Open the online URL on your phone or PC.
2. In "Send This With QR", fill `To`, `From`, `Short note`.
3. Click `Generate Link + QR`.
4. Send either:
   - copied link, or
   - downloaded QR image (`love-qr.png`).

When the other person scans the QR, the same personalized page opens.

## Add your photos and music
1. Put photos in `assets/photos` (create the folder if needed).
2. Put songs in `assets/music` (for example `song-1.mp3`, `song-2.mp3`).
3. Open admin mode: `https://mrkenz1.github.io/love-qr-site/?admin=1`
4. In Memories, click `Edit` to change image paths.
5. In Playlist:
   - edit song names inline
   - click the `Audio` button on each song and set path like `./assets/music/song-1.mp3`
6. The locked QR auto-refreshes after changes.
