import urllib.request
import json
import time

url = 'http://localhost:3000/api/generate-reminder'
for et in [250, 400, 700]:
    data = {
        'provider': 'deepseek',
        'mode': 'urge_surfing',
        'history': [],
        'userAction': '',
        'sessionPhase': 'middle',
        'totalTime': 10,
        'elapsedTime': et
    }
    req = urllib.request.Request(url, json.dumps(data).encode('utf-8'), {'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as response:
            res = response.read().decode('utf-8')
            print(f"Time {et}:", 'fallback' if 'fallback' in res else 'Success')
            if 'fallback' in res: print(res)
    except Exception as e:
        print(f"Time {et} Failed:", e)
