# UFC Rax Backend Pipeline - System Design Document

## Overview

The UFC Rax backend pipeline is a data processing system that calculates Rax points for UFC fighters based on fight outcomes, scrapes fight data from UFC.com, and fetches real-time owned pass data from the Real Sports API. The system transforms raw fight data into structured fighter statistics and rankings.

## Architecture

```
┌─────────────────┐
│  Input Data     │
│  - all_fights   │
│    .csv         │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│              Pipeline Orchestrator                       │
│              (pipeline.py)                              │
└────────┬────────────────────────────────────────────────┘
         │
         ├─────────────────┬──────────────────┬──────────────┐
         ▼                 ▼                  ▼              ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Process     │  │  Aggregate   │  │  Get Values │  │  Update      │
│  Matches     │  │  Values      │  │  from API   │  │  Pass Dist   │
│              │  │              │  │              │  │  (optional)  │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                  │                 │
       ▼                 ▼                  ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  new_final  │  │  final_values│  │ fighters_    │  │ fighters_    │
│  .csv       │  │  .csv        │  │ values.json  │  │ values.json  │
│  fight_     │  │              │  │              │  │ (updated)    │
│  history.csv│  │              │  │              │  │              │
└─────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

## Data Flow

### Stage 1: Fight Processing (`process_matches.py`)

**Input:**
- `python/results/all_fights.csv` - List of fight URLs

**Process:**
1. Reads fight URLs from CSV
2. Scrapes each fight page from UFC.com using BeautifulSoup
3. Extracts:
   - Winner/Loser
   - Fight method (KO/TKO, Submission, Decision type)
   - Significant strike statistics
   - Number of rounds (3 vs 5)
   - Event date
4. Calculates Rax points:
   - Method points (100/90/80/75/70)
   - Strike bonus (1 point per strike difference)
   - 5-round bonus (25 points)
5. Updates fighter records with cumulative statistics

**Output:**
- `python/results/new_final.csv` - Fighter statistics (wins by method, bonuses)
- `python/results/fight_history.csv` - Detailed fight-by-fight history

**Performance:**
- Uses ThreadPoolExecutor with 5 workers for parallel processing
- Handles errors gracefully, continues processing remaining fights
- Saves errors to `python/results/errors.txt`

### Stage 2: Value Aggregation (`aggregate_values.py`)

**Input:**
- `python/results/new_final.csv`

**Process:**
1. Reads fighter statistics
2. Calculates total Value:
   ```
   Value = KO/TKO + Submission + Decisions + StrikeBonus + 5roundBonus
   ```
3. Sorts fighters by total Value (descending)

**Output:**
- `python/results/final_values.csv` - Fighter names and total Rax values

### Stage 3: API Data Fetching (`get_fighter_values.py`)

**Input:**
- Existing `public/data/fighters_values.json` (if available)

**Process:**
1. **Fetch Fighter Values:**
   - Calls Real Sports API: `/userpassshop/ufc/season/2023/entity/team/section/hotseason`
   - Paginates through results (20 items per page, up to 1500 offset)
   - Extracts: fighter name, total owned passes (value), fighter ID
   - Always refreshes values (not just on first run)

2. **Fetch Pass Distribution:**
   - For each fighter, calls: `/userpasses/ufc/type/team/entity/{id}/leaderboard`
   - Counts passes by level (3, 4, 5, 6, 7)
   - Paginates until finding level 2 passes (end marker)

3. **Fetch Fighter Age:**
   - Calls: `/teams/{id}/sport/ufc`
   - Extracts DOB from team details
   - Calculates age

**Output:**
- `public/data/fighters_values.json` - Complete fighter data:
  ```json
  {
    "Fighter Name": {
      "value": "123",           // Total owned passes
      "id": 1234,               // Fighter ID
      "pass_distribution": {    // Passes by level
        "7": 5,
        "6": 10,
        "5": 20,
        "4": 30,
        "3": 50
      },
      "age": 32                 // Optional
    }
  }
  ```

**Performance:**
- Uses async/await with aiohttp for concurrent requests
- Batch processing (5-10 fighters per batch)
- Saves progress incrementally every 50 fighters
- Rate limiting: 0.1-0.2s delays between requests

### Stage 4: Pass Distribution Retry (`update_pass_distribution.py`) - Optional

**Use Case:** Retry failed pass distribution updates after rate limiting

**Input:**
- `public/data/fighters_values.json`

**Process:**
- Only updates pass distribution and age (doesn't re-fetch values)
- Better error handling:
  - Exponential backoff for 429 errors (2s, 4s, 8s)
  - Gracefully skips 401 errors
  - Tracks failed fighters for manual retry
- Smaller batch size (5) to reduce rate limiting

**Output:**
- Updated `public/data/fighters_values.json`

## Components

### 1. FightProcessor (`process_matches.py`)

**Responsibilities:**
- Web scraping UFC fight pages
- Extracting fight details
- Calculating Rax points
- Managing fighter records

**Key Methods:**
- `process_fight()` - Processes individual fight
- `get_fight_details()` - Extracts winner, method, rounds
- `get_strike_stats()` - Extracts strike statistics
- `calculate_points()` - Calculates Rax points
- `update_fight_history()` - Updates fighter records

**Dependencies:**
- requests (HTTP)
- BeautifulSoup (HTML parsing)
- pandas (data manipulation)
- ThreadPoolExecutor (parallel processing)

### 2. Value Aggregator (`aggregate_values.py`)

**Responsibilities:**
- Summing Rax points across categories
- Sorting fighters by total value

**Dependencies:**
- pandas

### 3. API Data Fetcher (`get_fighter_values.py`)

**Responsibilities:**
- Fetching owned passes from Real Sports API
- Fetching pass distribution
- Fetching fighter age
- Managing API rate limits

**Key Functions:**
- `get_fighters_page()` - Fetches paginated fighter values
- `get_fighter_passes()` - Fetches pass distribution
- `get_fighter_age()` - Fetches fighter age
- `process_batch()` - Processes batches of fighters
- `process_pass_batch()` - Processes pass distribution batches

**Dependencies:**
- aiohttp (async HTTP)
- asyncio (async operations)
- tqdm (progress bars)

### 4. Pass Distribution Updater (`update_pass_distribution.py`)

**Responsibilities:**
- Retrying failed pass distribution updates
- Better error handling for rate limits

**Dependencies:**
- Same as API Data Fetcher

## Data Models

### Fighter Record (from `process_matches.py`)

```python
{
    "name": str,
    "KO/TKO": int,                    # Total Rax from KO/TKO wins
    "Submission": int,                # Total Rax from Submission wins
    "Decision - Unanimous": int,      # Total Rax from Unanimous wins
    "Decision - Majority": int,       # Total Rax from Majority wins
    "Decision - Split": int,          # Total Rax from Split wins
    "StrikeBonus": int,               # Total strike bonus points
    "5roundBonus": int,               # Total 5-round bonus points
    "fight_history": [                 # Detailed fight history
        {
            "date": str,              # YYYY-MM-DD
            "opponent": str,
            "method": str,
            "method_points": int,
            "strike_bonus": int,
            "round_bonus": int,
            "total_points": int
        }
    ]
}
```

### Fighter Values (from `get_fighter_values.py`)

```python
{
    "Fighter Name": {
        "value": str,                 # Total owned passes (string)
        "id": int,                     # Fighter ID from API
        "pass_distribution": {
            "7": int,                 # Level 7 passes
            "6": int,                 # Level 6 passes
            "5": int,                 # Level 5 passes
            "4": int,                 # Level 4 passes
            "3": int                  # Level 3 passes
        },
        "age": int                     # Optional
    }
}
```

## External APIs

### Real Sports API

**Base URL:** `https://web.realsports.io`

**Endpoints:**

1. **Fighter Values**
   - `GET /userpassshop/ufc/season/2023/entity/team/section/hotseason?before={offset}`
   - Returns: Paginated list of fighters with owned pass counts
   - Pagination: 20 items per page, offset increments by 20

2. **Pass Distribution**
   - `GET /userpasses/ufc/type/team/entity/{fighter_id}/leaderboard?before={offset}&season=2023&sort=boostvalue`
   - Returns: List of passes owned by users, sorted by boost value
   - Pagination: 20 items per page
   - Stop condition: Level 2 passes indicate end

3. **Fighter Details**
   - `GET /teams/{fighter_id}/sport/ufc`
   - Returns: Fighter details including DOB

**Authentication:**
- Headers defined in `config.py`
- Key header: `real-request-token` (must be updated when expired)
- Other headers: `real-auth-info`, `real-device-uuid`, etc.

**Rate Limiting:**
- HTTP 429: Too Many Requests
- HTTP 401: Unauthorized (token expired)

### UFC.com

**Scraping:**
- Fight detail pages
- Uses BeautifulSoup to parse HTML
- Extracts: winner, method, strikes, rounds, date

## Error Handling

### Fight Processing Errors

- **Failed Scrapes:** Logged to `python/results/errors.txt`, processing continues
- **Missing Data:** Skips fight, logs error
- **Network Errors:** Retries with timeout (10s)

### API Errors

- **429 (Rate Limit):**
  - `get_fighter_values.py`: Prints error, continues
  - `update_pass_distribution.py`: Exponential backoff retry (2s, 4s, 8s)

- **401 (Unauthorized):**
  - `get_fighter_values.py`: Prints error, continues
  - `update_pass_distribution.py`: Skips fighter gracefully

- **Other Errors:**
  - Logged and processing continues
  - Failed fighters can be retried manually

### Progress Saving

- `get_fighter_values.py`: Saves to `fighters_values_partial.json` every 50 fighters
- On failure, can resume from partial file
- Final save overwrites partial file

## Performance Considerations

### Parallel Processing

- **Fight Processing:** 5 concurrent threads
- **API Fetching:** Async/await with batch processing (5-10 fighters)

### Rate Limiting

- Delays between requests: 0.1-0.2s
- Batch size: 5-10 fighters
- Exponential backoff for retries

### Data Volume

- ~1,200 fighters
- ~10,000+ fights
- Processing time: ~3-5 minutes for full pipeline

### Scalability

- Can process incrementally (only new fights)
- Progress saving allows resumption
- Pass distribution can be updated separately

## Configuration

### API Headers (`config.py`)

```python
HEADERS = {
    'real-request-token': '...',      # Must be updated when expired
    'real-auth-info': '...',
    'real-device-uuid': '...',
    # ... other headers
}
```

**Updating:**
1. Open browser DevTools → Network tab
2. Make request to Real Sports API
3. Copy `real-request-token` header
4. Update `config.py`

### Scoring Constants (`process_matches.py`)

```python
SCORING = {
    "KO/TKO": 100,
    "Submission": 90,
    "Decision - Unanimous": 80,
    "Decision - Majority": 75,
    "Decision - Split": 70
}
FIVE_ROUND_BONUS = 25
```

## File Structure

```
python/
├── data/                          # Input data
│   ├── fighters.csv              # Fighter names list
│   └── ...
├── results/                      # Generated output
│   ├── all_fights.csv            # Input: Fight URLs
│   ├── new_final.csv             # Output: Fighter stats
│   ├── fight_history.csv         # Output: Detailed history
│   ├── final_values.csv          # Output: Total Rax values
│   └── errors.txt                # Processing errors
├── scripts/                      # Processing scripts
│   ├── process_matches.py        # Stage 1: Fight processing
│   ├── aggregate_values.py      # Stage 2: Value aggregation
│   ├── get_fighter_values.py     # Stage 3: API data fetching
│   ├── update_pass_distribution.py  # Stage 4: Retry tool
│   └── config.py                # API configuration
└── pipeline.py                   # Orchestrator
```

## Dependencies

```txt
requests          # HTTP requests for scraping
beautifulsoup4    # HTML parsing
pandas           # Data manipulation
aiohttp          # Async HTTP for API calls
tqdm             # Progress bars
```

## Future Improvements

1. **Database Integration:** Replace CSV files with database
2. **Scheduled Updates:** Automate pipeline runs
3. **Better Error Recovery:** More robust retry logic
4. **Caching:** Cache API responses to reduce rate limiting
5. **Monitoring:** Add logging and metrics
6. **Incremental Updates:** Only process new fights since last run

