#!/usr/bin/env python3
"""The README's demo: Anyfin on drawn devices, each screen a recording of the desktop preview.

  python3 demo/make.py record [names]  # the devices' clips, through React on Anything's preview
  python3 demo/make.py compose  # the device layers and the video: demo/demo.mp4 and demo/demo.gif
  python3 demo/make.py all

stage.json places the devices (images in devices/; a screen's is an SVG with a rect#screen) on the canvas, back to
front, with any `html` layers among them (the title), and gives each screen its clip: the platform the preview pretends to be (ROA_PLATFORM, for
button hints) and the input script it plays. A new device is an SVG and an entry.

`record` signs in as the preview last did (its sandbox in ../react-on-anything/.build/anyfin) and
sets the account's favorite movies to stage.json's while it records, so Home shows them; it puts
the account's own back afterwards. Needs ffmpeg, Google Chrome, and a built react-on-anything.
"""
import argparse
import contextlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

DEMO = Path(__file__).resolve().parent
APP = DEMO.parent
BUILD = DEMO / "build"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def stage():
    return json.loads((DEMO / "stage.json").read_text())


# Devices: where a device's screen lands on the canvas.

def screen_rect(device):
    root = ET.parse(DEMO / "devices" / device["image"]).getroot()
    _, _, view_w, _ = (float(v) for v in root.get("viewBox").split())
    rect = next(e for e in root.iter() if e.get("id") == "screen")
    scale = device["width"] / view_w
    x, y, w, h = (float(rect.get(k)) for k in ("x", "y", "width", "height"))
    even = lambda v: 2 * round(v / 2)  # yuv420 video: chroma per 2x2 pixels
    return [even(device["x"] + x * scale), even(device["y"] + y * scale), even(w * scale), even(h * scale)]


def render_layers(spec):
    """Each device, and the background, as a canvas-sized PNG drawn by Chrome."""
    layers = BUILD / "layers"
    layers.mkdir(parents=True, exist_ok=True)
    width, height = spec["size"]
    pages = {"background": f'<div style="position:fixed;inset:0;background:{spec["background"]}"></div>'}
    for device in spec["devices"]:
        if "html" in device:  # not a device: a title, a caption; {app} is this app's folder
            pages[device["name"]] = device["html"].replace("{app}", APP.as_uri())
            continue
        image = (DEMO / "devices" / device["image"]).as_uri()
        pages[device["name"]] = (f'<img src="{image}" style="position:absolute;left:{device["x"]}px;'
                                 f'top:{device["y"]}px;width:{device["width"]}px">')
    with tempfile.TemporaryDirectory() as scratch:
        for name, body in pages.items():
            page = Path(scratch) / f"{name}.html"
            page.write_text(f"<!doctype html><html><body style='margin:0;background:transparent'>{body}</body></html>")
            subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
                            "--default-background-color=00000000", f"--window-size={width},{height}",
                            f"--user-data-dir={scratch}/profile", f"--screenshot={layers / (name + '.png')}",
                            "--allow-file-access-from-files", page.as_uri()],
                           check=True, capture_output=True)
    return layers


# Recording.

class Account:
    """The Jellyfin account the preview is signed in to, for setting its favorite movies."""

    def __init__(self, sandbox):
        session = json.loads((sandbox / "download0/session.json").read_text())["session"]
        self.base, self.token, self.user = session["server"], session["token"], session["userId"]

    def call(self, path, method="GET", **query):
        query.setdefault("userId", self.user)
        request = urllib.request.Request(f"{self.base}{path}?{urllib.parse.urlencode(query)}", method=method,
                                         headers={"X-Emby-Token": self.token})
        body = urllib.request.urlopen(request, timeout=30).read()
        return json.loads(body) if body else None

    def favorite_movies(self):
        found = self.call(f"/Users/{self.user}/Items", IncludeItemTypes="Movie", Recursive="true", Filters="IsFavorite")
        return [item["Id"] for item in found["Items"]]

    def movie(self, name):
        found = self.call(f"/Users/{self.user}/Items", SearchTerm=name, IncludeItemTypes="Movie", Recursive="true", Limit="10")
        for item in found["Items"]:
            if item["Name"].lower() == name.lower():
                return item["Id"]
        raise SystemExit(f"stage.json favorite not on the server: {name}")

    def set_favorite_movies(self, ids):
        current = set(self.favorite_movies())
        for item in current - set(ids):
            self.call(f"/UserFavoriteItems/{item}", "DELETE")
        for item in set(ids) - current:
            self.call(f"/UserFavoriteItems/{item}", "POST")


@contextlib.contextmanager
def favorites(account, names):
    """The account's favorite movies set to `names` for the block; its own are kept in build/ until put back."""
    saved = BUILD / "favorite-movies.json"
    if saved.exists():
        print(f"Putting back favorites a previous run left in {saved}")
        account.set_favorite_movies(json.loads(saved.read_text()))
    saved.write_text(json.dumps(account.favorite_movies()))
    try:
        account.set_favorite_movies([account.movie(name) for name in names])
        yield
    finally:
        account.set_favorite_movies(json.loads(saved.read_text()))
        saved.unlink()


def record(spec, roa, only=()):
    clips = BUILD / "clips"
    clips.mkdir(parents=True, exist_ok=True)
    python = roa / ".venv/bin/python3"
    sandbox = roa / ".build" / APP.name / "sandbox"
    if not (sandbox / "download0/session.json").exists():
        raise SystemExit(f"Sign in to a server in the preview first ({sandbox} has no session)")
    with favorites(Account(sandbox), spec.get("favorites", [])):
        for device in spec["devices"]:
            clip = device.get("clip")
            if not clip or (only and device["name"] not in only):
                continue
            print(f"Recording {device['name']}…", flush=True)
            env = {**os.environ, "ROA_RECORD": str(clips / f"{device['name']}.mp4"), "ROA_RECORD_FPS": str(spec["fps"]),
                   "ROA_PLATFORM": clip["platform"], "ROA_INPUT_SCRIPT": clip["script"] + " quit"}
            run = subprocess.run([python if python.exists() else sys.executable, roa / "tools/cli.py", "preview",
                                  "--app-dir", APP], env=env, capture_output=True, text=True)
            recorded = re.search(r"\[ROA\] recorded (\d+) frames", run.stdout)
            if run.returncode or not recorded:
                sys.stderr.write(run.stdout[-3000:] + run.stderr[-3000:])
                raise SystemExit(f"{device['name']}: the preview did not record")
            print(f"  {int(recorded.group(1)) / spec['fps']:.1f}s")


# The video.

def compose(spec):
    layers = render_layers(spec)
    width, height = spec["size"]
    seconds, fps = spec["seconds"], spec["fps"]
    inputs = ["-loop", "1", "-framerate", str(fps), "-i", layers / "background.png"]
    graph, last, count = [], "0:v", 1
    for device in spec["devices"]:
        if device.get("clip"):
            clip = BUILD / "clips" / f"{device['name']}.mp4"
            if not clip.exists():
                raise SystemExit(f"No clip for {device['name']}: run `make.py record` first")
            x, y, w, h = screen_rect(device)
            inputs += ["-i", clip]
            # The app fills the screen's width and sits at its bottom: a taller screen (the MacBook's
            # 16:10) gets a black band on top, as a full-screen app has under the notch.
            graph.append(f"[{count}:v]fps={fps},scale={w}:-2:flags=lanczos,pad={w}:max(ih\\,{h}):0:oh-ih:black,"
                         f"crop={w}:{h}:0:ih-{h}[s{count}]")
            graph.append(f"[{last}][s{count}]overlay={x}:{y}:eof_action=repeat[v{count}]")
            last, count = f"v{count}", count + 1
        inputs += ["-loop", "1", "-framerate", str(fps), "-i", layers / f"{device['name']}.png"]
        graph.append(f"[{last}][{count}:v]overlay=0:0[v{count}]")
        last, count = f"v{count}", count + 1
    graph.append(f"[{last}]format=yuv420p[out]")
    video = DEMO / "demo.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(graph), "-map", "[out]",
                    "-t", str(seconds), "-r", str(fps), "-c:v", "libx264", "-preset", "slow", "-crf", "20",
                    "-movflags", "+faststart", video], check=True)
    # The README's inline copy: GitHub plays a GIF where it shows a committed video only as a link.
    gif = DEMO / "demo.gif"
    palette = BUILD / "palette.png"
    # Ordered (Bayer) dithering repeats frame to frame, so it compresses: 6MB where error diffusion took 14.
    scale = "fps=10,scale=960:-1:flags=lanczos"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", video, "-vf", f"{scale},palettegen=max_colors=192:stats_mode=diff",
                    palette], check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", video, "-i", palette, "-lavfi",
                    f"{scale}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle", gif], check=True)
    for path in (video, gif):
        print(f"{path.relative_to(APP)}: {path.stat().st_size / 1e6:.1f}MB")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("step", choices=("record", "compose", "all"))
    parser.add_argument("devices", nargs="*", help="record only these devices' clips")
    parser.add_argument("--roa", type=Path, default=APP.parent / "react-on-anything",
                        help="the react-on-anything checkout (default: beside this app)")
    args = parser.parse_args()
    if not shutil.which("ffmpeg"):
        raise SystemExit("ffmpeg is not on PATH")
    spec = stage()
    if args.step in ("record", "all"):
        record(spec, args.roa.resolve(), args.devices)
    if args.step in ("compose", "all"):
        compose(spec)


if __name__ == "__main__":
    main()
