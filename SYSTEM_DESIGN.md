# UFC Rax V2 - System Design Document

## Overview
UFC Rax V2 is a Next.js 15 web application for analyzing and tracking UFC fighter performance values (RAX). It helps users evaluate fighters based on historical fight scores, ownership statistics, and projected yearly returns with configurable multipliers.

## Tech Stack
- **Framework**: Next.js 15.1.2 with React 19, App Router
- **Language**: TypeScript 5.7
- **Styling**: Tailwind CSS 3.4
- **Analytics**: Vercel Analytics
- **Icons**: Lucide React
- **Build**: Turbopack (dev), Next.js (prod)

## Project Structure

```
ufc_rax_v2/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout with Vercel Analytics
│   │   ├── page.tsx            # Main page (client component)
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── SearchBar.tsx       # Debounced fighter search input
│   │   ├── FighterComparison.tsx  # Side-by-side fighter comparison view
│   │   ├── FighterModal.tsx    # Fighter detail modal (monthly/daily/calendar views)
│   │   ├── FighterCalendar.tsx # Calendar visualization of fighter scores
│   │   ├── MultipleCalendar.tsx # Combined calendar for multiple fighters
│   │   ├── Recommendations.tsx # Fighter recommendation engine with conflict detection
│   │   ├── ChangelogModal.tsx  # App changelog display
│   │   └── PassDistributionModal.tsx # Pass ownership distribution modal
│   ├── hooks/
│   │   └── useDebounce.ts      # Generic debounce hook
│   ├── types/
│   │   ├── fighters.ts         # Fighter, Score, PassDistribution interfaces
│   │   └── app.ts              # App-level types (ViewType)
│   ├── utils/
│   │   ├── calculations.ts     # RAX value calculation logic
│   │   └── processFighters.ts  # CSV → JSON data processing (build-time)
│   └── index.ts                # Data processing entry point (npm run process)
├── public/data/
│   ├── processed_fighters.json # Primary fighter data (generated)
│   ├── fighters_values.json    # Pass ownership & distribution data
│   └── players_values.json     # Additional player value data
├── data/                       # Raw CSV data files
├── python/                     # Python data scraping/processing scripts
└── package.json
```

## Data Flow

### Build-Time Processing
```
python/results/*.csv → npm run process → public/data/processed_fighters.json
```

1. Python scripts scrape/generate fight data into `python/results/`
2. `npm run process` runs `src/index.ts`:
   - Copies CSVs from `python/results/` to `data/`
   - Calls `processFighterData()` to merge:
     - Fighter values (`final_values.csv`)
     - Fight history (`fight_history.csv`)
     - Pass ownership (`fighters_values.json`)
   - Outputs `processed_fighters.json`

### Runtime Data
- `processed_fighters.json` is imported directly into `page.tsx`
- No API routes - fully static data loaded at build time
- User preferences (multipliers, selected fighters) stored in localStorage

## Core Data Types

```typescript
interface Fighter {
  name: string;
  value: number;               // Base RAX value
  scores: Score[];             // Historical fight scores
  active: boolean;             // Active fighter status (fought in last 2 years)
  ownedPasses: number;         // Total passes owned
  id: number;
  passDistribution: PassDistribution;  // Pass tier breakdown
  age?: number;
}

interface Score {
  date: string;                // "YYYY-MM-DD"
  value: number;               // Points earned from fight
}

interface PassDistribution {
  7: number;  // Tier 7 passes
  6: number;  // Tier 6 passes
  5: number;  // Tier 5 passes
  4: number;  // Tier 4 passes
}
```

## Key Features & Components

### 1. Rankings View (Default)
- Sortable table by: name, RAX value, passes, age, fights
- Infinite scroll with IntersectionObserver
- "Active Only" filter toggle
- Per-fighter multiplier selection (1.2x - 6.0x)
- Color-coded metrics (green=good, red=warning)

### 2. Compare View
- Side-by-side fighter comparison
- Debounced search (300ms)
- Monthly score breakdown
- Shared multiplier state

### 3. Recommendations View ("Who to Buy")
- Select up to 15 fighters to build a portfolio
- AI-recommended fighters based on value score formula:
  ```
  valueScore = (RAX / log₁₀(owners)²) × (active ? 1.2 : 1)
  ```
- Claim conflict detection (max 2 fighters can claim same MM-DD)
- Lost value calculation for overlapping dates
- Calendar visualization of combined holdings
- Persists selections to localStorage

### 4. Fighter Modal
- Detailed breakdown: Monthly | Daily | Calendar views
- FighterCalendar component shows heatmap of fight dates

## RAX Calculation Logic

```typescript
// From utils/calculations.ts
function calculateDailyAdjustedValue(fighter: Fighter, multiplier: number = 1.2) {
  // Group by MM-DD, keep only highest score per day
  // Sum all unique day scores × multiplier
  // Returns: projected yearly RAX value
}
```

Key insight: Multiple fights on the same calendar day (MM-DD across years) only count the highest score once.

## Multiplier System
Multipliers represent pass tier bonuses:
- 1.2x (Blue) - Base tier
- 1.4x (Green)
- 1.6x (Orange)
- 2.0x (Red)
- 2.5x (Purple)
- 4.0x (Yellow)
- 6.0x (Pink) - Premium tier

Stored per-fighter in localStorage (`selectedMultipliersV1`).

## State Management
- React useState for all UI state
- localStorage for persistence:
  - `selectedMultipliersV1`: Fighter → multiplier mapping
  - `selectedFightersV1`: Recommendation portfolio names
- No external state library (Redux, Zustand, etc.)

## Performance Optimizations
- Debounced search inputs (300ms)
- useMemo for filtered/sorted fighter lists
- Infinite scroll (50 fighters per page)
- Client-side only (static JSON import)

## Active Status Logic
```typescript
// Fighter is active if:
// 1. Has fought within last 2 years, AND
// 2. Not in activeOverrides list (retired fighters)
const activeOverrides = [
  { name: "Jon Jones", active: false },
  { name: "Jose Aldo", active: false },
  // ... more retirements
];
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with Turbopack |
| `npm run build` | Production build |
| `npm run process` | Regenerate processed_fighters.json from CSVs |
| `npm run lint` | ESLint check |

## Future Agent Guidelines

1. **Adding new fighter data**: Update CSVs in `python/results/`, run `npm run process`
2. **Modifying calculations**: Edit `src/utils/calculations.ts`
3. **Adding new views**: Create component in `src/components/`, add to ViewType in `src/types/app.ts`, wire up in `page.tsx`
4. **Updating retirement list**: Edit `activeOverrides` in `processFighters.ts`
5. **Styling**: Tailwind classes only, dark theme (bg-[#1a1a1a], text-gray-*)
6. **Data shape changes**: Update `src/types/fighters.ts` first, then fix TypeScript errors
