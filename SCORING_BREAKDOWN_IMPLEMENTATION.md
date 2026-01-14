# Scoring Breakdown Implementation Summary

## Changes Made

### 1. Database Schema Updates

**File: `migrations/add_scoring_breakdown.sql`** (New)
- Added 4 new JSONB columns to `player_roster` table:
  - `scoring_breakdown_wildcard`
  - `scoring_breakdown_divisional`
  - `scoring_breakdown_championship`
  - `scoring_breakdown_superbowl`

**File: `supabase_schema.sql`** (Updated)
- Added scoring breakdown columns to the CREATE TABLE statement
- Added documentation comments explaining the JSON structure

### 2. Fantasy Points Calculation Refactor

**File: `utils/fantasyPoints.js`** (Updated)
- Completely rewrote `calculateFantasyPoints()` function
- Now returns an object with:
  - `points`: Total fantasy points (number)
  - `breakdown`: Object containing only non-zero scoring categories

**Breakdown Format:**
```json
{
  "passing_yards": {
    "stat": "98 yds",
    "calculation": "98 × 0.04",
    "points": 3.92
  },
  "rushing_tds": {
    "stat": "2 TD",
    "calculation": "2 × 6",
    "points": 12.0
  }
}
```

**Categories included (only if non-zero):**
- `passing_yards` (0.04 per yard)
- `passing_tds` (6 points each)
- `interceptions` (-2 points each)
- `rushing_yards` (0.1 per yard)
- `rushing_tds` (6 points each)
- `receptions` (1 point each - PPR)
- `receiving_yards` (0.1 per yard)
- `receiving_tds` (6 points each)
- `fumbles_lost` (-2 points each)
- `two_point_conversions` (2 points each)

### 3. Database Functions

**File: `data/supabaseDb.js`** (Updated)
- Added new function: `updatePlayerScoreWithBreakdown(teamName, round, playerIndex, score, breakdown)`
  - Updates both the score and scoring breakdown for a specific player
  - Stores breakdown as JSONB in database
- Exported the new function for use in endpoints

### 4. API Endpoints Updated

**File: `server.js`** (Updated)

All score update endpoints now:
1. Call `calculateFantasyPoints()` and destructure `{ points, breakdown }`
2. Call `updatePlayerScoreWithBreakdown()` to save both score and breakdown
3. Return breakdown in API response instead of raw stats

**Updated Endpoints:**
- `GET /api/update-scores/:round` - SportsData.io active games
- `GET /api/update-scores-all/:round` - SportsData.io all games
- `GET /api/update-scores-espn/:round` - ESPN active games
- `GET /api/update-scores-all-espn/:round` - ESPN all games

## Database Migration

To apply the changes to your Supabase database, run:

```sql
-- Execute the migration file
ALTER TABLE player_roster
ADD COLUMN IF NOT EXISTS scoring_breakdown_wildcard JSONB,
ADD COLUMN IF NOT EXISTS scoring_breakdown_divisional JSONB,
ADD COLUMN IF NOT EXISTS scoring_breakdown_championship JSONB,
ADD COLUMN IF NOT EXISTS scoring_breakdown_superbowl JSONB;
```

Or simply execute: `migrations/add_scoring_breakdown.sql`

## Benefits

1. **Clean Storage**: Only non-zero stats are stored, reducing JSON size
2. **User-Friendly**: Each breakdown entry shows the stat, calculation, and points
3. **Flexible**: Can easily add new scoring categories in the future
4. **Backwards Compatible**: Existing score columns remain unchanged
5. **Detailed Tracking**: Full transparency on how each point was scored

## Example API Response

```json
{
  "team": "Brady",
  "player": "Jalen Hurts",
  "nflTeam": "PHI",
  "previousScore": 14.12,
  "newScore": 14.12,
  "breakdown": {
    "passing_yards": {
      "stat": "178 yds",
      "calculation": "178 × 0.04",
      "points": 7.12
    },
    "passing_tds": {
      "stat": "1 TD",
      "calculation": "1 × 6",
      "points": 6.0
    },
    "rushing_yards": {
      "stat": "10 yds",
      "calculation": "10 × 0.1",
      "points": 1.0
    }
  },
  "updated": true
}
```
