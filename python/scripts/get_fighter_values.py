import asyncio
import aiohttp
import json
import zlib
import ssl
from tqdm import tqdm
from config import HEADERS

# gets card purchases for each fighter
# last ran dec 25 2024
# use mobile instead of desktop

async def get_fighters_page(session, before):
    url = f'https://web.realsports.io/userpassshop/ufc/season/2023/entity/team/section/hotseason?before={before}'
    
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    try:
        async with session.get(url, headers=HEADERS, ssl=ssl_context) as response:
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
    start_before = 0
    max_before = 1500
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
    with open(f'../../public/data/fighters_values.json', 'w') as f:
        json.dump(all_fighters, f, indent=4, sort_keys=True)
    
    print(f"\nComplete! Saved {len(all_fighters)} fighters to 'fighters_values.json'")
    
    # Example usage:
    print("\nExample lookups:")
    for name in list(all_fighters.keys())[:3]:  # Show first 3 examples
        print(f"{name}: {all_fighters[name]}")

if __name__ == "__main__":
    asyncio.run(main())