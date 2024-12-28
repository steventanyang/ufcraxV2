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
    
    try:
        async with session.get(url, headers=HEADERS) as response:
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
                
                if 'items' in json_data and json_data['items']:
                    for item in json_data['items']:
                        name = item['entity']['name']
                        fighters_dict[name] = {
                            'value': item['value'],
                            'id': item['id']
                        }
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

# New function to get pass distribution for a fighter
async def get_fighter_passes(session, fighter_id):
    pass_distribution = {7: 0, 6: 0, 5: 0, 4: 0, 3: 0}
    current_before = 0
    max_before = 1000  # Adjust this if needed
    
    while current_before <= max_before:
        url = f'https://web.realsports.io/userpasses/ufc/type/team/entity/{fighter_id}/leaderboard?before={current_before}&season=2023&sort=boostvalue'
        
        try:
            async with session.get(url, headers=HEADERS) as response:
                if response.status == 200:
                    content = await response.read()
                    if 'gzip' in response.headers.get('Content-Encoding', ''):
                        data = zlib.decompress(content, 16+zlib.MAX_WBITS)
                    elif 'deflate' in response.headers.get('Content-Encoding', ''):
                        data = zlib.decompress(content)
                    else:
                        data = content
                    
                    json_data = json.loads(data)
                    found_level_3 = False
                    
                    if 'feedItems' in json_data and json_data['feedItems']:
                        for item in json_data['feedItems']:
                            if 'boostInfo' in item and 'level' in item['boostInfo']:
                                level = item['boostInfo']['level']
                                if level in pass_distribution:
                                    pass_distribution[level] += 1
                                if level <= 3:
                                    found_level_3 = True
                                    break
                        
                        if found_level_3:
                            break
                        
                        current_before += 20
                        await asyncio.sleep(0.1)  # Small delay between requests
                    else:
                        break
                else:
                    print(f"HTTP {response.status} for fighter {fighter_id}")
                    break
                    
        except Exception as e:
            print(f"Error getting passes for fighter {fighter_id}: {str(e)}")
            break
    
    return pass_distribution

async def process_pass_batch(session, fighters_batch):
    tasks = []
    for name, data in fighters_batch:
        tasks.append(get_fighter_passes(session, data['id']))
    
    results = await asyncio.gather(*tasks)
    return list(zip([f[0] for f in fighters_batch], results))

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
    batch_size = 5
    all_fighters = {}
    
    async with aiohttp.ClientSession() as session:
        # First get all fighters and their IDs
        current_before = start_before
        
        with tqdm(total=max_before) as pbar:
            while current_before <= max_before:
                fighters_dict, should_continue = await process_batch(session, current_before, batch_size)
                all_fighters.update(fighters_dict)
                
                if not should_continue:
                    print("\nNo more data found, stopping...")
                    break
                
                current_before += batch_size * 20
                pbar.update(batch_size * 20)
                await asyncio.sleep(0.5)
        
        # Now get pass distribution for each fighter
        print("\nGetting pass distribution for each fighter...")
        batch_size = 2  # Process 2 fighters at a time
        fighters_items = list(all_fighters.items())
        
        with tqdm(total=len(fighters_items)) as pbar:
            for i in range(0, len(fighters_items), batch_size):
                batch = fighters_items[i:i + batch_size]
                results = await process_pass_batch(session, batch)
                
                for name, passes in results:
                    if passes:
                        all_fighters[name]['pass_distribution'] = passes
                
                pbar.update(len(batch))
                await asyncio.sleep(0.2)  # Small delay between batches
    
    # Save fighters dictionary to JSON file
    with open('../../public/data/fighters_values.json', 'w') as f:
        json.dump(all_fighters, f, indent=4, sort_keys=True)
    
    print(f"\nComplete! Saved {len(all_fighters)} fighters to 'fighters_values.json'")
    
    # Example usage:
    print("\nExample lookups:")
    for name in list(all_fighters.keys())[:3]:
        print(f"{name}:")
        print(f"  Value: {all_fighters[name]['value']}")
        print(f"  ID: {all_fighters[name]['id']}")
        print(f"  Pass Distribution: {all_fighters[name]['pass_distribution']}")

if __name__ == "__main__":
    asyncio.run(main())