#!/usr/bin/env python3
import json
import mimetypes
import os
import re
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

APP_DIR = Path(__file__).resolve().parent
STATE_PATH = APP_DIR / "signage-state.json"
UPLOAD_DIR = APP_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
NS_DEPARTURES_URL = "https://gateway.apiportal.ns.nl/reisinformatie-api/api/v2/departures?station=RM"
WEATHER_URL = (
    "https://api.open-meteo.com/v1/forecast"
    "?latitude=51.1913&longitude=5.9878"
    "&current=temperature_2m,weather_code"
    "&daily=temperature_2m_max,temperature_2m_min"
    "&hourly=temperature_2m"
    "&timezone=Europe%2FAmsterdam"
    "&forecast_days=7"
)
TRAIN_CACHE_SECONDS = 60
WEATHER_CACHE_SECONDS = 15 * 60
ENV_PATH = APP_DIR / ".env"
api_cache = {
    "trains": {"expires_at": 0, "status": 503, "payload": {"ok": False, "message": "Treindata laden..."}},
    "weather": {"expires_at": 0, "status": 503, "payload": {"ok": False, "message": "Weerdata laden..."}},
}


def load_env_file():
    if not ENV_PATH.exists():
        return
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


load_env_file()


class SignageHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        request_path = self.path.split("?", 1)[0]
        if request_path == "/" or request_path.endswith((".html", ".js", ".css")):
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Filename, X-Asset-Kind")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_HEAD(self):
        if self.path.split("?", 1)[0] == "/api/state":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            return
        super().do_HEAD()

    def do_GET(self):
        if self.path.split("?", 1)[0] == "/api/state":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            if STATE_PATH.exists():
                self.wfile.write(STATE_PATH.read_bytes())
            else:
                self.wfile.write(b"{}")
            return
        if self.path.split("?", 1)[0] == "/api/trains":
            status, payload = cached_api_response("trains", TRAIN_CACHE_SECONDS, fetch_live_trains)
            self.send_json(status, payload)
            return
        if self.path.split("?", 1)[0] == "/api/weather":
            status, payload = cached_api_response("weather", WEATHER_CACHE_SECONDS, fetch_live_weather)
            self.send_json(status, payload)
            return
        super().do_GET()

    def do_POST(self):
        request_path = self.path.split("?", 1)[0]
        if request_path == "/api/assets":
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 25 * 1024 * 1024:
                self.send_error(400, "Invalid file size")
                return
            original = unquote(self.headers.get("X-Filename", "afbeelding"))
            safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", original)
            extension = Path(safe_name).suffix
            if not extension:
                extension = mimetypes.guess_extension(self.headers.get("Content-Type", "")) or ".bin"
            filename = f"{int(time.time() * 1000)}-{safe_name.removesuffix(extension)}{extension}"
            target = UPLOAD_DIR / filename
            target.write_bytes(self.rfile.read(length))
            response = {
                "id": filename,
                "name": original,
                "url": f"/uploads/{filename}",
                "type": self.headers.get("Content-Type", "application/octet-stream"),
                "kind": self.headers.get("X-Asset-Kind", "logo"),
                "createdAt": int(time.time() * 1000),
            }
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(response).encode("utf-8"))
            return
        if request_path != "/api/state":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length)
        try:
            data = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
            return
        STATE_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"ok":true}')

    def send_json(self, status, payload):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(payload, ensure_ascii=False).encode("utf-8"))

    def do_DELETE(self):
        request_path = urlparse(self.path).path
        prefix = "/api/assets/"
        if not request_path.startswith(prefix):
            self.send_error(404)
            return
        asset_id = Path(unquote(request_path[len(prefix):])).name
        if not asset_id:
            self.send_error(400, "Invalid asset")
            return
        target = UPLOAD_DIR / asset_id
        if target.exists():
            target.unlink()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"ok":true}')


def cached_api_response(key, ttl, fetcher):
    cached = api_cache[key]
    now = time.time()
    if cached["payload"] and now < cached["expires_at"]:
        return cached["status"], cached["payload"]
    status, payload = fetcher()
    cached.update({
        "expires_at": now + ttl if status == 200 else 0,
        "status": status,
        "payload": payload,
    })
    return status, payload


def fetch_live_trains():
    api_keys = ns_api_keys()
    if not api_keys:
        return 503, {"ok": False, "message": "NS API key ontbreekt"}

    payload = None
    last_status = 503
    last_message = "NS API niet bereikbaar"
    for api_key in api_keys:
        request = Request(NS_DEPARTURES_URL, headers={
            "Accept": "application/json",
            "Ocp-Apim-Subscription-Key": api_key,
        })
        try:
            with urlopen(request, timeout=8) as response:
                payload = json.loads(response.read().decode("utf-8"))
            break
        except HTTPError as error:
            last_status = error.code
            last_message = f"NS API gaf status {error.code}"
        except (URLError, TimeoutError, json.JSONDecodeError):
            last_status = 503
            last_message = "NS API niet bereikbaar"
    if payload is None:
        return last_status, {"ok": False, "message": last_message}

    departures = payload.get("payload", {}).get("departures", [])
    result = {"Eindhoven": [], "Maastricht": []}
    for departure in departures:
        direction = departure.get("direction", "")
        route = " ".join(route_station_names(departure.get("routeStations") or []))
        haystack = f"{direction} {route}".lower()
        target = None
        if "eindhoven" in haystack:
            target = "Eindhoven"
        if "maastricht" in haystack:
            target = "Maastricht"
        if not target or len(result[target]) >= 3:
            continue
        planned = departure.get("plannedDateTime") or departure.get("actualDateTime") or ""
        actual = departure.get("actualDateTime") or planned
        result[target].append({
            "time": format_departure_time(actual or planned),
            "platform": departure.get("actualTrack") or departure.get("plannedTrack") or "-",
            "delay": format_departure_delay(departure.get("delay")),
        })
    return 200, {"ok": True, "updatedAt": int(time.time() * 1000), "trains": result}


def fetch_live_weather():
    request = Request(WEATHER_URL, headers={"Accept": "application/json"})
    try:
        with urlopen(request, timeout=8) as response:
            data = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError):
        return 503, {"ok": False, "message": "Weer niet actueel"}

    current = data.get("current", {})
    daily = data.get("daily", {})
    hourly = data.get("hourly", {})
    names = ["Vandaag", "Morgen", "Overmorgen", "Dag 4", "Dag 5", "Dag 6", "Dag 7"]
    days = []
    for index, _ in enumerate(daily.get("time", [])[:7]):
        days.append({
            "name": names[index],
            "min": round_number(read_index(daily, "temperature_2m_min", index)),
            "max": round_number(read_index(daily, "temperature_2m_max", index)),
            "morning": round_number(read_index(hourly, "temperature_2m", index * 24 + 8, read_index(daily, "temperature_2m_min", index))),
            "midday": round_number(read_index(hourly, "temperature_2m", index * 24 + 13, read_index(daily, "temperature_2m_max", index))),
            "night": round_number(read_index(hourly, "temperature_2m", index * 24 + 21, read_index(daily, "temperature_2m_min", index))),
        })
    return 200, {
        "ok": True,
        "updatedAt": int(time.time() * 1000),
        "weather": {
            "current": {
                "temp": current.get("temperature_2m"),
                "code": current.get("weather_code", 0),
                "label": weather_label(current.get("weather_code", 0)),
            },
            "days": days,
        },
    }


def read_index(source, key, index, fallback=None):
    values = source.get(key) if isinstance(source, dict) else None
    if not isinstance(values, list) or index >= len(values):
        return fallback
    return values[index]


def round_number(value):
    try:
        return round(float(value))
    except (TypeError, ValueError):
        return 0


def weather_label(code):
    if code == 0:
        return "Zonnig"
    if code in [1, 2]:
        return "Licht bewolkt"
    if code == 3:
        return "Bewolkt"
    if code in [45, 48]:
        return "Mist"
    if code in [51, 53, 55, 61, 63, 65, 80, 81, 82]:
        return "Regen"
    if code in [71, 73, 75, 77, 85, 86]:
        return "Sneeuw"
    if code in [95, 96, 99]:
        return "Onweer"
    return "Wisselvallig"


def ns_api_keys():
    keys = [
        os.environ.get("NS_API_KEY_PRIMARY", ""),
        os.environ.get("NS_API_KEY", ""),
        os.environ.get("NS_API_KEY_SECONDARY", ""),
    ]
    seen = set()
    result = []
    for key in keys:
        key = key.strip()
        if key and key not in seen:
            seen.add(key)
            result.append(key)
    return result


def route_station_names(route_stations):
    names = []
    for station in route_stations:
        if isinstance(station, str):
            names.append(station)
        elif isinstance(station, dict):
            names.append(station.get("mediumName") or station.get("name") or station.get("uicCode") or "")
    return [name for name in names if name]


def format_departure_time(value):
    match = re.search(r"T(\d{2}:\d{2})", value or "")
    return match.group(1) if match else "--:--"


def format_departure_delay(value):
    if not value:
        return ""
    match = re.search(r"PT(\d+)M", value)
    return f"+{match.group(1)} min" if match else str(value)


if __name__ == "__main__":
    handler = partial(SignageHandler, directory=str(APP_DIR))
    ThreadingHTTPServer(("0.0.0.0", 4173), handler).serve_forever()
