import subprocess, time, json, urllib.request, asyncio, websockets, os

async def check():
    chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
    user_data = r'C:\Users\rudra pratap\AppData\Local\Temp\chrome_dev_about_cdp'
    port = 9335
    p = subprocess.Popen([
        chrome_path,
        f'--remote-debugging-port={port}',
        '--headless=new',
        '--disable-gpu',
        f'--user-data-dir={user_data}',
        'about:blank'
    ])
    try:
        await asyncio.sleep(1.5)
        tabs = json.loads(urllib.request.urlopen(f'http://127.0.0.1:{port}/json').read().decode())
        ws_url = tabs[0]['webSocketDebuggerUrl']
        async with websockets.connect(ws_url) as ws:
            await ws.send(json.dumps({'id': 1, 'method': 'Runtime.enable'}))
            await ws.send(json.dumps({'id': 2, 'method': 'Page.enable'}))
            await ws.send(json.dumps({'id': 3, 'method': 'Page.navigate', 'params': {'url': 'http://localhost:5173/about'}}))
            errors = []
            start = time.time()
            while time.time() - start < 3:
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=0.8)
                    data = json.loads(msg)
                    if data.get('method') == 'Runtime.consoleAPICalled':
                        print('CONSOLE:', data['params']['type'], data['params']['args'])
                    if data.get('method') == 'Runtime.exceptionThrown':
                        errors.append(data['params']['exceptionDetails']['text'])
                except asyncio.TimeoutError:
                    pass
            print('Errors:', errors)
            await ws.send(json.dumps({'id': 4, 'method': 'Runtime.evaluate', 'params': {'expression': 'document.querySelector("h1") ? document.querySelector("h1").innerText : "NO H1 FOUND"'}}))
            while True:
                msg = await ws.recv()
                data = json.loads(msg)
                if data.get('id') == 4:
                    print('H1 Result:', data.get('result', {}).get('result', {}).get('value'))
                    break
    finally:
        p.terminate()

asyncio.run(check())
