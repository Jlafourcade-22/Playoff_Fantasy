-- Add scoring breakdown JSON fields to existing player_roster table

ALTER TABLE player_roster
ADD COLUMN IF NOT EXISTS scoring_breakdown_wildcard JSONB,
ADD COLUMN IF NOT EXISTS scoring_breakdown_divisional JSONB,
ADD COLUMN IF NOT EXISTS scoring_breakdown_championship JSONB,
ADD COLUMN IF NOT EXISTS scoring_breakdown_superbowl JSONB;

-- Add comments to document the JSON structure
COMMENT ON COLUMN player_roster.scoring_breakdown_wildcard IS 'JSON object containing scoring breakdown for wildcard round. Example: {"passing_yards": {"stat": "98 yds", "calculation": "98 × 0.04", "points": 3.92}}';
COMMENT ON COLUMN player_roster.scoring_breakdown_divisional IS 'JSON object containing scoring breakdown for divisional round';
COMMENT ON COLUMN player_roster.scoring_breakdown_championship IS 'JSON object containing scoring breakdown for championship round';
COMMENT ON COLUMN player_roster.scoring_breakdown_superbowl IS 'JSON object containing scoring breakdown for superbowl round';
