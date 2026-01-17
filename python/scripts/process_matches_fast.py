"""
Optimized fight processor using aiohttp for aggressive parallelization.
Expected to be ~4-5x faster than the original process_matches.py.
"""
import asyncio
import aiohttp
import pandas as pd
from bs4 import BeautifulSoup
from datetime import datetime
from collections import defaultdict
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import json

SCORING = {
    "KO/TKO": 100,
    "Submission": 90,
    "Decision - Unanimous": 80,
    "Decision - Majority": 75,
    "Decision - Split": 70
}

FIVE_ROUND_BONUS = 25
MAX_CONCURRENT = 30  # Aggressive parallelization
BATCH_SIZE = 100
SAVE_INTERVAL = 500


class AsyncFightProcessor:
    def __init__(self, fights_csv: str, fighters_csv: str):
        self.fights = pd.read_csv(fights_csv)
        self.fighters = pd.read_csv(fighters_csv)
        self.result = {}
        self.errors = []
        self.processed_count = 0
        self.total_fights = len(self.fights)
        self.lock = asyncio.Lock()
        
        print(f"Loaded {self.total_fights} fights from CSV")
        if self.total_fights == 0:
            raise ValueError("No fights loaded from CSV file")

    async def get_event_date(self, session: aiohttp.ClientSession, soup: BeautifulSoup) -> Optional[str]:
        """Extract event date from fight page."""
        try:
            title_elem = soup.find('h2', class_='b-content__title')
            if not title_elem:
                return None
            event_link = title_elem.find('a')
            if not event_link:
                return None
                
            new_url = event_link['href']
            async with session.get(new_url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                if response.status != 200:
                    return None
                content = await response.text()
                new_soup = BeautifulSoup(content, 'html.parser')
                
                date_item = new_soup.find('li', class_='b-list__box-list-item')
                if date_item:
                    raw_date = date_item.text.strip().replace('Date:', '').strip()
                    return datetime.strptime(raw_date, '%B %d, %Y').strftime('%Y-%m-%d')
        except Exception as e:
            pass
        return None

    def get_strike_stats(self, soup: BeautifulSoup) -> Tuple[Optional[str], int]:
        """Extract strike statistics from fight page."""
        try:
            parent_strike = soup.find('tbody', class_="b-fight-details__table-body")
            if not parent_strike:
                return None, 0
            
            fighter_names = parent_strike.find_all('a', class_="b-link_style_black")
            if len(fighter_names) < 2:
                return None, 0
            
            top_fighter = fighter_names[0].get_text(strip=True)
            bottom_fighter = fighter_names[1].get_text(strip=True)
            
            strike_cells = parent_strike.find_all('td', class_="b-fight-details__table-col")
            if len(strike_cells) < 3:
                return None, 0
            
            p_tags = strike_cells[2].find_all('p')
            if len(p_tags) < 2:
                return None, 0
                
            top_strikes = int(p_tags[0].get_text(strip=True).split()[0])
            bottom_strikes = int(p_tags[1].get_text(strip=True).split()[0])
            
            striker = top_fighter if top_strikes > bottom_strikes else bottom_fighter
            strike_diff = abs(top_strikes - bottom_strikes)
            
            return striker, strike_diff
        except Exception:
            return None, 0

    def get_fight_details(self, soup: BeautifulSoup) -> Dict:
        """Extract fight details including winner, loser, method, and rounds."""
        names = soup.find_all('div', class_='b-fight-details__person')
        
        winner, loser = None, None
        is_draw = False
        
        for person in names:
            try:
                status_elem = person.find('i', class_='b-fight-details__person-status')
                name_elem = person.find('a', class_="b-fight-details__person-link")
                
                if not status_elem or not name_elem:
                    continue
                    
                status = status_elem.get_text(strip=True)
                name = name_elem.text.strip()
                
                if status == 'W':
                    winner = name
                elif status == 'L':
                    loser = name
                elif status == 'D':
                    is_draw = True
            except Exception:
                pass

        # Get fight method
        method = None
        try:
            method_parent = soup.find('i', class_="b-fight-details__text-item_first")
            if method_parent and len(method_parent.find_all('i')) > 1:
                method = method_parent.find_all('i')[1].get_text(strip=True)
        except Exception:
            pass

        # Get number of rounds
        rounds = None
        try:
            rounds_text = soup.find('p', class_="b-fight-details__text")
            if rounds_text:
                for item in rounds_text.find_all('i', class_="b-fight-details__text-item"):
                    if "Time format:" in item.get_text():
                        rounds_info = item.get_text(strip=True)
                        rounds = "5" if "5 Rnd" in rounds_info else "3"
                        break
        except Exception:
            pass

        return {
            'winner': winner,
            'loser': loser,
            'is_draw': is_draw,
            'method': method,
            'rounds': rounds
        }

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

    async def process_fight(self, session: aiohttp.ClientSession, url: str, index: int) -> bool:
        """Process individual fight data."""
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=15)) as response:
                if response.status != 200:
                    self.errors.append(url)
                    return False
                
                content = await response.text()
                soup = BeautifulSoup(content, 'html.parser')
            
            event_date = await self.get_event_date(session, soup)
            if not event_date:
                return False
            
            striker, strike_diff = self.get_strike_stats(soup)
            if not striker:
                return False
            
            details = self.get_fight_details(soup)
            
            if details['is_draw'] or not details['winner'] or not details['loser']:
                return True  # Not an error, just a draw or incomplete
            
            # Thread-safe update
            async with self.lock:
                self._update_fighter_records(details, event_date, striker, strike_diff)
            
            return True
            
        except Exception as e:
            self.errors.append(url)
            return False

    def _update_fighter_records(self, details: Dict, date: str, striker: str, strike_diff: int):
        """Update fighter records with fight outcome (called under lock)."""
        winner, loser = details['winner'], details['loser']
        is_five_rounds = details['rounds'] == '5'
        
        for fighter in [winner, loser]:
            if fighter not in self.result:
                self.result[fighter] = self.create_fighter_record(fighter)

        method_points = SCORING.get(details['method'], 0)

        # Update winner
        self._add_fight_history(
            winner, date, loser, details['method'],
            method_points,
            strike_diff if striker == winner else 0,
            FIVE_ROUND_BONUS if is_five_rounds else 0
        )

        # Update loser (25 points for loss)
        self._add_fight_history(
            loser, date, winner, details['method'],
            25,
            strike_diff if striker == loser else 0,
            FIVE_ROUND_BONUS if is_five_rounds else 0
        )

    def _add_fight_history(self, fighter: str, date: str, opponent: str, 
                          method: str, method_points: int, strike_bonus: int, 
                          round_bonus: int):
        """Add fight to history and update totals."""
        if method_points > 0 and method in self.result[fighter]:
            self.result[fighter][method] += method_points
        
        self.result[fighter]["StrikeBonus"] += strike_bonus
        self.result[fighter]["5roundBonus"] += round_bonus
        
        self.result[fighter]["fight_history"].append({
            "date": date,
            "opponent": opponent,
            "method": method,
            "method_points": method_points,
            "strike_bonus": strike_bonus,
            "round_bonus": round_bonus,
            "total_points": method_points + strike_bonus + round_bonus
        })

    async def process_batch(self, session: aiohttp.ClientSession, batch: List[Tuple[int, str]]):
        """Process a batch of fights concurrently."""
        tasks = [self.process_fight(session, url, idx) for idx, url in batch]
        await asyncio.gather(*tasks, return_exceptions=True)
        
        self.processed_count += len(batch)
        progress = (self.processed_count / self.total_fights) * 100
        print(f"Progress: {self.processed_count}/{self.total_fights} ({progress:.1f}%)")

    async def process_all_fights(self):
        """Process all fights using async HTTP with connection pooling."""
        print(f"Starting async processing with {MAX_CONCURRENT} concurrent connections...")
        
        connector = aiohttp.TCPConnector(limit=MAX_CONCURRENT, limit_per_host=MAX_CONCURRENT)
        timeout = aiohttp.ClientTimeout(total=30)
        
        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            # Create batches
            fight_urls = [(i, row['fight_url']) for i, row in self.fights.iterrows()]
            
            for i in range(0, len(fight_urls), BATCH_SIZE):
                batch = fight_urls[i:i + BATCH_SIZE]
                await self.process_batch(session, batch)
                
                # Brief pause between batches to avoid overwhelming the server
                await asyncio.sleep(0.1)
        
        print(f"Processing complete! Processed {self.processed_count} fights")

    def save_results(self):
        """Save processed results to CSV files."""
        results_dir = Path(__file__).parent.parent / "results"
        
        final_list = [
            {**{k: v for k, v in fighter.items() if k != 'fight_history'}, 
             "fight_history": fighter["fight_history"]} 
            for fighter in self.result.values()
        ]
        
        df = pd.DataFrame(final_list)
        
        # Save main stats (without fight_history)
        df_stats = df.drop('fight_history', axis=1)
        df_stats.to_csv(results_dir / 'new_final.csv', index=False)
        print(f"Saved fighter stats to new_final.csv")
        
        # Save detailed fight history
        fight_history_rows = []
        for fighter in final_list:
            for fight in fighter['fight_history']:
                fight_row = {
                    'fighter_name': fighter['name'],
                    **fight
                }
                fight_history_rows.append(fight_row)
        
        pd.DataFrame(fight_history_rows).to_csv(results_dir / 'fight_history.csv', index=False)
        print(f"Saved fight history to fight_history.csv")


async def main():
    results_dir = Path(__file__).parent.parent / "results"
    data_dir = Path(__file__).parent.parent / "data"
    
    processor = AsyncFightProcessor(
        str(results_dir / 'all_fights.csv'),
        str(data_dir / 'fighters.csv')
    )
    
    start_time = datetime.now()
    await processor.process_all_fights()
    processor.save_results()
    
    elapsed = (datetime.now() - start_time).total_seconds()
    print(f"\nTotal time: {elapsed:.1f} seconds ({elapsed/60:.1f} minutes)")
    
    if processor.errors:
        print(f"\nEncountered {len(processor.errors)} errors")
        with open(results_dir / 'errors.txt', 'w') as f:
            f.write(f"Encountered {len(processor.errors)} errors:\n")
            for error in processor.errors:
                f.write(f"{error}\n")


if __name__ == "__main__":
    asyncio.run(main())
