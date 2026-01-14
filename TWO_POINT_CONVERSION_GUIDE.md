# Manual 2-Point Conversion Tracking

## Overview
Since the ESPN API does not include 2-point conversion data, we've implemented a manual tracking system that allows you to add 2PT conversions without interfering with the automatic ESPN score updates.

## Database Structure

### Fields Added
Four new INTEGER fields in the `player_roster` table:
- `two_point_wildcard` (default: 0)
- `two_point_divisional` (default: 0)
- `two_point_championship` (default: 0)
- `two_point_superbowl` (default: 0)

### How It Works
1. ESPN API updates the `score_wildcard`, `score_divisional`, etc. fields with calculated fantasy points (without 2PT)
2. Manual 2PT conversions are stored separately in `two_point_wildcard`, etc.
3. When retrieving data, total score = `score_[round]` + (`two_point_[round]` × 2)
4. This prevents ESPN updates from overwriting manual entries

## API Endpoint

### Update 2PT Conversions
```
PUT /api/fantasy-data/:teamName/two-point
```

**Request Body:**
```json
{
  "round": "wildcard",      // wildcard|divisional|championship|superbowl
  "playerIndex": 0,         // 0-7 (roster position)
  "twoPtCount": 1          // Number of 2PT conversions (0 or more)
}
```

**Response:**
```json
{
  "success": true,
  "message": "Updated Patrick Mahomes 2PT conversions to 1 for wildcard round",
  "data": { ... }  // Full updated team data
}
```

## Frontend Usage

### Manual Entry via Modal
1. Click on any player's score in the standings table
2. The scoring breakdown modal opens
3. At the top, there's a "Manual 2PT Conversions" input field
4. Enter the number of 2PT conversions (0 or more)
5. Click "Save"
6. The page automatically refreshes to show updated scores

### Display in Breakdown
- Manual 2PT conversions appear in the breakdown modal with a blue highlight
- Shows: "2-Point Conversions (Manual)"
- Calculation: `{count} × 2`
- Points shown in green with a + sign

## Scoring Calculation

### From fantasyPoints.js
2-point conversions are worth **2 points** each.

### Total Score Formula
```javascript
// For each round (e.g., wildcard):
totalScore = score_wildcard + (two_point_wildcard × 2)
```

### Example
- Player's ESPN score: 24.5 points
- Manual 2PT conversions: 1
- **Total displayed**: 26.5 points (24.5 + 2)

## Database Migration

Run this SQL to add the fields to an existing database:
```sql
ALTER TABLE player_roster 
  ADD COLUMN two_point_wildcard INTEGER DEFAULT 0,
  ADD COLUMN two_point_divisional INTEGER DEFAULT 0,
  ADD COLUMN two_point_championship INTEGER DEFAULT 0,
  ADD COLUMN two_point_superbowl INTEGER DEFAULT 0;
```

See `add_two_point_conversion_fields.sql` for the full migration file.

## Important Notes

1. **ESPN Updates Are Safe**: When you run `/api/update-scores-espn/:round`, it ONLY updates the `score_[round]` field. Your manual 2PT entries remain intact.

2. **Zero vs NULL**: 
   - `NULL` in `score_[round]` = game hasn't been played yet
   - `0` in `two_point_[round]` = no 2PT conversions (default)

3. **Validation**:
   - `twoPtCount` must be non-negative (0 or more)
   - `playerIndex` must be 0-7
   - Values are stored as integers

4. **Breakdown Display**:
   - API-based stats (passing, rushing, etc.) show first
   - Manual 2PT conversions show with blue highlight if > 0
   - Total includes both API and manual points

## Future Enhancements

Potential improvements:
- Bulk 2PT entry for entire team at once
- Import 2PT data from CSV
- Historical tracking of when 2PT entries were made
- Ability to add notes/context to 2PT conversions
