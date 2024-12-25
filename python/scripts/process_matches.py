import requests
import pandas as pd
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from collections import defaultdict
from typing import Dict, List, Optional, Tuple

# Constants for scoring
SCORING = {
    "KO/TKO": 100,
    "Submission": 90,
    "Decision - Unanimous": 80,
    "Decision - Majority": 75,
    "Decision - Split": 70
}

FIVE_ROUND_BONUS = 25

class FightProcessor:
    def __init__(self, fights_csv: str, fighters_csv: str):
        self.fights = pd.read_csv(fights_csv)
        self.fighters = pd.read_csv(fighters_csv)
        self.result = {}
        self.errors = []
        
        print(f"Loaded {len(self.fights)} fights from CSV")
        if len(self.fights) == 0:
            raise ValueError("No fights loaded from CSV file")

    def get_event_date(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract event date from fight page."""
        event_link = soup.find('h2', class_='b-content__title').find('a')
        if not event_link:
            return None
            
        try:
            new_url = event_link['href']
            new_page = requests.get(new_url, timeout=10)
            new_soup = BeautifulSoup(new_page.content, 'html.parser')
            
            date_item = new_soup.find('li', class_='b-list__box-list-item')
            if date_item:
                raw_date = date_item.text.strip().replace('Date:', '').strip()
                return datetime.strptime(raw_date, '%B %d, %Y').strftime('%Y-%m-%d')
        except Exception as e:
            print(f"Error getting event date: {e}")
        return None

    def get_strike_stats(self, soup: BeautifulSoup) -> Tuple[str, str, int]:
        """Extract strike statistics from fight page."""
        print("\n--- Debug: get_strike_stats start ---")
        try:
            parent_strike = soup.find('tbody', class_="b-fight-details__table-body")
            if not parent_strike:
                print("Debug: Could not find strike stats table")
                return None, None, 0
            
            fighter_names = parent_strike.find_all('a', class_="b-link_style_black")
            print(f"Debug: Found {len(fighter_names)} fighter names")
            
            top_fighter = fighter_names[0].get_text(strip=True)
            bottom_fighter = fighter_names[1].get_text(strip=True)
            print(f"Debug: Fighters - Top: {top_fighter}, Bottom: {bottom_fighter}")
            
            strike_cells = parent_strike.find_all('td', class_="b-fight-details__table-col")
            print(f"Debug: Found {len(strike_cells)} strike cells")
            
            top_strikes = int(strike_cells[2].find_all('p')[0].get_text(strip=True).split()[0])
            bottom_strikes = int(strike_cells[2].find_all('p')[1].get_text(strip=True).split()[0])
            print(f"Debug: Strikes - Top: {top_strikes}, Bottom: {bottom_strikes}")
            
            striker = top_fighter if top_strikes > bottom_strikes else bottom_fighter
            strike_diff = abs(top_strikes - bottom_strikes)
            
            print(f"Debug: Better striker: {striker}, Strike difference: {strike_diff}")
            print("--- Debug: get_strike_stats end ---")
            
            return striker, strike_diff
        except Exception as e:
            print(f"Debug: Error in get_strike_stats: {str(e)}")
            return None, None, 0

    def get_fight_details(self, soup: BeautifulSoup) -> Dict:
        """Extract fight details including winner, loser, method, and rounds."""
        print("\n--- Debug: get_fight_details start ---")
        names = soup.find_all('div', class_='b-fight-details__person')
        print(f"Found {len(names)} fighter details")
        
        winner, loser = None, None
        is_draw = False
        
        for person in names:
            try:
                status_elem = person.find('i', class_='b-fight-details__person-status')
                name_elem = person.find('a', class_="b-fight-details__person-link")
                
                if not status_elem or not name_elem:
                    print(f"Debug: Missing status or name element")
                    continue
                    
                status = status_elem.get_text(strip=True)
                name = name_elem.text.strip()
                
                print(f"Debug: Found fighter - Name: {name}, Status: {status}")
                
                if status == 'W':
                    winner = name
                elif status == 'L':
                    loser = name
                elif status == 'D':
                    is_draw = True
            except Exception as e:
                print(f"Debug: Error processing fighter details: {str(e)}")

        # Get fight method
        try:
            method_parent = soup.find('i', class_="b-fight-details__text-item_first")
            method = None
            if method_parent and len(method_parent.find_all('i')) > 1:
                method = method_parent.find_all('i')[1].get_text(strip=True)
                print(f"Debug: Found fight method: '{method}'")
            else:
                print("Debug: Could not find fight method")
                print(f"Debug: method_parent content: {method_parent}")
        except Exception as e:
            print(f"Debug: Error getting fight method: {str(e)}")

        # Get number of rounds
        try:
            rounds_text = soup.find('p', class_="b-fight-details__text")
            rounds = None
            if rounds_text:
                print(f"Debug: Found rounds text: {rounds_text.get_text(strip=True)}")
                for item in rounds_text.find_all('i', class_="b-fight-details__text-item"):
                    if "Time format:" in item.get_text():
                        rounds_info = item.get_text(strip=True)
                        if "5 Rnd" in rounds_info:
                            rounds = "5"
                        else:
                            rounds = "3"
                        print(f"Debug: Found rounds: {rounds}")
                        break
            else:
                print("Debug: Could not find rounds text")
        except Exception as e:
            print(f"Debug: Error getting rounds: {str(e)}")

        print(f"Debug: Final results - Winner: {winner}, Loser: {loser}, Method: {method}, Rounds: {rounds}")
        print("--- Debug: get_fight_details end ---")

        return {
            'winner': winner,
            'loser': loser,
            'is_draw': is_draw,
            'method': method,
            'rounds': rounds
        }

    def calculate_points(self, method: str, strike_bonus: int, is_five_rounds: bool) -> int:
        """Calculate total points based on fight outcome and bonuses."""
        # Only return the base method points, don't add bonuses here
        points = SCORING.get(method, 0)
        if points == 0:
            print(f"Warning: Unknown fight method '{method}'")
        return points  # Return only the method points

    def process_fight(self, row_data: tuple):
        """Process individual fight data."""
        index, row = row_data
        url = row['fight_url']
        print(f"\n=== Processing fight {index}: {url} ===")

        try:
            print("Debug: Fetching page...")
            page = requests.get(url, timeout=10)
            if page.status_code != 200:
                print(f"Debug: Bad status code: {page.status_code}")
                self.errors.append(url)
                return
                
            soup = BeautifulSoup(page.content, 'html.parser')
            
            print("Debug: Getting event date...")
            event_date = self.get_event_date(soup)
            if not event_date:
                print("Debug: Could not get event date")
                return
            print(f"Debug: Event date: {event_date}")
            
            print("Debug: Getting strike statistics...")
            striker, strike_diff = self.get_strike_stats(soup)
            if not striker:
                print("Debug: Could not get strike statistics")
                return
            
            print("Debug: Getting fight details...")
            details = self.get_fight_details(soup)
            
            print("Debug: Updating fighter records...")
            self.update_fighter_records(details, event_date, striker, strike_diff)
            
            print("=== Fight processing complete ===\n")
            
        except Exception as e:
            print(f"Debug: Error processing {url}: {str(e)}")
            import traceback
            print("Debug: Full traceback:")
            print(traceback.format_exc())
            self.errors.append(url)

    def update_fighter_records(self, details: Dict, date: str, striker: str, strike_diff: int):
        """Update fighter records with fight outcome."""
        if details['is_draw']:
            return

        winner, loser = details['winner'], details['loser']

        is_five_rounds = details['rounds'] == '5'
        
        # Initialize fighter records if needed
        for fighter in [winner, loser]:
            if fighter not in self.result:
                self.result[fighter] = self.create_fighter_record(fighter)

        # Get only the method points
        method_points = SCORING.get(details['method'], 0)

        # Update winner's record
        self.update_fight_history(
            winner, 
            date, 
            loser, 
            details['method'],
            method_points,  # Only pass the method points
            strike_diff if striker == winner else 0,
            FIVE_ROUND_BONUS if is_five_rounds else 0
        )

        # Update loser's record with only applicable bonuses
        self.update_fight_history(
            loser,
            date,
            winner,
            details['method'],
            0,  # Loser gets no method points
            strike_diff if striker == loser else 0,
            FIVE_ROUND_BONUS if is_five_rounds else 0
        )

    @staticmethod
    def create_fighter_record(name: str) -> Dict:
        """Create initial fighter record structure."""
        return {
            "name": name,
            "KO/TKO": 0,
            "Submission": 0,
            "Decision - Unanimous": 0,
            "Decision - Majority": 0,
            "Decision - Split": 0,
            "StrikeBonus": 0,
            "5roundBonus": 0,
            "fight_history": []
        }

    def update_fight_history(self, fighter: str, date: str, opponent: str, 
                           method: str, method_points: int, strike_bonus: int, 
                           round_bonus: int):
        """Update fighter's fight history and point totals."""
        # Add debug logging
        print(f"Debug: Updating {fighter}'s record with method: {method}")
        
        # Only update method points if there are any (winners only)
        if method_points > 0 and method in self.result[fighter]:
            self.result[fighter][method] += method_points
        
        # Store strike bonus and round bonus separately
        self.result[fighter]["StrikeBonus"] += strike_bonus
        self.result[fighter]["5roundBonus"] += round_bonus
        
        # Store fight history with separate point categories
        self.result[fighter]["fight_history"].append({
            "date": date,
            "opponent": opponent,
            "method": method,
            "method_points": method_points,  # This will be the base points for the win method
            "strike_bonus": strike_bonus,    # Strike differential bonus
            "round_bonus": round_bonus,      # 5-round fight bonus
            "total_points": method_points + strike_bonus + round_bonus  # Total for this fight
        })

    def process_all_fights(self):
        """Process all fights using thread pool."""
        print("Starting processing...")
        with ThreadPoolExecutor(max_workers=5) as executor:
            try:
                list(executor.map(self.process_fight, self.fights.iterrows()))
            except Exception as e:
                print(f"Error in thread execution: {str(e)}")
        print("Processing complete!")

    def save_results(self):
        """Save processed results to CSV files."""
        # Convert results to DataFrame
        final_list = [
            {**v, "fight_history": v["fight_history"]} 
            for v in self.result.values()
        ]
        
        df = pd.DataFrame(final_list)
        
        # Save main stats
        df.drop('fight_history', axis=1).to_csv('../results/new_final.csv', index=False)
        
        # Save detailed fight history
        fight_history_rows = []
        for fighter in final_list:
            for fight in fighter['fight_history']:
                fight_row = {
                    'fighter_name': fighter['name'],
                    **fight
                }
                fight_history_rows.append(fight_row)
                
        pd.DataFrame(fight_history_rows).to_csv('../results/fight_history.csv', index=False)

def main():
    processor = FightProcessor('../results/all_fights.csv', '../data/fighters.csv')
    processor.process_all_fights()
    processor.save_results()
    
    # Print and save errors if any
    if processor.errors:
        print(f"\nEncountered {len(processor.errors)} errors:")
        with open('../results/errors.txt', 'w') as f:
            f.write(f"Encountered {len(processor.errors)} errors:\n")
            for error in processor.errors:
                print(error)
                f.write(f"{error}\n")

if __name__ == "__main__":
    main()