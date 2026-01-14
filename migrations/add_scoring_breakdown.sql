-- Add scoring breakdown JSON fields to player_roster table
-- This stores the detailed scoring breakdown for each round

ALTER TABLE player_roster
ADD COLUMN IF NOT EXISTS scoring_breakdown_wildcard JSONB,
ADD COLUMN IF NOT EXISTS scoring_breakdown_divisional JSONB,
ADD COLUMN IF NOT EXISTS scoring_breakdown_championship JSONB,
ADD COLUMN IF NOT EXISTS scoring_breakdown_superbowl JSONB;

-- Add comments to document the JSON structure
COMMENT ON COLUMN player_roster.scoring_breakdown_wildcard IS 'JSON object containing scoring breakdown for wildcard round. Example: {"passing_yards": {"stat": "98 yds", "points": 3.92}, "rushing_yards": {"stat": "45 yds", "points": 4.5}, "receptions": {"stat": "5 rec", "points": 5.0}}';
COMMENT ON COLUMN player_roster.scoring_breakdown_divisional IS 'JSON object containing scoring breakdown for divisional round';
COMMENT ON COLUMN player_roster.scoring_breakdown_championship IS 'JSON object containing scoring breakdown for championship round';
COMMENT ON COLUMN player_roster.scoring_breakdown_superbowl IS 'JSON object containing scoring breakdown for superbowl round';
