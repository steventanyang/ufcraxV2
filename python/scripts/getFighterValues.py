import asyncio
import aiohttp
import json
import zlib
import ssl
from tqdm import tqdm

# gets card purchases for each fighter
# last ran dec 25 2024

async def get_fighters_page(session, before):
    url = f'https://web.realsports.io/userpassshop/ufc/season/2023/entity/team/section/hotseason?before={before}'
    
    headers = {
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

    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    try:
        async with session.get(url, headers=headers, ssl=ssl_context) as response:
            if response.status == 200:
                content = await response.read()
                if 'gzip' in response.headers.get('Content-Encoding', ''):
                    data = zlib.decompress(content, 16+zlib.MAX_WBITS)
                elif 'deflate' in response.headers.get('Content-Encoding', ''):
                    data = zlib.decompress(content)
                else:
                    data = content
                
                json_data = json.loads(data)
                fighters_dict = {}
                
                if 'items' in json_data and json_data['items']:  # Check if items exist and not empty
                    for item in json_data['items']:
                        name = item['entity']['name']
                        value = item['value']
                        fighters_dict[name] = value
                    print(f"Found {len(fighters_dict)} fighters for before={before}")
                    return fighters_dict, True
                else:
                    print(f"No items found for before={before}")
                    return {}, False
            else:
                print(f"HTTP {response.status} for before={before}")
                return {}, False
    except Exception as e:
        print(f"Error for before={before}: {str(e)}")
        return {}, False

async def process_batch(session, start_before, batch_size=5):
    tasks = []
    for before in range(start_before, start_before + (batch_size * 20), 20):
        tasks.append(get_fighters_page(session, before))
    
    results = await asyncio.gather(*tasks)
    
    combined_dict = {}
    should_continue = False
    
    for fighters_dict, has_data in results:
        combined_dict.update(fighters_dict)
        should_continue = should_continue or has_data
    
    return combined_dict, should_continue

async def main():
    start_before = 20
    max_before = 2300
    batch_size = 5  # Number of concurrent requests
    all_fighters = {}
    
    async with aiohttp.ClientSession() as session:
        current_before = start_before
        
        with tqdm(total=max_before) as pbar:
            while current_before <= max_before:
                fighters_dict, should_continue = await process_batch(session, current_before, batch_size)
                all_fighters.update(fighters_dict)
                
                if not should_continue:  # If we got no data, stop
                    print("\nNo more data found, stopping...")
                    break
                
                current_before += batch_size * 20
                pbar.update(batch_size * 20)
                await asyncio.sleep(0.5)  # Small delay between batches
    
    # Save fighters dictionary to JSON file
    with open('fighters_values.json', 'w') as f:
        json.dump(all_fighters, f, indent=4, sort_keys=True)
    
    print(f"\nComplete! Saved {len(all_fighters)} fighters to 'fighters_values.json'")
    
    # Example usage:
    print("\nExample lookups:")
    for name in list(all_fighters.keys())[:3]:  # Show first 3 examples
        print(f"{name}: {all_fighters[name]}")

if __name__ == "__main__":
    asyncio.run(main())