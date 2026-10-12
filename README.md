# Anyfin

A Jellyfin client for jailbroken PS5 consoles, written in React and built with
[ps5-react](https://github.com/bartando/ps5-react).

## What it does

- Finds Jellyfin servers on the LAN, or takes an address typed on the on-screen keyboard.
  Signs in with a password or Quick Connect.
- Home with Continue Watching, Next Up, favorites and the latest movies and shows.
- Movie and TV libraries with an A-Z bar, search, title pages with seasons, cast and
  "More like this", and person pages.
- A full-screen player over Jellyfin's PlaybackInfo: subtitles (embedded or files),
  audio tracks, versions, Skip Intro and Recap, Up Next, and seeking on the triggers.
- Optional upscaling, with two upscalers side by side to compare.
- Triangle on a card opens a menu: play, mark watched, favorite, details.
  Options opens Settings anywhere and the player's panel during playback.

## Build

Anyfin is an external ps5-react app and uses features from the
[bartando/ps5-react](https://github.com/bartando/ps5-react) fork. Clone both side by side:

```sh
git clone https://github.com/bartando/ps5-react.git
git clone https://github.com/bartando/anyfin.git
cd ps5-react
```

Follow the ps5-react README to install its tools, then:

```sh
npm run dev -- --app-dir ../anyfin     # native macOS preview, rebuilds on save
npm run build -- --app-dir ../anyfin   # PS5 package in dist/PPSA99080/
```

## License

GPL-3.0, the same as ps5-react. See [LICENSE](LICENSE). The fonts are under the SIL Open
Font License and the sounds under CC BY 4.0 (`assets/sounds/NOTICE.txt`).
