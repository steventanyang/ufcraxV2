import asyncio
import aiohttp
import json
import zlib
import os
from tqdm import tqdm
from config import HEADERS

# Script to update pass distribution for fighters
# Handles retries for 429 errors and skips 401 errors
# Run this after get_fighter_values.py if you got rate limited

def load_fighters():
    """Load existing fighters data."""
    if os.path.exists('../../public/data/fighters_values.json'):
        with open('../../public/data/fighters_values.json', 'r') as f:
            return json.load(f)
    print("Error: fighters_values.json not found. Run get_fighter_values.py first.")
    return None

def save_fighters(fighters_data):
    """Save fighters data."""
    with open('../../public/data/fighters_values.json', 'w') as f:
        json.dump(fighters_data, f, indent=4, sort_keys=True)

async def get_fighter_passes(session, fighter_id, retry_count=0):
    """Get pass distribution for a fighter with retry logic."""
    pass_distribution = {7: 0, 6: 0, 5: 0, 4: 0, 3: 0}
    current_before = 0
    max_before = 1000
    max_retries = 3
    
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
                        await asyncio.sleep(0.1)  # Slightly longer delay
                    else:
                        break
                elif response.status == 429:
                    # Rate limited - wait and retry this specific request
                    if retry_count < max_retries:
                        wait_time = (2 ** retry_count) * 2  # Exponential backoff: 2s, 4s, 8s
                        await asyncio.sleep(wait_time)
                        # Retry the same page, not restart from beginning
                        continue
                    else:
                        # Max retries reached - return what we have so far
                        return pass_distribution if any(pass_distribution.values()) else None
                elif response.status == 401:
                    # Unauthorized - skip this fighter entirely
                    return None
                else:
                    # Other error - try next page or return what we have
                    if current_before == 0:
                        # Failed on first request
                        return None
                    break
                    
        except Exception as e:
            print(f"Error getting passes for fighter {fighter_id}: {str(e)}")
            if current_before == 0:
                return None
            break
    
    return pass_distribution if any(pass_distribution.values()) else None

async def get_fighter_age(session, fighter_id):
    """Get fighter age."""
    url = f'https://web.realsports.io/teams/{fighter_id}/sport/ufc'
    
    try:
        async with session.get(url, headers=HEADERS) as response:
            if response.status == 200:
                data = await response.json()
                details = data.get('team', {}).get('additionalInfo', {}).get('details', [])
                
                import re
                from datetime import datetime
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
        return None

async def process_pass_batch(session, fighters_batch):
    """Process a batch of fighters for pass distribution and age."""
    pass_tasks = []
    age_tasks = []
    
    for name, data in fighters_batch:
        fighter_id = data.get('id')
        if fighter_id:
            pass_tasks.append((name, get_fighter_passes(session, fighter_id)))
            age_tasks.append((name, get_fighter_age(session, fighter_id)))
    
    # Process passes and ages separately
    pass_results = []
    for name, task in pass_tasks:
        result = await task
        pass_results.append((name, result))
        await asyncio.sleep(0.05)  # Small delay between requests
    
    age_results = []
    for name, task in age_tasks:
        result = await task
        age_results.append((name, result))
        await asyncio.sleep(0.05)
    
    # Create a dictionary for easier lookup
    age_dict = {name: age for name, age in age_results}
    
    # Return results with passes guaranteed, age optional
    return [(name, passes, age_dict.get(name)) for name, passes in pass_results]

async def main():
    # Load existing fighters data
    all_fighters = load_fighters()
    if not all_fighters:
        return
    
    print(f"Loaded {len(all_fighters)} fighters")
    
    # Option 1: Process all fighters (refresh everything)
    # Option 2: Only process fighters missing pass_distribution
    # Option 3: Only process fighters that don't have pass_distribution yet
    
    # Process fighters that don't have pass_distribution or want to refresh
    # Change this to process all: list(all_fighters.items())
    fighters_items = [(name, data) for name, data in all_fighters.items() 
                     if 'id' in data and ('pass_distribution' not in data or True)]  # Set to False to only process missing ones
    
    print(f"\nUpdating pass distribution for {len(fighters_items)} fighters...")
    print("Note: This will handle 429 (rate limit) errors with retries")
    print("      and skip 401 (unauthorized) errors\n")
    
    batch_size = 5  # Smaller batch size to avoid rate limits
    failed_fighters = []
    
    async with aiohttp.ClientSession() as session:
        with tqdm(total=len(fighters_items)) as pbar:
            for i in range(0, len(fighters_items), batch_size):
                batch = fighters_items[i:i + batch_size]
                results = await process_pass_batch(session, batch)
                
                for name, passes, age in results:
                    if passes is not None:
                        all_fighters[name]['pass_distribution'] = passes
                    else:
                        # Failed to get passes - mark for retry
                        if 'pass_distribution' not in all_fighters[name]:
                            failed_fighters.append((name, all_fighters[name].get('id')))
                    
                    if age is not None:
                        all_fighters[name]['age'] = age
                
                # Save progress every 50 fighters
                if i % 50 == 0:
                    save_fighters(all_fighters)
                
                pbar.update(len(batch))
                await asyncio.sleep(0.2)  # Delay between batches
    
    # Save final results
    save_fighters(all_fighters)
    
    print(f"\nComplete! Updated pass distribution for fighters.")
    if failed_fighters:
        print(f"\nWarning: {len(failed_fighters)} fighters failed to update:")
        for name, fighter_id in failed_fighters[:10]:  # Show first 10
            print(f"  - {name} (ID: {fighter_id})")
        if len(failed_fighters) > 10:
            print(f"  ... and {len(failed_fighters) - 10} more")
        print("\nYou can run this script again to retry failed fighters.")

if __name__ == "__main__":
    asyncio.run(main())

