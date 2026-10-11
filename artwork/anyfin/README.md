# Anyfin brand

The selected Afterglow mascot has its original rounded body and hooked fin.
The home-screen icon uses the smiling landing face with happy closed eyes and
pink cheeks. The wordmark is outlined Outfit SemiBold; its OFL is included.

`icon.svg`, `splash.svg`, `wordmark.svg`, and `scene.svg` are the editable SVG
sources. The icon exporter replaces the curious face with the held happy face.
`timeline.mjs` and `turn.mjs` define the four-second jump-and-spin sequence.

The native launch component plays once per process. The signed-in app mounts
immediately, loading Home and preloading the library tabs while its UI stays
hidden and its focus scope stays inert. The intro owns controller focus until
completion or a Cross/Circle skip, then hands it to Home's Play button without
remounting or restarting the library requests. Signed-out launches show the
connection screen after the intro. Intro timers are cancelled on skip,
completion, and unmount. Account state and the title/content IDs are unchanged.
The header and connection screen share the outlined wordmark.

`poster-placeholder.svg` and `thumb-placeholder.svg` are the movie-card layouts.
The exporter inserts the happy icon mascot and writes self-contained SVGs and
PNGs to `assets/brand/`, sized for the 4K poster grid and 16:9 cards. Cards keep
these underneath remote art, so loading, missing, and failed images show the
mascot with the title. Real artwork covers the placeholder as soon as it arrives.

The intro keeps its backdrop still and updates four or fewer cropped vector
layers, each drawn through two clipped windows to stay within the native
1024-pixel coverage-row limit at 4K. Its 60 Hz pose table skips missed poses by
elapsed time; it does not render or decode video. The wordmark enters as one
native fade/slide. The elliptical ground glow is a small transparent PNG that
scales and fades with the jump, since the native vector baker approximates
radial gradients with circles. The native intro must be visually checked
separately from the browser animation.

The generated shell images are `sce_sys/icon0.png` (512 square) and
`sce_sys/pic0.png` / `pic1.png` (1920 × 1080). The operating-system splash is
static. The in-app intro runs at the app's configured render size, currently
3840 × 2160. This integration has not been verified on PS5 hardware.

To rebuild assets from the Anyfin directory, use Python 3.12+ and the framework's
bootstrapped Embedded React dependency in the sibling `ps5-react` checkout:

```sh
python3 -m venv .brand-venv
.brand-venv/bin/python -m pip install -r tools/brand-requirements.txt
.brand-venv/bin/python tools/export-brand.py
```

Pathops resolves clips as vector intersections, then the framework's existing
SVG baker compiles the paths. The exporter rejects unsupported elements and
splits layers to respect the engine's 1024-op / 16-paint / 8-gradient limits.
Generated assets are included so normal app builds need no artwork tools.
