#!/usr/bin/env python3
"""Build-time TMDB catalog fetcher for the Jelly5 demo.

Writes data/catalog.json, data/catalog.js and data/sample-images/.
The token is read at runtime (TMDB_TOKEN env or ~/.config/tmdb/application.conf)
and never written anywhere; the output only holds image *paths*, which TMDB
serves without auth.

Usage:
  python3 tools/fetch_catalog.py           # fetch + write + validate
  python3 tools/fetch_catalog.py --check   # validate existing output only
"""

import concurrent.futures as cf
import datetime as dt
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://api.themoviedb.org/3/"
IMAGE_BASE = "https://image.tmdb.org/t/p/"
CONF_PATH = Path.home() / ".config/tmdb/application.conf"

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
SAMPLES = DATA / "sample-images"

ROW_SIZE = 15
GRID_SIZE = 40
HERO_SIZE = 5
CAST_SIZE = 8
WORKERS = 6
# News / reality / talk shows make for ugly tiles in a media-browser demo.
SKIP_TV_GENRES = {10763, 10764, 10767}


def load_token():
    tok = os.environ.get("TMDB_TOKEN", "").strip()
    if tok:
        return tok
    text = CONF_PATH.read_text(encoding="utf-8")
    m = re.search(r'^\s*tmdbApiKey\s*[=:]\s*"([^"]+)"', text, re.M)
    if not m:
        sys.exit(f"tmdbApiKey not found in {CONF_PATH} and TMDB_TOKEN not set")
    return m.group(1).strip()


class Tmdb:
    def __init__(self, token):
        self._headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "User-Agent": "jelly5-catalog/1.0",
        }
        self.requests = 0

    def get(self, path, **params):
        params.setdefault("language", "en-US")
        url = API + path + "?" + urllib.parse.urlencode(params)
        delay = 1.0
        for attempt in range(6):
            self.requests += 1
            req = urllib.request.Request(url, headers=self._headers)
            try:
                with urllib.request.urlopen(req, timeout=30) as r:
                    return json.load(r)
            except urllib.error.HTTPError as e:
                if e.code == 429 or e.code >= 500:
                    wait = float(e.headers.get("Retry-After") or delay)
                    time.sleep(wait)
                    delay = min(delay * 2, 16)
                    continue
                # Deliberately no headers in the message: they carry the token.
                raise RuntimeError(f"TMDB {e.code} for {path}") from None
            except (urllib.error.URLError, TimeoutError):
                time.sleep(delay)
                delay = min(delay * 2, 16)
        raise RuntimeError(f"TMDB gave up on {path}")


def list_results(api, path, pages, **params):
    out = []
    for page in range(1, pages + 1):
        out.extend(api.get(path, page=page, **params).get("results", []))
    return out


def discover(api, kind, pages, min_votes, **params):
    return list_results(api, f"discover/{kind}", pages, include_adult="false",
                        **{"vote_count.gte": min_votes}, **params)


def candidates(results, kind):
    """List results -> ordered unique keys with a backdrop."""
    keys = []
    for r in results:
        if not r.get("backdrop_path") or r.get("adult"):
            continue
        if kind == "tv" and SKIP_TV_GENRES & set(r.get("genre_ids") or []):
            continue
        key = f"{kind}-{r['id']}"
        if key not in keys:
            keys.append(key)
    return keys


def pick_logo(logos):
    def score(l):
        return (
            l.get("iso_639_1") == "en",
            l.get("file_path", "").lower().endswith(".png"),
            l.get("vote_average") or 0,
            l.get("width") or 0,
        )

    usable = [l for l in logos or [] if l.get("iso_639_1") in ("en", None)]
    return max(usable, key=score)["file_path"] if usable else None


def pick_backdrop(detail):
    # Prefer a textless backdrop so the UI can overlay the logo cleanly.
    textless = [b for b in detail.get("images", {}).get("backdrops", []) if b.get("iso_639_1") is None]
    if textless:
        return max(textless, key=lambda b: (b.get("vote_average") or 0, b.get("vote_count") or 0))["file_path"]
    return detail.get("backdrop_path")


def movie_cert(detail):
    for country in detail.get("release_dates", {}).get("results", []):
        if country.get("iso_3166_1") != "US":
            continue
        dates = sorted(country.get("release_dates", []), key=lambda d: d.get("type") != 3)
        for d in dates:
            if d.get("certification", "").strip():
                return d["certification"].strip()
    return None


def tv_cert(detail):
    for c in detail.get("content_ratings", {}).get("results", []):
        if c.get("iso_3166_1") == "US" and c.get("rating", "").strip():
            return c["rating"].strip()
    return None


def fetch_item(api, key):
    kind, _, tid = key.partition("-")
    extra = "images,release_dates,credits" if kind == "movie" else "images,content_ratings,credits"
    d = api.get(f"{kind}/{tid}", append_to_response=extra, include_image_language="en,null")
    backdrop = pick_backdrop(d)
    if not backdrop:
        return None
    date = d.get("release_date") if kind == "movie" else d.get("first_air_date")
    if kind == "movie":
        runtime = d.get("runtime") or None
    else:
        runs = d.get("episode_run_time") or []
        runtime = runs[0] if runs else None
    cast = sorted(d.get("credits", {}).get("cast", []), key=lambda c: c.get("order", 999))[:CAST_SIZE]
    return {
        "key": key,
        "id": d["id"],
        "kind": kind,
        "title": d.get("title") if kind == "movie" else d.get("name"),
        "year": int(date[:4]) if date and date[:4].isdigit() else None,
        "rating": round(float(d.get("vote_average") or 0), 1),
        "genres": [g["name"] for g in d.get("genres", [])],
        "certification": movie_cert(d) if kind == "movie" else tv_cert(d),
        "runtime": runtime,
        "seasons": d.get("number_of_seasons") if kind == "tv" else None,
        "tagline": (d.get("tagline") or "").strip() or None,
        "overview": d.get("overview") or "",
        "backdrop": backdrop,
        "poster": d.get("poster_path"),
        "logo": pick_logo(d.get("images", {}).get("logos")),
        "cast": [
            {"name": c.get("name"), "character": c.get("character") or "", "profile": c.get("profile_path")}
            for c in cast
        ],
        "_popularity": d.get("popularity") or 0,
    }


def build(api):
    sources = {
        "trending-movies": ("Trending Movies", "movie", list_results(api, "trending/movie/week", 2), ROW_SIZE),
        "trending-tv": ("Trending TV Shows", "tv", list_results(api, "trending/tv/week", 2), ROW_SIZE),
        # The raw top_rated/popular endpoints are full of fan films and obscure imports;
        # discover with vote-count floors gives recognisable titles.
        "top-movies": ("Top Rated Movies", "movie", discover(
            api, "movie", 2, sort_by="vote_average.desc", min_votes=5000), ROW_SIZE),
        "popular-tv": ("Popular TV Shows", "tv", discover(
            api, "tv", 2, sort_by="popularity.desc", min_votes=1000), ROW_SIZE),
        "scifi": ("Science Fiction", "movie", discover(
            api, "movie", 2, with_genres=878, sort_by="popularity.desc", min_votes=1000), ROW_SIZE),
        "movies": (None, "movie", discover(
            api, "movie", 3, sort_by="popularity.desc", min_votes=1500), GRID_SIZE),
        "tv": (None, "tv", discover(api, "tv", 3, sort_by="vote_count.desc", min_votes=1000), GRID_SIZE),
    }
    # A few spares per section so items dropped after the detail fetch get backfilled.
    wanted = {sid: candidates(res, kind)[: n + 5] for sid, (_, kind, res, n) in sources.items()}
    all_keys = list(dict.fromkeys(k for keys in wanted.values() for k in keys))
    print(f"fetching details for {len(all_keys)} candidates...", file=sys.stderr)

    details = {}
    with cf.ThreadPoolExecutor(max_workers=WORKERS) as pool:
        for key, item in zip(all_keys, pool.map(lambda k: fetch_item(api, k), all_keys)):
            if item:
                details[key] = item

    sections = {sid: [k for k in keys if k in details][: sources[sid][3]] for sid, keys in wanted.items()}

    hero_pool = []
    for a, b in zip(sections["trending-movies"], sections["trending-tv"]):
        hero_pool += [a, b]
    hero_pool += sections["top-movies"] + sections["popular-tv"]
    hero = [k for k in dict.fromkeys(hero_pool) if details[k]["logo"] and details[k]["backdrop"]][:HERO_SIZE]

    used = set(hero) | {k for keys in sections.values() for k in keys}
    items = {}
    for k in sorted(used):
        item = dict(details[k])
        item.pop("_popularity")
        items[k] = item

    return {
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "imageBase": IMAGE_BASE,
        "hero": hero,
        "rows": [
            {"id": sid, "title": sources[sid][0], "items": sections[sid]}
            for sid in ("trending-movies", "trending-tv", "top-movies", "popular-tv", "scifi")
        ],
        "movies": sections["movies"],
        "tv": sections["tv"],
        "items": items,
    }


ITEM_FIELDS = {
    "key", "id", "kind", "title", "year", "rating", "genres", "certification", "runtime",
    "seasons", "tagline", "overview", "backdrop", "poster", "logo", "cast",
}


def validate(cat):
    errs = []
    req = lambda cond, msg: cond or errs.append(msg)
    req(set(cat) == {"generatedAt", "imageBase", "hero", "rows", "movies", "tv", "items"}, f"top keys: {sorted(cat)}")
    req(cat.get("imageBase") == IMAGE_BASE, "imageBase")
    items = cat.get("items", {})
    req(len(cat.get("hero", [])) == HERO_SIZE, "hero size")
    for k in cat.get("hero", []):
        req(k in items and items[k]["logo"] and items[k]["backdrop"], f"hero {k} lacks logo/backdrop")
    req([r["id"] for r in cat.get("rows", [])] ==
        ["trending-movies", "trending-tv", "top-movies", "popular-tv", "scifi"], "row ids")
    refs = list(cat.get("hero", [])) + cat.get("movies", []) + cat.get("tv", [])
    for r in cat.get("rows", []):
        req(set(r) == {"id", "title", "items"} and r["title"], f"row shape {r.get('id')}")
        refs += r["items"]
    for k in refs:
        req(k in items, f"dangling ref {k}")
    req(all(k.startswith("movie-") for k in cat.get("movies", [])), "movies grid kind")
    req(all(k.startswith("tv-") for k in cat.get("tv", [])), "tv grid kind")
    for k, it in items.items():
        req(set(it) == ITEM_FIELDS, f"{k} fields {sorted(set(it) ^ ITEM_FIELDS)}")
        req(it["key"] == k == f"{it['kind']}-{it['id']}", f"{k} key mismatch")
        req(it["kind"] in ("movie", "tv"), f"{k} kind")
        req(isinstance(it["backdrop"], str) and it["backdrop"].startswith("/"), f"{k} backdrop")
        for f in ("poster", "logo"):
            req(it[f] is None or it[f].startswith("/"), f"{k} {f}")
        req(isinstance(it["rating"], (int, float)), f"{k} rating")
        req(it["kind"] == "movie" or it["runtime"] is None or isinstance(it["runtime"], int), f"{k} runtime")
        req((it["seasons"] is None) == (it["kind"] == "movie"), f"{k} seasons")
        req(len(it["cast"]) <= CAST_SIZE, f"{k} cast size")
        for c in it["cast"]:
            req(set(c) == {"name", "character", "profile"}, f"{k} cast shape")
    return errs


def download_samples(cat):
    SAMPLES.mkdir(parents=True, exist_ok=True)
    items = cat["items"]
    order = list(dict.fromkeys(cat["hero"] + [k for r in cat["rows"] for k in r["items"]]))
    jobs = [(f"{k}-backdrop.jpg", f"{IMAGE_BASE}w1280{items[k]['backdrop']}") for k in order[:6]]
    jobs += [(f"{k}-poster.jpg", f"{IMAGE_BASE}w500{items[k]['poster']}") for k in order if items[k]["poster"]][:6]

    def dl(job):
        name, url = job
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "jelly5"}), timeout=60) as r:
            (SAMPLES / name).write_bytes(r.read())
        return name

    with cf.ThreadPoolExecutor(max_workers=WORKERS) as pool:
        return list(pool.map(dl, jobs))


def write(cat):
    DATA.mkdir(parents=True, exist_ok=True)
    body = json.dumps(cat, ensure_ascii=False, separators=(",", ":"))
    (DATA / "catalog.json").write_text(body + "\n", encoding="utf-8")
    (DATA / "catalog.js").write_text(f"export default {body};\n", encoding="utf-8")


def report(cat):
    items = cat["items"].values()
    size = (DATA / "catalog.json").stat().st_size
    print(f"hero={len(cat['hero'])} " + " ".join(f"{r['id']}={len(r['items'])}" for r in cat["rows"])
          + f" movies={len(cat['movies'])} tv={len(cat['tv'])}")
    print(f"unique items={len(cat['items'])} logos={sum(1 for i in items if i['logo'])} "
          f"certs={sum(1 for i in items if i['certification'])} catalog.json={size / 1024:.1f} KiB")


def main():
    if "--check" not in sys.argv:
        api = Tmdb(load_token())
        cat = build(api)
        write(cat)
        print(f"{api.requests} API requests", file=sys.stderr)
        print("samples:", ", ".join(download_samples(cat)), file=sys.stderr)
    cat = json.loads((DATA / "catalog.json").read_text(encoding="utf-8"))
    js = (DATA / "catalog.js").read_text(encoding="utf-8")
    js_cat = json.loads(js.removeprefix("export default ").rstrip().removesuffix(";"))
    errs = validate(cat) + ([] if js_cat == cat else ["catalog.js differs from catalog.json"])
    report(cat)
    if errs:
        print("CONTRACT ERRORS:\n  " + "\n  ".join(errs[:40]), file=sys.stderr)
        sys.exit(1)
    print("contract OK")


if __name__ == "__main__":
    main()
