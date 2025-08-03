import asyncio
import aiohttp
import json
import zlib
import os
from tqdm import tqdm
from config import HEADERS

async def get_players_playoff_page(session, before):
    url = f'https://web.realsports.io/userpassshop/mlb/season/2024/entity/player/section/earningsplayoffs?before={before}'
    
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
                playoff_dict = {}
                
                if 'items' in json_data and json_data['items']:
                    for item in json_data['items']:
                        name = item['label']
                        playoff_dict[name] = {
                            'playoff_value': item['value']
                        }
                    print(f"Found playoff data for {len(playoff_dict)} players at before={before}")
                    return playoff_dict, True
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
        tasks.append(get_players_playoff_page(session, before))
    
    results = await asyncio.gather(*tasks)
    
    combined_dict = {}
    should_continue = False
    
    for playoff_dict, has_data in results:
        combined_dict.update(playoff_dict)
        should_continue = should_continue or has_data
    
    return combined_dict, should_continue

async def main():
    # Load existing player values
    try:
        with open('../../public/data/players_values.json', 'r') as f:
            players_data = json.load(f)
        print(f"Loaded data for {len(players_data)} players from players_values.json")
    except FileNotFoundError:
        print("Error: players_values.json not found. Please run get_player_values.py first.")
        return
    
    # Create backup of original file
    with open('../../public/data/players_values_backup.json', 'w') as f:
        json.dump(players_data, f, indent=4)
    print("Created backup of original players_values.json")
    
    start_before = 0
    max_before = 2000
    batch_size = 5
    
    async with aiohttp.ClientSession() as session:
        current_before = start_before
        all_playoff_values = {}
        
        with tqdm(total=max_before) as pbar:
            while current_before <= max_before:
                playoff_dict, should_continue = await process_batch(session, current_before, batch_size)
                all_playoff_values.update(playoff_dict)
                
                if not should_continue:
                    print("\nNo more data found, stopping...")
                    break
                
                current_before += batch_size * 20
                pbar.update(batch_size * 20)
                await asyncio.sleep(0.2)  # Rate limiting
        
        # Update existing player data with playoff values
        updated_count = 0
        for player_name, player_data in players_data.items():
            if player_name in all_playoff_values:
                player_data.update(all_playoff_values[player_name])
                updated_count += 1
            else:
                # Add 0 playoff value for players not in playoffs
                player_data['playoff_value'] = '0'
        
        print(f"\nUpdated playoff data for {updated_count} players")
        
        # Save updated results
        with open('../../public/data/players_values.json', 'w') as f:
            json.dump(players_data, f, indent=4, sort_keys=True)
        
        print(f"\nComplete! Updated players_values.json with playoff values")
        print(f"A backup of the original file was saved as players_values_backup.json")

if __name__ == "__main__":
    asyncio.run(main()) 