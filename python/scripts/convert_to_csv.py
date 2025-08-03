import json
import csv
import os

def convert_json_to_csv():
    # Read JSON file
    try:
        with open('../../public/data/players_values.json', 'r') as f:
            players_data = json.load(f)
        print(f"Loaded data for {len(players_data)} players from players_values.json")
    except FileNotFoundError:
        print("Error: players_values.json not found.")
        return

    # Define CSV headers
    headers = ['player_name', 'value', 'playoff_value', 'total_value', 'passes_bought']

    # Convert to list and sort by value (descending)
    sorted_players = sorted(
        [(name, data) for name, data in players_data.items()],
        key=lambda x: int(x[1]['value']),
        reverse=True
    )

    # Write to CSV
    output_file = '../../public/data/players_values.csv'
    with open(output_file, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(headers)

        # Write each player's data
        for player_name, data in sorted_players:
            regular_value = int(data.get('value', '0'))
            playoff_value = int(data.get('playoff_value', '0'))
            total_value = regular_value + playoff_value
            
            row = [
                player_name,
                str(regular_value),
                str(playoff_value),
                str(total_value),
                data.get('passes_bought', '')
            ]
            writer.writerow(row)

    print(f"\nComplete! Converted players_values.json to CSV at {output_file}")
    print(f"Total players processed: {len(players_data)}")

if __name__ == "__main__":
    convert_json_to_csv() 