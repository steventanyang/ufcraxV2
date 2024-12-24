import requests
import zlib
import json
import time

def get_fighters(before_id):
    url = f'https://web.realsports.io/userpassshop/ufc/season/2023/entity/team/section/hotseason?before={before_id}'
    
    headers = {
        'authority': 'web.realsports.io',
        'accept': 'application/json',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'en-US,en;q=0.9',
        'cache-control': 'max-age=0',
        'content-type': 'application/json',
        'origin': 'https://www.realsports.io',
        'priority': 'u=1, i',
        'real-auth-info': 'jvbbjXpv!aE1Wn2xA!e9dcef8c-6c49-4e3c-8637-a18138cd6a52',
        'real-device-name': '5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'real-device-type': 'desktop_web',
        'real-device-uuid': '9393a0d2-7aec-443d-88d9-13a8e9d72cf2',
        'real-request-token': 'token',
        'real-version': '21',
        'referer': 'https://www.realsports.io/',
        'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    }
    
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        if 'gzip' in response.headers.get('Content-Encoding', ''):
            data = zlib.decompress(response.content, 16+zlib.MAX_WBITS)
        elif 'deflate' in response.headers.get('Content-Encoding', ''):
            data = zlib.decompress(response.content)
        else:
            data = response.content 
        
        return json.loads(data)
    return None

# Initialize variables
all_fighters = []
before = 0
max_before = 354

while before <= max_before:
    json_data = get_fighters(before)
    
    if json_data and 'items' in json_data and json_data['items']:
        # Extract fighters from current page
        for item in json_data['items']:
            # Check if fighter is already in the list to avoid duplicates
            if not any(fighter['id'] == item['id'] for fighter in all_fighters):
                all_fighters.append({
                    'id': item['id'],
                    'name': item['entity']['name']
                })
        
        print(f"Fetched page with before={before}. Total fighters so far: {len(all_fighters)}")
        
        # Add a small delay to avoid hitting rate limits
        time.sleep(1)
    
    before += 20

# Save all fighters to JSON file
with open('simplified_fighters.json', 'w') as f:
    json.dump(all_fighters, f, indent=4)

print(f"\nComplete! Saved {len(all_fighters)} fighters to 'simplified_fighters.json'")