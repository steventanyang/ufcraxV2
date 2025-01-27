import asyncio
import aiohttp
import json
import zlib
import ssl
from tqdm import tqdm
from config import HEADERS
from datetime import datetime
import re
import os

# gets card purchases for each fighter
# last ran dec 25 2024
# use mobile instead of desktop

# TODO: 
# https://web.realsports.io/teams/346/sport/ufc -> get age and add vet status tag

# Load existing progress if available
def load_progress():
    if os.path.exists('../../public/data/fighters_values_partial.json'):
        with open('../../public/data/fighters_values_partial.json', 'r') as f:
            return json.load(f)
    return {}

# Save current progress
def save_progress(fighters_data):
    with open('../../public/data/fighters_values_partial.json', 'w') as f:
        json.dump(fighters_data, f, indent=4, sort_keys=True)

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
    max_before = 1000
    
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
                    found_level_2 = False
                    
                    if 'feedItems' in json_data and json_data['feedItems']:
                        for item in json_data['feedItems']:
                            if 'boostInfo' in item and 'level' in item['boostInfo']:
                                level = item['boostInfo']['level']
                                if level <= 2:
                                    found_level_2 = True
                                    break
                                if level in pass_distribution:
                                    pass_distribution[level] += 1
                        
                        if found_level_2:
                            break
                        
                        current_before += 20
                        await asyncio.sleep(0.05)  # Reduced delay
                    else:
                        break
                else:
                    print(f"HTTP {response.status} for fighter {fighter_id}")
                    break
                    
        except Exception as e:
            print(f"Error getting passes for fighter {fighter_id}: {str(e)}")
            break
    
    return pass_distribution

async def get_fighter_age(session, fighter_id):
    url = f'https://web.realsports.io/teams/{fighter_id}/sport/ufc'
    
    try:
        async with session.get(url, headers=HEADERS) as response:
            if response.status == 200:
                data = await response.json()
                details = data.get('team', {}).get('additionalInfo', {}).get('details', [])
                
                for detail in details:
                    if 'DOB:' in detail:
                        dob_match = re.search(r'DOB: (\d{4}-\d{2}-\d{2})', detail)
                        if dob_match:
                            dob_str = dob_match.group(1)
                            dob = datetime.strptime(dob_str, '%Y-%m-%d')
                            age = (datetime.now() - dob).days // 365
                            return age
                return None
    except Exception as e:
        print(f"Error getting age for fighter {fighter_id}: {str(e)}")
        return None

async def process_pass_batch(session, fighters_batch):
    pass_tasks = []
    age_tasks = []
    
    for name, data in fighters_batch:
        pass_tasks.append((name, get_fighter_passes(session, data['id'])))
        age_tasks.append((name, get_fighter_age(session, data['id'])))
    
    # Process passes and ages separately
    pass_results = []
    for name, task in pass_tasks:
        result = await task
        pass_results.append((name, result))
    
    age_results = []
    for name, task in age_tasks:
        result = await task
        age_results.append((name, result))
    
    # Create a dictionary for easier lookup
    age_dict = {name: age for name, age in age_results}
    
    # Return results with passes guaranteed, age optional
    return [(name, passes, age_dict.get(name)) for name, passes in pass_results]

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
    # Load any existing progress
    all_fighters = load_progress()
    print(f"Loaded {len(all_fighters)} fighters from previous progress")
    
    start_before = 0
    max_before = 1500
    batch_size = 5
    
    async with aiohttp.ClientSession() as session:
        # First get all fighters and their IDs if we don't have them
        if not all_fighters:
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
                    await asyncio.sleep(0.2)  # Reduced delay
            
            # Save progress after getting all fighters
            save_progress(all_fighters)
        
        # Now get pass distribution for each fighter
        print("\nGetting pass distribution for each fighter...")
        batch_size = 10  # Increased batch size
        fighters_items = [(name, data) for name, data in all_fighters.items() 
                         if 'pass_distribution' not in data]  # Only process fighters without pass distribution
        
        with tqdm(total=len(fighters_items)) as pbar:
            for i in range(0, len(fighters_items), batch_size):
                batch = fighters_items[i:i + batch_size]
                results = await process_pass_batch(session, batch)
                
                for name, passes, age in results:
                    if passes:
                        all_fighters[name]['pass_distribution'] = passes
                    if age is not None:
                        all_fighters[name]['age'] = age
                
                # Save progress every 50 fighters
                if i % 50 == 0:
                    save_progress(all_fighters)
                
                pbar.update(len(batch))
                await asyncio.sleep(0.1)  # Reduced delay
    
    # Save final results
    with open('../../public/data/fighters_values.json', 'w') as f:
        json.dump(all_fighters, f, indent=4, sort_keys=True)
    
    # Clean up partial file
    if os.path.exists('../../public/data/fighters_values_partial.json'):
        os.remove('../../public/data/fighters_values_partial.json')
    
    print(f"\nComplete! Saved {len(all_fighters)} fighters to 'fighters_values.json'")

if __name__ == "__main__":
    asyncio.run(main())