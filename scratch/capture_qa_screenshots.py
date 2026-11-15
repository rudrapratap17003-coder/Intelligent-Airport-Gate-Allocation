import os
import sys
import time
import json
import base64
import asyncio
import subprocess
import urllib.request
import websockets

BREAKPOINTS = [
    {"name": "1920x1080", "width": 1920, "height": 1080, "mobile": False},
    {"name": "1366x768", "width": 1366, "height": 768, "mobile": False},
    {"name": "768x1024", "width": 768, "height": 1024, "mobile": True},
    {"name": "390x844", "width": 390, "height": 844, "mobile": True},
]

PAGES = [
    {"route": "/about", "slug": "about"},
    {"route": "/dashboard", "slug": "dashboard"},
    {"route": "/flights", "slug": "flights"},
    {"route": "/analytics", "slug": "analytics"},
    {"route": "/gates", "slug": "gates"},
    {"route": "/simulator", "slug": "simulator"},
    {"route": "/restrictions", "slug": "restrictions"},
    {"route": "/calculation", "slug": "calculation"},
    {"route": "/math-explorer", "slug": "math-explorer"},
]

OUTPUT_DIR = os.path.abspath("screenshots/visual-qa-final")
ARTIFACT_DIR = r"C:\Users\rudra pratap\.gemini\antigravity\brain\628ca014-daa5-4570-a7ec-da17f37278e3\screenshots"

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(ARTIFACT_DIR, exist_ok=True)

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PORT = 9336
USER_DATA = r"C:\Users\rudra pratap\AppData\Local\Temp\chrome_dev_qa_final"

async def capture():
    p = subprocess.Popen([
        CHROME_PATH,
        f"--remote-debugging-port={PORT}",
        "--headless=new",
        "--disable-gpu",
        f"--user-data-dir={USER_DATA}",
        "about:blank"
    ])
    try:
        await asyncio.sleep(2.0)
        tabs = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json").read().decode())
        ws_url = tabs[0]["webSocketDebuggerUrl"]
        
        async with websockets.connect(ws_url, max_size=50 * 1024 * 1024) as ws:
            req_id = 0
            
            async def send_cmd(method, params=None):
                nonlocal req_id
                req_id += 1
                current_id = req_id
                payload = {"id": current_id, "method": method}
                if params:
                    payload["params"] = params
                await ws.send(json.dumps(payload))
                while True:
                    msg = await ws.recv()
                    res = json.loads(msg)
                    if res.get("id") == current_id:
                        return res.get("result", {})

            await send_cmd("Page.enable")
            await send_cmd("Runtime.enable")
            await send_cmd("DOM.enable")

            # Priority pages and targeted captures for the bugs:
            # 1. About at 1920x1080 (BUG-VIS-01)
            # 2. Flights at 390x844 (BUG-VIS-02)
            # 3. Dashboard at 390x844 (BUG-VIS-03)
            # 4. Dashboard at 768x1024 (BUG-VIS-04)
            # 5. Analytics at 390x844 (BUG-VIS-05)
            # Plus all 4 breakpoints for Dashboard, Flights, Analytics, About
            
            targets = [
                ("about", "/about", ["1920x1080", "1366x768", "768x1024", "390x844"]),
                ("flights", "/flights", ["390x844", "768x1024", "1366x768", "1920x1080"]),
                ("dashboard", "/dashboard", ["1920x1080", "1366x768", "768x1024", "390x844"]),
                ("analytics", "/analytics", ["390x844", "768x1024", "1366x768", "1920x1080"]),
            ]

            results = []

            for slug, route, bp_names in targets:
                for bp in BREAKPOINTS:
                    if bp["name"] not in bp_names:
                        continue
                    print(f"Capturing {slug} at {bp['name']}...")
                    
                    # Set viewport
                    await send_cmd("Emulation.setDeviceMetricsOverride", {
                        "width": bp["width"],
                        "height": bp["height"],
                        "deviceScaleFactor": 1,
                        "mobile": bp["mobile"],
                        "fitWindow": False
                    })
                    
                    # Navigate
                    url = f"http://localhost:5173{route}"
                    await send_cmd("Page.navigate", {"url": url})
                    
                    # Wait for load and rendering
                    await asyncio.sleep(2.0)
                    
                    # Check console / runtime
                    eval_res = await send_cmd("Runtime.evaluate", {
                        "expression": "document.body.innerText.length"
                    })
                    text_len = eval_res.get("result", {}).get("value", 0)
                    
                    # Capture screenshot
                    shot_res = await send_cmd("Page.captureScreenshot", {
                        "format": "png",
                        "captureBeyondViewport": False
                    })
                    data_b64 = shot_res.get("data", "")
                    img_bytes = base64.b64decode(data_b64)
                    
                    filename = f"{slug}_{bp['name']}.png"
                    local_path = os.path.join(OUTPUT_DIR, filename)
                    artifact_path = os.path.join(ARTIFACT_DIR, filename)
                    
                    with open(local_path, "wb") as f:
                        f.write(img_bytes)
                    with open(artifact_path, "wb") as f:
                        f.write(img_bytes)
                        
                    size_kb = len(img_bytes) / 1024
                    print(f" -> Saved {filename} ({size_kb:.1f} KB, DOM text len: {text_len})")
                    results.append({
                        "slug": slug,
                        "breakpoint": bp["name"],
                        "file": filename,
                        "size_kb": size_kb,
                        "dom_text_len": text_len
                    })

            print("\nAll captures complete:")
            for r in results:
                print(f"  {r['file']}: {r['size_kb']:.1f} KB (DOM text: {r['dom_text_len']})")

    finally:
        p.terminate()

if __name__ == "__main__":
    asyncio.run(capture())
