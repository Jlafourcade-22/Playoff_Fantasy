-- Add 2-point conversion tracking fields to player_roster table
-- These fields allow manual tracking of 2PT conversions that won't be overwritten by API updates

ALTER TABLE player_roster
ADD COLUMN IF NOT EXISTS two_point_wildcard INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS two_point_divisional INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS two_point_championship INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS two_point_superbowl INTEGER DEFAULT 0;

-- Add comments
COMMENT ON COLUMN player_roster.two_point_wildcard IS 'Manual 2-point conversion count for wildcard round (each worth 2 points)';
COMMENT ON COLUMN player_roster.two_point_divisional IS 'Manual 2-point conversion count for divisional round (each worth 2 points)';
COMMENT ON COLUMN player_roster.two_point_championship IS 'Manual 2-point conversion count for championship round (each worth 2 points)';
COMMENT ON COLUMN player_roster.two_point_superbowl IS 'Manual 2-point conversion count for superbowl round (each worth 2 points)';
