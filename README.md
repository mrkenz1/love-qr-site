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
2. Open admin mode: `https://mrkenz1.github.io/love-qr-site/?admin=1`
3. In Memories, click `Edit` to change image paths.
4. In Playlist:
   - edit song names inline
   - click each song's `Link` button and set a SoundCloud track/playlist URL
   - click song names to switch the embedded player instantly
   - when one song ends, next song auto-plays
5. The locked QR auto-refreshes after changes.
6. If QR fails, shorten long text/note or very long SoundCloud URLs.
7. If the QR JS library is blocked, the app auto-switches to image fallback mode.
