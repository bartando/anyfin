# Anyfin

A Jellyfin client for jailbroken PS5 consoles, the Nintendo Switch and Android TV, written in
React and built with [React on Anything](https://github.com/bartando/react-on-anything).

## What it does

- Finds Jellyfin servers on the LAN, or takes an address typed on the on-screen keyboard.
  Signs in with a password or Quick Connect.
- Home with Continue Watching, Next Up, favorites and the latest movies and shows.
- Movie and TV libraries with an A-Z bar, search, title pages with seasons, cast, stills and
  "More like this", and person pages. A Trailer button beside Play when the server has a trailer.
- A full-screen player over Jellyfin's PlaybackInfo: subtitles (embedded or files),
  audio tracks, versions, Skip Intro and Recap, Up Next, and seeking on the triggers.
- Optional upscaling, with two upscalers side by side to compare.
- Triangle on a card opens a menu: play, mark watched, favorite, details.
  Options opens Settings anywhere and the player's panel during playback.

## Build

Anyfin is an external [React on Anything](https://github.com/bartando/react-on-anything) app. Clone
both side by side:

```sh
git clone https://github.com/bartando/react-on-anything.git
git clone https://github.com/bartando/anyfin.git
cd react-on-anything
```

Follow the react-on-anything README to install its tools, then:

```sh
npm run dev -- --app-dir ../anyfin     # native macOS preview, rebuilds on save
npm run build -- --app-dir ../anyfin   # PS5 package in dist/PPSA99080/
```

## License

GPL-3.0, the same as react-on-anything. See [LICENSE](LICENSE). The fonts are under the SIL Open
Font License and the sounds under CC BY 4.0 (`assets/sounds/NOTICE.txt`).
