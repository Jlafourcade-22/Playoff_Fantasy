-- Playoff Fantasy Database Schema for Supabase
-- Generated on 2026-01-13

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS team_rankings CASCADE;
DROP TABLE IF EXISTS player_roster CASCADE;
DROP TABLE IF EXISTS fantasy_teams CASCADE;
DROP TABLE IF EXISTS team_probabilities CASCADE;
DROP TABLE IF EXISTS nfl_games CASCADE;
DROP TABLE IF EXISTS eliminated_teams CASCADE;
DROP TABLE IF EXISTS last_updated CASCADE;

-- NFL Games table
CREATE TABLE nfl_games (
  id SERIAL PRIMARY KEY,
  round VARCHAR(50) NOT NULL,
  home_team VARCHAR(10) NOT NULL,
  away_team VARCHAR(10) NOT NULL,
  game_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Eliminated Teams table
CREATE TABLE eliminated_teams (
  id SERIAL PRIMARY KEY,
  team_code VARCHAR(10) NOT NULL UNIQUE,
  eliminated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Probabilities table (stores playoff advancement probabilities)
CREATE TABLE team_probabilities (
  id SERIAL PRIMARY KEY,
  team_code VARCHAR(10) NOT NULL UNIQUE,
  wildcard_prob DECIMAL(5,3) NOT NULL DEFAULT 0,
  divisional_prob DECIMAL(5,3) NOT NULL DEFAULT 0,
  championship_prob DECIMAL(5,3) NOT NULL DEFAULT 0,
  superbowl_prob DECIMAL(5,3) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fantasy Teams table
CREATE TABLE fantasy_teams (
  id SERIAL PRIMARY KEY,
  team_name VARCHAR(100) NOT NULL UNIQUE,
  coach VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player Roster table
CREATE TABLE player_roster (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  slot VARCHAR(10) NOT NULL,
  player_name VARCHAR(100) NOT NULL,
  draft_round INTEGER NOT NULL,
  nfl_team VARCHAR(10) NOT NULL,
  roster_order INTEGER NOT NULL,
  
  -- Scores by round (nullable for future rounds)
  score_wildcard DECIMAL(6,2),
  score_divisional DECIMAL(6,2),
  score_championship DECIMAL(6,2),
  score_superbowl DECIMAL(6,2),
  
  -- Expected Points by round
  expected_wildcard DECIMAL(6,2) DEFAULT 0,
  expected_divisional DECIMAL(6,2) DEFAULT 0,
  expected_championship DECIMAL(6,2) DEFAULT 0,
  expected_superbowl DECIMAL(6,2) DEFAULT 0,
  
  -- Projected Points by round
  projected_wildcard DECIMAL(6,2) DEFAULT 0,
  projected_divisional DECIMAL(6,2) DEFAULT 0,
  projected_championship DECIMAL(6,2) DEFAULT 0,
  projected_superbowl DECIMAL(6,2) DEFAULT 0,
  
  -- Variance by round
  variance_wildcard DECIMAL(8,2) DEFAULT 0,
  variance_divisional DECIMAL(8,2) DEFAULT 0,
  variance_championship DECIMAL(8,2) DEFAULT 0,
  variance_superbowl DECIMAL(8,2) DEFAULT 0,
  
  -- Scoring breakdown by round (JSON)
  scoring_breakdown_wildcard JSONB,
  scoring_breakdown_divisional JSONB,
  scoring_breakdown_championship JSONB,
  scoring_breakdown_superbowl JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Rankings table (stores overall team statistics and probabilities)
CREATE TABLE team_rankings (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE UNIQUE,
  expected_total DECIMAL(8,2) NOT NULL DEFAULT 0,
  
  -- Finish probabilities (percentage for each place 1-8)
  finish_1st DECIMAL(5,2) DEFAULT 0,
  finish_2nd DECIMAL(5,2) DEFAULT 0,
  finish_3rd DECIMAL(5,2) DEFAULT 0,
  finish_4th DECIMAL(5,2) DEFAULT 0,
  finish_5th DECIMAL(5,2) DEFAULT 0,
  finish_6th DECIMAL(5,2) DEFAULT 0,
  finish_7th DECIMAL(5,2) DEFAULT 0,
  finish_8th DECIMAL(5,2) DEFAULT 0,
  
  win_probability DECIMAL(5,2) DEFAULT 0,
  top3_probability DECIMAL(5,2) DEFAULT 0,
  last_place_probability DECIMAL(5,2) DEFAULT 0,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Last Updated tracking table
CREATE TABLE last_updated (
  id SERIAL PRIMARY KEY,
  update_type VARCHAR(50) NOT NULL UNIQUE,
  updated_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_nfl_games_round ON nfl_games(round);
CREATE INDEX idx_player_roster_team_id ON player_roster(team_id);
CREATE INDEX idx_player_roster_nfl_team ON player_roster(nfl_team);
CREATE INDEX idx_team_probabilities_code ON team_probabilities(team_code);
CREATE INDEX idx_fantasy_teams_name ON fantasy_teams(team_name);

-- Insert NFL Games data
INSERT INTO nfl_games (round, home_team, away_team, game_time) VALUES
('wildcard', 'CAR', 'LAR', '2026-01-10T21:30:00Z'),
('wildcard', 'CHI', 'GB', '2026-01-11T01:00:00Z'),
('wildcard', 'JAX', 'BUF', '2026-01-11T18:00:00Z'),
('wildcard', 'PHI', 'SF', '2026-01-11T21:30:00Z'),
('wildcard', 'NE', 'LAC', '2026-01-12T01:00:00Z'),
('wildcard', 'PIT', 'HOU', '2026-01-13T01:00:00Z');

-- Insert Eliminated Teams
INSERT INTO eliminated_teams (team_code) VALUES
('PHI'), ('JAX'), ('CAR'), ('GB'), ('PIT'), ('LAC');

-- Insert Team Probabilities
INSERT INTO team_probabilities (team_code, wildcard_prob, divisional_prob, championship_prob, superbowl_prob) VALUES
('PHI', 1.000, 0.000, 0.000, 0.000),
('BUF', 1.000, 1.000, 0.519, 0.270),
('LAR', 1.000, 1.000, 0.672, 0.367),
('CHI', 1.000, 1.000, 0.367, 0.141),
('GB', 1.000, 0.000, 0.000, 0.000),
('JAX', 1.000, 0.000, 0.000, 0.000),
('SF', 1.000, 1.000, 0.263, 0.877),
('NE', 1.000, 1.000, 0.618, 0.313),
('LAC', 1.000, 0.000, 0.000, 0.000),
('PIT', 1.000, 0.000, 0.000, 0.000),
('HOU', 1.000, 1.000, 0.424, 0.213),
('CAR', 1.000, 0.000, 0.000, 0.000),
('SEA', 0.000, 1.000, 0.778, 0.455),
('DEN', 0.000, 1.000, 0.519, 0.263);

-- Insert Fantasy Teams
INSERT INTO fantasy_teams (team_name, coach) VALUES
('Brady', 'Top Coon'),
('Robbie', 'Emeka Egbuka'),
('Cody', 'Jonathon Mingo'),
('Patrick', 'Tyler Shough'),
('Dylan', 'Treylon ''Burk Me'' Burks'),
('Colin Quality Learing Center', 'Jacory Croskey-Merritt'),
('Ryan', 'Defense'),
('Jason', 'Kyle Pitts Sr');

-- Insert Player Rosters
-- Brady's Team
INSERT INTO player_roster (team_id, slot, player_name, draft_round, nfl_team, roster_order, 
  score_wildcard, score_divisional, score_championship, score_superbowl,
  expected_wildcard, expected_divisional, expected_championship, expected_superbowl,
  projected_wildcard, projected_divisional, projected_championship, projected_superbowl,
  variance_wildcard, variance_divisional, variance_championship, variance_superbowl)
VALUES
((SELECT id FROM fantasy_teams WHERE team_name = 'Brady'), 'QB', 'Jalen Hurts', 2, 'PHI', 0, 14.12, NULL, NULL, NULL, 19.5, 0, 0, 0, 19.5, 19.5, 19.5, 19.5, 24.5, 96.4, 81.0, 34.4),
((SELECT id FROM fantasy_teams WHERE team_name = 'Brady'), 'RB', 'D''andre Swift', 5, 'CHI', 1, 17.2, NULL, NULL, NULL, 12.4, 14.4, 5.3, 2.0, 12.4, 14.4, 14.4, 14.4, 79.7, 77.0, 57.2, 21.4),
((SELECT id FROM fantasy_teams WHERE team_name = 'Brady'), 'WR', 'Puka Nacua', 1, 'LAR', 2, 34.5, NULL, NULL, NULL, 21.1, 22.0, 14.8, 8.1, 21.1, 22.0, 22.0, 22.0, 87.4, 128.6, 148.6, 12.5),
((SELECT id FROM fantasy_teams WHERE team_name = 'Brady'), 'WR', 'Courtland Sutton', 3, 'DEN', 3, NULL, NULL, NULL, NULL, 0, 12.8, 6.6, 3.4, 12.9, 12.8, 12.8, 12.8, 0, 98.0, 99.0, 66.8),
((SELECT id FROM fantasy_teams WHERE team_name = 'Brady'), 'TE', 'AJ Barner', 7, 'SEA', 4, NULL, NULL, NULL, NULL, 0, 7.7, 6.0, 3.5, 8.7, 7.7, 7.7, 7.7, 0, 51.8, 52.3, 43.9),
((SELECT id FROM fantasy_teams WHERE team_name = 'Brady'), 'FLEX', 'Jayden Higgins', 4, 'HOU', 5, 6.9, NULL, NULL, NULL, 7.3, 7.3, 3.1, 1.6, 7.3, 7.3, 7.3, 7.3, 189.1, 129.4, 52.3, 25.3),
((SELECT id FROM fantasy_teams WHERE team_name = 'Brady'), 'FLEX', 'Zach Charbonnet', 6, 'SEA', 6, NULL, NULL, NULL, NULL, 0, 13.4, 10.4, 6.1, 11.3, 13.4, 13.4, 13.4, 0, 146.4, 129.9, 102.6),
((SELECT id FROM fantasy_teams WHERE team_name = 'Brady'), 'FLEX', 'Quentin Johnston', 8, 'LAC', 7, 5.0, NULL, NULL, NULL, 11.2, 0, 0, 0, 11.2, 11.2, 11.2, 11.2, 174.2, 94.7, 23.5, 7.1);

-- Robbie's Team
INSERT INTO player_roster (team_id, slot, player_name, draft_round, nfl_team, roster_order,
  score_wildcard, score_divisional, score_championship, score_superbowl,
  expected_wildcard, expected_divisional, expected_championship, expected_superbowl,
  projected_wildcard, projected_divisional, projected_championship, projected_superbowl,
  variance_wildcard, variance_divisional, variance_championship, variance_superbowl)
VALUES
((SELECT id FROM fantasy_teams WHERE team_name = 'Robbie'), 'QB', 'Trevor Lawrence', 3, 'JAX', 0, 25.38, NULL, NULL, NULL, 20.7, 0, 0, 0, 20.7, 20.7, 20.7, 20.7, 30.3, 122.7, 97.6, 63.7),
((SELECT id FROM fantasy_teams WHERE team_name = 'Robbie'), 'RB', 'Rhamondre Stevenson', 2, 'NE', 1, 15.8, NULL, NULL, NULL, 12.8, 12.7, 7.8, 4.0, 12.8, 12.7, 12.7, 12.7, 72.3, 84.5, 74.8, 51.8),
((SELECT id FROM fantasy_teams WHERE team_name = 'Robbie'), 'WR', 'Jaxon Smith-Njigba', 1, 'SEA', 2, NULL, NULL, NULL, NULL, 0, 20.3, 15.8, 9.2, 21.2, 20.3, 20.3, 20.3, 0, 121.0, 178.7, 170.7),
((SELECT id FROM fantasy_teams WHERE team_name = 'Robbie'), 'WR', 'Luther Burden II', 4, 'CHI', 3, 6.8, NULL, NULL, NULL, 11.2, 12.3, 4.5, 1.7, 11.2, 12.3, 12.3, 12.3, 174.2, 115.8, 80.2, 28.2),
((SELECT id FROM fantasy_teams WHERE team_name = 'Robbie'), 'TE', 'Tyler Higbee', 6, 'LAR', 4, 6.5, NULL, NULL, NULL, 7.6, 7.5, 5.0, 2.8, 7.6, 7.5, 7.5, 7.5, 43.6, 44.4, 33.5, 2.4),
((SELECT id FROM fantasy_teams WHERE team_name = 'Robbie'), 'FLEX', 'Khalil Shakir', 5, 'BUF', 5, 20.2, NULL, NULL, NULL, 12.0, 14.2, 7.4, 3.8, 12.0, 14.2, 14.2, 14.2, 109.2, 92.6, 33.7, 13.5),
((SELECT id FROM fantasy_teams WHERE team_name = 'Robbie'), 'FLEX', 'Rico Dowdle', 7, 'CAR', 6, 2.5, NULL, NULL, NULL, 12.2, 0, 0, 0, 12.2, 12.2, 12.2, 12.2, 146.4, 47.8, 14.7, 3.2),
((SELECT id FROM fantasy_teams WHERE team_name = 'Robbie'), 'FLEX', 'Jayden Reed', 8, 'GB', 7, 15.7, NULL, NULL, NULL, 11.2, 0, 0, 0, 11.2, 11.2, 11.2, 11.2, 133.4, 104.8, 25.3, 8.2);

-- Cody's Team
INSERT INTO player_roster (team_id, slot, player_name, draft_round, nfl_team, roster_order,
  score_wildcard, score_divisional, score_championship, score_superbowl,
  expected_wildcard, expected_divisional, expected_championship, expected_superbowl,
  projected_wildcard, projected_divisional, projected_championship, projected_superbowl,
  variance_wildcard, variance_divisional, variance_championship, variance_superbowl)
VALUES
((SELECT id FROM fantasy_teams WHERE team_name = 'Cody'), 'QB', 'Caleb Williams (GAY)', 7, 'CHI', 0, 25.44, NULL, NULL, NULL, 18.3, 22.6, 8.3, 3.2, 18.3, 22.6, 22.6, 22.6, 68.1, 116.7, 92.1, 36.3),
((SELECT id FROM fantasy_teams WHERE team_name = 'Cody'), 'RB', 'Christian McCaffrey', 1, 'SF', 1, 29.4, NULL, NULL, NULL, 20.3, 25.3, 6.7, 22.2, 20.3, 25.3, 25.3, 25.3, 52.2, 109.3, 51.2, 19.6),
((SELECT id FROM fantasy_teams WHERE team_name = 'Cody'), 'WR', 'A.J. Brown', 2, 'PHI', 2, 5.5, NULL, NULL, NULL, 16.1, 0, 0, 0, 16.1, 16.1, 16.1, 16.1, 77.4, 108.5, 71.4, 29.1),
((SELECT id FROM fantasy_teams WHERE team_name = 'Cody'), 'WR', 'Rome Odunze', 5, 'CHI', 3, 6.4, NULL, NULL, NULL, 5.4, 8.4, 3.1, 1.2, 5.4, 8.4, 8.4, 8.4, 204.5, 106.5, 69.0, 22.6),
((SELECT id FROM fantasy_teams WHERE team_name = 'Cody'), 'TE', 'Colston Loveland', 4, 'CHI', 4, 23.7, NULL, NULL, NULL, 11.3, 12.2, 4.5, 1.7, 11.3, 12.2, 12.2, 12.2, 56.3, 59.2, 44.4, 16.8),
((SELECT id FROM fantasy_teams WHERE team_name = 'Cody'), 'FLEX', 'Travis Etienne', 3, 'JAX', 5, 22.6, NULL, NULL, NULL, 13.6, 0, 0, 0, 13.6, 13.6, 13.6, 13.6, 109.2, 102.8, 70.3, 43.3),
((SELECT id FROM fantasy_teams WHERE team_name = 'Cody'), 'FLEX', 'Brian Thomas Jr', 6, 'JAX', 6, 10.1, NULL, NULL, NULL, 10.6, 0, 0, 0, 10.6, 10.6, 10.6, 10.6, 160.0, 111.1, 70.2, 41.6),
((SELECT id FROM fantasy_teams WHERE team_name = 'Cody'), 'FLEX', 'Kyle Monangai', 8, 'CHI', 7, 5.9, NULL, NULL, NULL, 7.8, 7.1, 2.6, 1.0, 7.8, 7.1, 7.1, 7.1, 237.2, 130.2, 85.8, 28.6);

-- Patrick's Team
INSERT INTO player_roster (team_id, slot, player_name, draft_round, nfl_team, roster_order,
  score_wildcard, score_divisional, score_championship, score_superbowl,
  expected_wildcard, expected_divisional, expected_championship, expected_superbowl,
  projected_wildcard, projected_divisional, projected_championship, projected_superbowl,
  variance_wildcard, variance_divisional, variance_championship, variance_superbowl)
VALUES
((SELECT id FROM fantasy_teams WHERE team_name = 'Patrick'), 'QB', 'Drake Maye', 1, 'NE', 0, 18.32, NULL, NULL, NULL, 20.1, 22.7, 14.0, 7.2, 20.1, 22.7, 22.7, 22.7, 48.2, 136.9, 104.3, 62.8),
((SELECT id FROM fantasy_teams WHERE team_name = 'Patrick'), 'RB', 'Kenneth Walker III', 4, 'SEA', 1, NULL, NULL, NULL, NULL, 0, 14.5, 11.3, 6.6, 14.8, 14.5, 14.5, 14.5, 0, 119.7, 133.8, 103.7),
((SELECT id FROM fantasy_teams WHERE team_name = 'Patrick'), 'WR', 'Stefon Diggs', 2, 'NE', 2, 3.6, NULL, NULL, NULL, 13.2, 11.5, 7.1, 3.6, 13.2, 11.5, 11.5, 11.5, 76.5, 121.5, 101.5, 60.9),
((SELECT id FROM fantasy_teams WHERE team_name = 'Patrick'), 'WR', 'Cooper Kupp', 6, 'SEA', 3, NULL, NULL, NULL, NULL, 0, 5.2, 4.0, 2.4, 14.3, 5.2, 5.2, 5.2, 0, 71.4, 89.3, 84.7),
((SELECT id FROM fantasy_teams WHERE team_name = 'Patrick'), 'TE', 'Dallas Goedert', 3, 'PHI', 4, 19.4, NULL, NULL, NULL, 9.7, 0, 0, 0, 9.7, 9.7, 9.7, 9.7, 50.4, 94.2, 91.8, 41.2),
((SELECT id FROM fantasy_teams WHERE team_name = 'Patrick'), 'FLEX', 'Woody Marks', 5, 'HOU', 5, 17.2, NULL, NULL, NULL, 12.2, 11.2, 4.7, 2.4, 12.2, 11.2, 11.2, 11.2, 96.3, 113.1, 71.9, 40.9),
((SELECT id FROM fantasy_teams WHERE team_name = 'Patrick'), 'FLEX', 'Jaylin Noel', 7, 'HOU', 6, 0, NULL, NULL, NULL, 2.5, 2.2, 0.9, 0.5, 2.5, 2.2, 2.2, 2.2, 141.7, 114.4, 62.1, 31.8),
((SELECT id FROM fantasy_teams WHERE team_name = 'Patrick'), 'FLEX', 'DJ Moore', 8, 'CHI', 7, 17.9, NULL, NULL, NULL, 8.7, 8.5, 3.1, 1.2, 8.7, 8.5, 8.5, 8.5, 112.3, 129.0, 86.5, 31.4);

-- Colin Quality Learing Center's Team
INSERT INTO player_roster (team_id, slot, player_name, draft_round, nfl_team, roster_order,
  score_wildcard, score_divisional, score_championship, score_superbowl,
  expected_wildcard, expected_divisional, expected_championship, expected_superbowl,
  projected_wildcard, projected_divisional, projected_championship, projected_superbowl,
  variance_wildcard, variance_divisional, variance_championship, variance_superbowl)
VALUES
((SELECT id FROM fantasy_teams WHERE team_name = 'Colin Quality Learing Center'), 'QB', 'Matthew Stafford', 2, 'LAR', 0, 28.16, NULL, NULL, NULL, 19.2, 22.9, 15.4, 8.4, 19.2, 22.9, 22.9, 22.9, 21.9, 62.9, 100.6, 9.2),
((SELECT id FROM fantasy_teams WHERE team_name = 'Colin Quality Learing Center'), 'RB', 'Treveyon Henderson', 3, 'NE', 1, 4.6, NULL, NULL, NULL, 12.4, 12.9, 8.0, 4.0, 12.4, 12.9, 12.9, 12.9, 104.0, 103.4, 87.2, 58.4),
((SELECT id FROM fantasy_teams WHERE team_name = 'Colin Quality Learing Center'), 'WR', 'Davante Adams', 1, 'LAR', 2, 12.2, NULL, NULL, NULL, 13.5, 16.0, 10.8, 5.9, 13.5, 16.0, 16.0, 16.0, 87.4, 97.1, 83.7, 6.4),
((SELECT id FROM fantasy_teams WHERE team_name = 'Colin Quality Learing Center'), 'WR', 'DK Metcalf', 6, 'PIT', 3, 6.2, NULL, NULL, NULL, 12.2, 0, 0, 0, 12.2, 12.2, 12.2, 12.2, 109.2, 82.5, 41.6, 16.1),
((SELECT id FROM fantasy_teams WHERE team_name = 'Colin Quality Learing Center'), 'TE', 'Hunter Henry', 4, 'NE', 4, 15.4, NULL, NULL, NULL, 12.1, 10.4, 6.4, 3.3, 12.1, 10.4, 10.4, 10.4, 29.2, 52.0, 50.2, 36.7),
((SELECT id FROM fantasy_teams WHERE team_name = 'Colin Quality Learing Center'), 'FLEX', 'Dalton Schultz', 5, 'HOU', 5, 4.2, NULL, NULL, NULL, 11.1, 10.4, 4.4, 2.2, 11.1, 10.4, 10.4, 10.4, 133.4, 111.5, 51.9, 26.0),
((SELECT id FROM fantasy_teams WHERE team_name = 'Colin Quality Learing Center'), 'FLEX', 'Kenneth Gainwell', 7, 'PIT', 6, 8.6, NULL, NULL, NULL, 13.7, 0, 0, 0, 13.7, 13.7, 13.7, 13.7, 204.5, 132.3, 64.5, 24.7),
((SELECT id FROM fantasy_teams WHERE team_name = 'Colin Quality Learing Center'), 'FLEX', 'Romeo Doubs', 8, 'GB', 7, 26.4, NULL, NULL, NULL, 9.4, 0, 0, 0, 9.4, 9.4, 9.4, 9.4, 174.2, 118.2, 26.1, 8.3);

-- Jason's Team
INSERT INTO player_roster (team_id, slot, player_name, draft_round, nfl_team, roster_order,
  score_wildcard, score_divisional, score_championship, score_superbowl,
  expected_wildcard, expected_divisional, expected_championship, expected_superbowl,
  projected_wildcard, projected_divisional, projected_championship, projected_superbowl,
  variance_wildcard, variance_divisional, variance_championship, variance_superbowl)
VALUES
((SELECT id FROM fantasy_teams WHERE team_name = 'Jason'), 'QB', 'Brock Purdy', 7, 'SF', 0, 19.88, NULL, NULL, NULL, 18.1, 22.9, 6.0, 20.1, 18.1, 22.9, 22.9, 22.9, 21.9, 80.3, 38.3, 14.7),
((SELECT id FROM fantasy_teams WHERE team_name = 'Jason'), 'RB', 'James Cook', 1, 'BUF', 1, 7.1, NULL, NULL, NULL, 17.8, 14.7, 7.6, 4.0, 17.8, 14.7, 14.7, 14.7, 58.5, 109.5, 47.8, 19.7),
((SELECT id FROM fantasy_teams WHERE team_name = 'Jason'), 'WR', 'Parker Washington', 3, 'JAX', 2, 23.9, NULL, NULL, NULL, 13.4, 0, 0, 0, 13.4, 13.4, 13.4, 13.4, 160.0, 127.9, 84.1, 50.9),
((SELECT id FROM fantasy_teams WHERE team_name = 'Jason'), 'WR', 'Jauan Jennings', 4, 'SF', 3, 12.66, NULL, NULL, NULL, 12.6, 14.1, 3.7, 12.4, 12.6, 14.1, 14.1, 14.1, 146.4, 84.4, 35.4, 13.1),
((SELECT id FROM fantasy_teams WHERE team_name = 'Jason'), 'TE', 'George Kittle', 2, 'SF', 4, 1.6, NULL, NULL, NULL, 14.9, 0, 0, 0, 14.9, 0, 0, 0, 26.0, 58.2, 27.3, 10.5),
((SELECT id FROM fantasy_teams WHERE team_name = 'Jason'), 'FLEX', 'RJ Harvey', 5, 'DEN', 5, NULL, NULL, NULL, NULL, 0, 16.3, 8.5, 4.3, 12.2, 16.3, 16.3, 16.3, 0, 220.5, 168.8, 101.6),
((SELECT id FROM fantasy_teams WHERE team_name = 'Jason'), 'FLEX', 'Dalton Kincaid', 6, 'BUF', 6, 11.8, NULL, NULL, NULL, 10.8, 8.3, 4.3, 2.2, 10.8, 8.3, 8.3, 8.3, 121.0, 91.9, 32.0, 12.7),
((SELECT id FROM fantasy_teams WHERE team_name = 'Jason'), 'FLEX', 'Blake Corum', 8, 'LAR', 7, 7.8, NULL, NULL, NULL, 7.8, 8.2, 5.5, 3.0, 7.8, 8.2, 8.2, 8.2, 174.2, 157.3, 92.2, 5.6);

-- Dylan's Team
INSERT INTO player_roster (team_id, slot, player_name, draft_round, nfl_team, roster_order,
  score_wildcard, score_divisional, score_championship, score_superbowl,
  expected_wildcard, expected_divisional, expected_championship, expected_superbowl,
  projected_wildcard, projected_divisional, projected_championship, projected_superbowl,
  variance_wildcard, variance_divisional, variance_championship, variance_superbowl)
VALUES
((SELECT id FROM fantasy_teams WHERE team_name = 'Dylan'), 'QB', 'Jordan Love', 7, 'GB', 0, 37.02, NULL, NULL, NULL, 16.4, 0, 0, 0, 16.4, 16.4, 16.4, 16.4, 33.4, 84.9, 28.3, 9.4),
((SELECT id FROM fantasy_teams WHERE team_name = 'Dylan'), 'RB', 'Saquon Barkley', 1, 'PHI', 1, 16.1, NULL, NULL, NULL, 15.4, 0, 0, 0, 15.4, 15.4, 15.4, 15.4, 46.2, 81.9, 58.8, 24.3),
((SELECT id FROM fantasy_teams WHERE team_name = 'Dylan'), 'WR', 'Devonta Smith', 3, 'PHI', 2, 15.0, NULL, NULL, NULL, 12.2, 0, 0, 0, 12.2, 12.2, 12.2, 12.2, 98.0, 100.1, 55.3, 21.7),
((SELECT id FROM fantasy_teams WHERE team_name = 'Dylan'), 'WR', 'Kayshon Boutte', 4, 'NE', 3, 10.6, NULL, NULL, NULL, 8.9, 8.2, 5.1, 2.6, 8.9, 8.2, 8.2, 8.2, 189.1, 143.2, 108.6, 66.7),
((SELECT id FROM fantasy_teams WHERE team_name = 'Dylan'), 'TE', 'Brenton Strange', 6, 'JAX', 4, 2.9, NULL, NULL, NULL, 10.8, 0, 0, 0, 10.8, 10.8, 10.8, 10.8, 47.6, 53.8, 38.1, 23.8),
((SELECT id FROM fantasy_teams WHERE team_name = 'Dylan'), 'FLEX', 'Kyren Williams', 2, 'LAR', 5, 15.5, NULL, NULL, NULL, 14.7, 12.9, 8.7, 4.7, 14.7, 12.9, 12.9, 12.9, 87.4, 101.1, 92.0, 7.2),
((SELECT id FROM fantasy_teams WHERE team_name = 'Dylan'), 'FLEX', 'Christian Watson', 5, 'GB', 6, 11.6, NULL, NULL, NULL, 12.6, 0, 0, 0, 12.6, 12.6, 12.6, 12.6, 146.4, 120.2, 29.7, 9.6),
((SELECT id FROM fantasy_teams WHERE team_name = 'Dylan'), 'FLEX', 'Tetairoa McMillan', 8, 'CAR', 7, 13.1, NULL, NULL, NULL, 12.5, 0, 0, 0, 12.5, 12.5, 12.5, 12.5, 204.5, 59.3, 18.0, 3.9);

-- Ryan's Team
INSERT INTO player_roster (team_id, slot, player_name, draft_round, nfl_team, roster_order,
  score_wildcard, score_divisional, score_championship, score_superbowl,
  expected_wildcard, expected_divisional, expected_championship, expected_superbowl,
  projected_wildcard, projected_divisional, projected_championship, projected_superbowl,
  variance_wildcard, variance_divisional, variance_championship, variance_superbowl)
VALUES
((SELECT id FROM fantasy_teams WHERE team_name = 'Ryan'), 'QB', 'Josh Allen', 1, 'BUF', 0, 32.22, NULL, NULL, NULL, 22.5, 26.4, 13.7, 7.1, 22.5, 26.4, 26.4, 26.4, 27.3, 140.5, 66.7, 27.8),
((SELECT id FROM fantasy_teams WHERE team_name = 'Ryan'), 'RB', 'Josh Jacobs', 3, 'GB', 1, 6.8, NULL, NULL, NULL, 16.6, 0, 0, 0, 16.6, 16.6, 16.6, 16.6, 58.5, 100.5, 31.5, 10.4),
((SELECT id FROM fantasy_teams WHERE team_name = 'Ryan'), 'WR', 'Nico Collins', 2, 'HOU', 2, 5.1, NULL, NULL, NULL, 13.8, 2.0, 0.8, 0.4, 13.8, 2.0, 2.0, 2.0, 87.4, 99.0, 53.3, 27.6),
((SELECT id FROM fantasy_teams WHERE team_name = 'Ryan'), 'WR', 'Jakobi Meyers', 5, 'JAX', 3, 2.2, NULL, NULL, NULL, 13.4, 0, 0, 0, 13.4, 13.4, 13.4, 13.4, 98.0, 95.7, 65.9, 40.7),
((SELECT id FROM fantasy_teams WHERE team_name = 'Ryan'), 'TE', 'Colby Parkinson', 6, 'LAR', 4, 11.4, NULL, NULL, NULL, 6.6, 6.4, 4.3, 2.3, 6.6, 6.4, 6.4, 6.4, 43.6, 42.7, 30.0, 2.1),
((SELECT id FROM fantasy_teams WHERE team_name = 'Ryan'), 'FLEX', 'Omarion Hampton', 4, 'LAC', 5, -0.1, NULL, NULL, NULL, 12.3, 0, 0, 0, 12.3, 12.3, 12.3, 12.3, 237.2, 124.4, 30.5, 9.2),
((SELECT id FROM fantasy_teams WHERE team_name = 'Ryan'), 'FLEX', 'Rashid Shaheed', 7, 'SEA', 6, NULL, NULL, NULL, NULL, 0, 3.2, 2.5, 1.5, 8.7, 3.2, 3.2, 3.2, 0, 174.2, 138.7, 103.1),
((SELECT id FROM fantasy_teams WHERE team_name = 'Ryan'), 'FLEX', 'Demario Douglas', 8, 'NE', 7, 1.3, NULL, NULL, NULL, 4.7, 2.9, 1.8, 0.9, 4.7, 2.9, 2.9, 2.9, 160.0, 111.2, 80.7, 47.6);

-- Insert Team Rankings
INSERT INTO team_rankings (team_id, expected_total, finish_1st, finish_2nd, finish_3rd, finish_4th, 
  finish_5th, finish_6th, finish_7th, finish_8th, win_probability, top3_probability, last_place_probability)
SELECT id, 259.1, 31.3, 23.2, 17.3, 11.9, 9.0, 5.2, 1.7, 0.4, 31.3, 71.9, 0.4 FROM fantasy_teams WHERE team_name = 'Cody'
UNION ALL
SELECT id, 250.8, 23.6, 20.9, 18.6, 14.7, 11.4, 7.4, 2.9, 0.5, 23.6, 63.1, 0.5 FROM fantasy_teams WHERE team_name = 'Jason'
UNION ALL
SELECT id, 247.2, 19.8, 20.7, 19.7, 16.7, 12.3, 7.9, 2.5, 0.5, 19.8, 60.2, 0.5 FROM fantasy_teams WHERE team_name = 'Colin Quality Learing Center'
UNION ALL
SELECT id, 226.2, 10.0, 12.3, 14.8, 17.4, 18.3, 16.8, 8.2, 2.3, 10.0, 37.1, 2.3 FROM fantasy_teams WHERE team_name = 'Brady'
UNION ALL
SELECT id, 221.1, 7.8, 11.2, 13.8, 16.4, 18.5, 19.3, 10.0, 3.1, 7.8, 32.8, 3.1 FROM fantasy_teams WHERE team_name = 'Patrick'
UNION ALL
SELECT id, 221.9, 7.2, 11.0, 13.6, 17.8, 20.0, 18.4, 9.3, 2.8, 7.2, 31.8, 2.8 FROM fantasy_teams WHERE team_name = 'Robbie'
UNION ALL
SELECT id, 164.0, 0.2, 0.5, 1.7, 3.9, 7.8, 17.6, 42.2, 26.2, 0.2, 2.4, 26.2 FROM fantasy_teams WHERE team_name = 'Dylan'
UNION ALL
SELECT id, 135.1, 0.0, 0.2, 0.5, 1.3, 2.9, 7.4, 23.3, 64.4, 0.0, 0.8, 64.4 FROM fantasy_teams WHERE team_name = 'Ryan';

-- Insert Last Updated tracking
INSERT INTO last_updated (update_type, updated_at) VALUES
('variance', '2026-01-09T22:53:01.065Z'),
('winProbabilities', '2026-01-13T23:26:50.109Z');

-- Create a view for easy querying of complete team data
CREATE VIEW team_summary AS
SELECT 
  ft.team_name,
  ft.coach,
  tr.expected_total,
  tr.win_probability,
  tr.top3_probability,
  tr.last_place_probability,
  COUNT(pr.id) as roster_count
FROM fantasy_teams ft
LEFT JOIN team_rankings tr ON ft.id = tr.team_id
LEFT JOIN player_roster pr ON ft.id = pr.team_id
GROUP BY ft.id, ft.team_name, ft.coach, tr.expected_total, tr.win_probability, 
  tr.top3_probability, tr.last_place_probability
ORDER BY tr.expected_total DESC;

-- Create a view for player stats by round
CREATE VIEW player_stats_by_round AS
SELECT 
  ft.team_name,
  pr.player_name,
  pr.nfl_team,
  pr.slot,
  'wildcard' as round,
  pr.score_wildcard as score,
  pr.expected_wildcard as expected,
  pr.projected_wildcard as projected,
  pr.variance_wildcard as variance
FROM player_roster pr
JOIN fantasy_teams ft ON pr.team_id = ft.id
UNION ALL
SELECT 
  ft.team_name,
  pr.player_name,
  pr.nfl_team,
  pr.slot,
  'divisional' as round,
  pr.score_divisional as score,
  pr.expected_divisional as expected,
  pr.projected_divisional as projected,
  pr.variance_divisional as variance
FROM player_roster pr
JOIN fantasy_teams ft ON pr.team_id = ft.id
UNION ALL
SELECT 
  ft.team_name,
  pr.player_name,
  pr.nfl_team,
  pr.slot,
  'championship' as round,
  pr.score_championship as score,
  pr.expected_championship as expected,
  pr.projected_championship as projected,
  pr.variance_championship as variance
FROM player_roster pr
JOIN fantasy_teams ft ON pr.team_id = ft.id
UNION ALL
SELECT 
  ft.team_name,
  pr.player_name,
  pr.nfl_team,
  pr.slot,
  'superbowl' as round,
  pr.score_superbowl as score,
  pr.expected_superbowl as expected,
  pr.projected_superbowl as projected,
  pr.variance_superbowl as variance
FROM player_roster pr
JOIN fantasy_teams ft ON pr.team_id = ft.id;

-- Grant permissions (adjust based on your Supabase RLS policies)
-- These are commented out - configure based on your needs
-- ALTER TABLE nfl_games ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE fantasy_teams ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE player_roster ENABLE ROW LEVEL SECURITY;
-- etc.

COMMENT ON TABLE nfl_games IS 'Stores NFL playoff game schedule';
COMMENT ON TABLE eliminated_teams IS 'Tracks teams eliminated from playoffs';
COMMENT ON TABLE team_probabilities IS 'Stores probability of reaching each playoff round';
COMMENT ON TABLE fantasy_teams IS 'Fantasy league teams and coaches';
COMMENT ON TABLE player_roster IS 'Player rosters with scores, projections, and variance by round';
COMMENT ON TABLE team_rankings IS 'Overall team statistics and finish probabilities';
COMMENT ON TABLE last_updated IS 'Tracks when different data types were last updated';

COMMENT ON COLUMN player_roster.scoring_breakdown_wildcard IS 'JSON object containing scoring breakdown for wildcard round. Example: {"passing_yards": {"stat": "98 yds", "calculation": "98 × 0.04", "points": 3.92}}';
COMMENT ON COLUMN player_roster.scoring_breakdown_divisional IS 'JSON object containing scoring breakdown for divisional round';
COMMENT ON COLUMN player_roster.scoring_breakdown_championship IS 'JSON object containing scoring breakdown for championship round';
COMMENT ON COLUMN player_roster.scoring_breakdown_superbowl IS 'JSON object containing scoring breakdown for superbowl round';
