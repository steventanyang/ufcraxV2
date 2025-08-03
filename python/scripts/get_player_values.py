import asyncio
import aiohttp
import json
import zlib
import os
from tqdm import tqdm
from config import HEADERS

# Load existing progress if available
def load_progress():
    if os.path.exists('../../public/data/players_values_partial.json'):
        with open('../../public/data/players_values_partial.json', 'r') as f:
            return json.load(f)
    return {}

# Save current progress
def save_progress(players_data):
    with open('../../public/data/players_values_partial.json', 'w') as f:
        json.dump(players_data, f, indent=4, sort_keys=True)

async def get_players_page(session, before):
    url = f'https://web.realsports.io/userpassshop/mlb/season/2024/entity/player/section/earningsregularseason?before={before}'
    
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
                players_dict = {}
                
                if 'items' in json_data and json_data['items']:
                    for item in json_data['items']:
                        name = item['label']  # Using label as the player name
                        players_dict[name] = {
                            'value': item['value'],
                            'id': item['id']
                        }
                    print(f"Found {len(players_dict)} players for before={before}")
                    return players_dict, True
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
        tasks.append(get_players_page(session, before))
    
    results = await asyncio.gather(*tasks)
    
    combined_dict = {}
    should_continue = False
    
    for players_dict, has_data in results:
        combined_dict.update(players_dict)
        should_continue = should_continue or has_data
    
    return combined_dict, should_continue

async def main():
    # Load any existing progress
    all_players = load_progress()
    print(f"Loaded {len(all_players)} players from previous progress")
    
    start_before = 0
    max_before = 2000  # Increased for MLB as there might be more players
    batch_size = 5
    
    async with aiohttp.ClientSession() as session:
        # Get all players and their IDs if we don't have them
        if not all_players:
            current_before = start_before
            
            with tqdm(total=max_before) as pbar:
                while current_before <= max_before:
                    players_dict, should_continue = await process_batch(session, current_before, batch_size)
                    all_players.update(players_dict)
                    
                    if not should_continue:
                        print("\nNo more data found, stopping...")
                        break
                    
                    current_before += batch_size * 20
                    pbar.update(batch_size * 20)
                    await asyncio.sleep(0.2)  # Rate limiting
            
            # Save progress after getting all players
            save_progress(all_players)
    
    # Save final results
    with open('../../public/data/players_values.json', 'w') as f:
        json.dump(all_players, f, indent=4, sort_keys=True)
    
    # Clean up partial file
    if os.path.exists('../../public/data/players_values_partial.json'):
        os.remove('../../public/data/players_values_partial.json')
    
    print(f"\nComplete! Saved {len(all_players)} players to 'players_values.json'")

if __name__ == "__main__":
    asyncio.run(main()) 