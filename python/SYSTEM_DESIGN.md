# UFC Rax Backend Pipeline

## Quick Start

```bash
cd python
uv pip install -r requirements.txt
uv run uvicorn api.main:app --reload --port 8000
```

Then visit **http://localhost:8000/update**, paste your `real-request-token`, and click Run.

### Getting the Token
1. Open https://realsports.io in browser
2. DevTools → Network tab → any API request
3. Copy the `real-request-token` header value

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Web UI (FastAPI)                        │
│                 http://localhost:8000/update            │
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
   ┌───────────┐   ┌───────────┐   ┌───────────┐
   │ Scrape    │   │ Aggregate │   │ Fetch API │
   │ UFC.com   │   │ Values    │   │ Data      │
   └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
         ▼               ▼               ▼
   fight_history    final_values    fighters_values
   .csv             .csv            .json
```

---

## Pipeline Stages

| Stage | Script | Description | Time |
|-------|--------|-------------|------|
| 1 | `add_new_fights.py` | Scrape new fight URLs from UFC.com | ~2 min |
| 2 | `remove_duplicates.py` | Dedupe fight URLs | instant |
| 3 | `process_matches_fast.py` | Scrape fight details, calc Rax points | ~5 min |
| 4 | `aggregate_values.py` | Sum total Rax per fighter | instant |
| 5 | `get_fighter_values.py` | Fetch pass ownership from Real Sports API | ~3 min |

**Total: ~10 min** (down from 20+ min with old `process_matches.py`)

---

## File Structure

```
python/
├── api/                          # Web UI
│   ├── main.py                   # FastAPI server
│   ├── pipeline_runner.py        # Async orchestrator
│   └── templates/update.html     # UI
├── scripts/
│   ├── process_matches_fast.py   # Optimized (30 concurrent)
│   ├── process_matches.py        # Original (5 threads)
│   ├── get_fighter_values.py     # API fetcher
│   ├── aggregate_values.py
│   ├── add_new_fights.py
│   ├── remove_duplicates.py
│   └── config.py                 # API headers
├── results/                      # Output CSVs
│   ├── all_fights.csv
│   ├── new_final.csv
│   ├── fight_history.csv
│   └── final_values.csv
└── requirements.txt
```

---

## Rax Scoring

| Method | Points |
|--------|--------|
| KO/TKO | 100 |
| Submission | 90 |
| Decision (Unanimous) | 80 |
| Decision (Majority) | 75 |
| Decision (Split) | 70 |
| Loss | 25 |
| 5-Round Bonus | +25 |
| Strike Bonus | +1 per strike diff |

---

## Real Sports API

**Base:** `https://web.realsports.io`

| Endpoint | Purpose |
|----------|---------|
| `/userpassshop/ufc/season/2023/entity/team/section/hotseason` | Fighter pass counts |
| `/userpasses/ufc/type/team/entity/{id}/leaderboard` | Pass distribution by tier |
| `/teams/{id}/sport/ufc` | Fighter age/DOB |

**Auth:** Requires `real-request-token` header (expires periodically).

---

## Output Data

### `fighters_values.json`
```json
{
  "Fighter Name": {
    "value": "123",
    "id": 1234,
    "pass_distribution": { "7": 5, "6": 10, "5": 20, "4": 30 },
    "age": 32
  }
}
```

### `fight_history.csv`
| fighter_name | date | opponent | method | method_points | strike_bonus | round_bonus | total_points |
|--------------|------|----------|--------|---------------|--------------|-------------|--------------|

---

## Manual CLI Usage

If you prefer running scripts manually:

```bash
cd python/scripts
uv run python add_new_fights.py
uv run python remove_duplicates.py
uv run python process_matches_fast.py
uv run python aggregate_values.py
# Update token in config.py first:
uv run python get_fighter_values.py
```

Then in project root:
```bash
npm run process
```
