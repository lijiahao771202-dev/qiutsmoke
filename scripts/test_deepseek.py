import urllib.request
import json
import time

url = 'http://localhost:3000/api/generate-reminder'
data = {
    'provider': 'deepseek',
    'mode': 'urge_surfing',
    'history': [],
    'userAction': '',
    'sessionPhase': 'middle',
    'totalTime': 10,
    'elapsedTime': 50
}

success = 0
fallback = 0

for i in range(5):
    req = urllib.request.Request(url, json.dumps(data).encode('utf-8'), {'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as response:
            res = response.read().decode('utf-8')
            if 'fallback' in res:
                fallback += 1
                print(f"[{i}] Fallback:", res)
            else:
                success += 1
                print(f"[{i}] Success:", res)
    except Exception as e:
        print(f"[{i}] Failed strictly:", e)

print(f"Success: {success}, Fallback: {fallback}")
