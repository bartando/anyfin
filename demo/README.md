# Demo

`demo.mp4` and `demo.gif`: Anyfin on two TVs (a PS5's and a Shield's), a MacBook and a Switch, every
screen a recording of the desktop preview. Drawn, not filmed, and not every pixel is what the device
shows: the preview names itself the PS5, Android, the Switch or macOS for the button hints, and draws
the same 1080p layout on each.

```sh
python3 demo/make.py all      # record the clips, then compose the video
python3 demo/make.py compose  # only the composition, after editing the layout
```

It needs a built [React on Anything](https://github.com/bartando/react-on-anything) checkout beside
this one (or `--roa <path>`), its preview signed in to a Jellyfin server once, `ffmpeg` and Google
Chrome. While it records, the account's favorite movies are `favorites` in `stage.json`, so Home's
Favorite Movies row shows them; its own come back afterwards (kept in `demo/build/` until they do).

## Adding a device

1. Draw it as `devices/<name>.svg`, front on, with a transparent hole where the screen is and a
   `<rect id="screen">` over that hole (a device without a screen can be any image, like the PS5). The app fills the screen's width and sits at its bottom, so a
   taller screen gets a black band on top (the MacBook's notch).
2. Add it to `stage.json`'s `devices`, which are drawn back to front: its `image`, `x`, `y` and `width` on the
   1920x1080 canvas, and a `clip` with the `platform` the preview reports (`android`, `switch`,
   `ps5`, `desktop`) and the input `script` it plays (the steps of React on Anything's
   `ROA_INPUT_SCRIPT`; `quit` is added).
3. `python3 demo/make.py all`.

The PS5 and the Shield have no screen and no clip, and the TV is drawn twice, a clip each; the
`title` entry is HTML instead of a device. `make.py record <names>` records only those clips.

## Credits

`devices/ps5.png` is [PlayStation 5 and DualSense with transparent background](https://commons.wikimedia.org/wiki/File:PlayStation_5_and_DualSense_with_transparent_background.png)
by Osh33m (photograph) and Soberian (retouch), from Wikimedia Commons under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), cropped and scaled; so are the
PS5 in `demo.mp4` and `demo.gif`. The other devices are drawn here.
