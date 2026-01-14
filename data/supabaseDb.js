const supabase = require('../supabaseClient');

// ============================================
// FETCH FUNCTIONS
// ============================================

// Get all fantasy teams
async function getAllTeams() {
  const { data, error } = await supabase
    .from('fantasy_teams')
    .select('*')
    .order('team_name');
  
  if (error) throw new Error(`Failed to fetch teams: ${error.message}`);
  return data.map(team => ({
    teamName: team.team_name,
    coach: team.coach
  }));
}

// Get a single team by name
async function getTeamByName(teamName) {
  const { data, error } = await supabase
    .from('fantasy_teams')
    .select('*')
    .eq('team_name', teamName)
    .single();
  
  if (error) throw new Error(`Team not found: ${error.message}`);
  return {
    teamName: data.team_name,
    coach: data.coach
  };
}

// Get complete fantasy data for a team (roster + scores + projections + variance)
async function getFantasyData(teamName) {
  // Get team
  const { data: team, error: teamError } = await supabase
    .from('fantasy_teams')
    .select('id, team_name, coach')
    .eq('team_name', teamName)
    .single();
  
  if (teamError) throw new Error(`Team not found: ${teamError.message}`);
  
  // Get roster with all stats
  const { data: roster, error: rosterError } = await supabase
    .from('player_roster')
    .select('*')
    .eq('team_id', team.id)
    .order('roster_order');
  
  if (rosterError) throw new Error(`Failed to fetch roster: ${rosterError.message}`);
  
  // Get team rankings
  const { data: rankings, error: rankingsError } = await supabase
    .from('team_rankings')
    .select('*')
    .eq('team_id', team.id)
    .single();
  
  if (rankingsError) console.warn(`No rankings found for ${teamName}`);
  
  // Transform roster data to match original structure
  const rosterData = roster.map(player => {
    // Calculate total scores including manual 2-point conversions
    const wildcardTotal = (player.score_wildcard || 0) + (player.two_point_wildcard || 0) * 2;
    const divisionalTotal = (player.score_divisional || 0) + (player.two_point_divisional || 0) * 2;
    const championshipTotal = (player.score_championship || 0) + (player.two_point_championship || 0) * 2;
    const superbowlTotal = (player.score_superbowl || 0) + (player.two_point_superbowl || 0) * 2;
    
    return {
      slot: player.slot,
      playerName: player.player_name,
      draftRound: player.draft_round,
      nflTeam: player.nfl_team,
      // Include scores for each round (with 2PT conversions added)
      wildcard: player.score_wildcard !== null ? wildcardTotal : null,
      divisional: player.score_divisional !== null ? divisionalTotal : null,
      championship: player.score_championship !== null ? championshipTotal : null,
      superbowl: player.score_superbowl !== null ? superbowlTotal : null,
      total: wildcardTotal + divisionalTotal + championshipTotal + superbowlTotal,
      // Include 2PT conversion counts
      twoPtWildcard: player.two_point_wildcard || 0,
      twoPtDivisional: player.two_point_divisional || 0,
      twoPtChampionship: player.two_point_championship || 0,
      twoPtSuperbowl: player.two_point_superbowl || 0,
      // Include scoring breakdowns
      breakdownWildcard: player.scoring_breakdown_wildcard || null,
      breakdownDivisional: player.scoring_breakdown_divisional || null,
      breakdownChampionship: player.scoring_breakdown_championship || null,
      breakdownSuperbowl: player.scoring_breakdown_superbowl || null
    };
  });
  
  // Extract scores by round
  const scores = {
    wildcard: roster.map(p => p.score_wildcard || 0),
    divisional: roster.map(p => p.score_divisional || 0),
    championship: roster.map(p => p.score_championship || 0),
    superbowl: roster.map(p => p.score_superbowl || 0)
  };
  
  // Extract expected points by round
  const expectedPoints = {
    wildcard: roster.map(p => p.expected_wildcard || 0),
    divisional: roster.map(p => p.expected_divisional || 0),
    championship: roster.map(p => p.expected_championship || 0),
    superbowl: roster.map(p => p.expected_superbowl || 0)
  };
  
  // Extract projected points by round
  const projectedPoints = {
    wildcard: roster.map(p => p.projected_wildcard || 0),
    divisional: roster.map(p => p.projected_divisional || 0),
    championship: roster.map(p => p.projected_championship || 0),
    superbowl: roster.map(p => p.projected_superbowl || 0)
  };
  
  // Extract variance by round
  const variance = {
    wildcard: roster.map(p => p.variance_wildcard || 0),
    divisional: roster.map(p => p.variance_divisional || 0),
    championship: roster.map(p => p.variance_championship || 0),
    superbowl: roster.map(p => p.variance_superbowl || 0)
  };
  
  // Calculate team totals by round
  const teamTotal = {
    wildcard: scores.wildcard.reduce((sum, score) => sum + score, 0),
    divisional: scores.divisional.reduce((sum, score) => sum + score, 0),
    championship: scores.championship.reduce((sum, score) => sum + score, 0),
    superbowl: scores.superbowl.reduce((sum, score) => sum + score, 0),
    total: 0
  };
  teamTotal.total = teamTotal.wildcard + teamTotal.divisional + teamTotal.championship + teamTotal.superbowl;
  
  // Build response matching original structure
  const result = {
    teamName: team.team_name,
    coach: team.coach,
    roster: rosterData,
    scores,
    expectedPoints,
    projectedPoints,
    variance,
    teamTotal
  };
  
  // Add win probabilities if available
  if (rankings) {
    result.winProbabilities = {
      first: rankings.finish_1st || 0,
      second: rankings.finish_2nd || 0,
      third: rankings.finish_3rd || 0,
      fourth: rankings.finish_4th || 0,
      fifth: rankings.finish_5th || 0,
      sixth: rankings.finish_6th || 0,
      seventh: rankings.finish_7th || 0,
      eighth: rankings.finish_8th || 0,
      winChance: rankings.win_probability || 0,
      top3Chance: rankings.top3_probability || 0,
      lastPlaceChance: rankings.last_place_probability || 0
    };
  }
  
  return result;
}

// Get NFL games for a specific round
async function getNFLGames(round) {
  const { data, error } = await supabase
    .from('nfl_games')
    .select('*')
    .eq('round', round);
  
  if (error) throw new Error(`Failed to fetch games: ${error.message}`);
  
  return data.map(game => ({
    homeTeam: game.home_team,
    awayTeam: game.away_team,
    gameTime: game.game_time
  }));
}

// Get eliminated teams
async function getEliminatedTeams() {
  const { data, error } = await supabase
    .from('eliminated_teams')
    .select('team_code');
  
  if (error) throw new Error(`Failed to fetch eliminated teams: ${error.message}`);
  return data.map(t => t.team_code);
}

// Get team probabilities
async function getTeamProbabilities() {
  const { data, error } = await supabase
    .from('team_probabilities')
    .select('*');
  
  if (error) throw new Error(`Failed to fetch team probabilities: ${error.message}`);
  
  // Transform to match original structure
  const probabilities = {};
  data.forEach(team => {
    probabilities[team.team_code] = {
      wildcard: team.wildcard_prob,
      divisional: team.divisional_prob,
      championship: team.championship_prob,
      superbowl: team.superbowl_prob
    };
  });
  
  return probabilities;
}

// Get all team rankings
async function getAllTeamRankings() {
  const { data, error } = await supabase
    .from('team_rankings')
    .select(`
      *,
      fantasy_teams (
        team_name,
        coach
      )
    `)
    .order('expected_total', { ascending: false });
  
  if (error) throw new Error(`Failed to fetch team rankings: ${error.message}`);
  
  return data.map(ranking => ({
    teamName: ranking.fantasy_teams.team_name,
    coach: ranking.fantasy_teams.coach,
    expectedTotal: ranking.expected_total,
    winProbability: ranking.win_probability,
    top3Probability: ranking.top3_probability,
    lastPlaceProbability: ranking.last_place_probability,
    finish_1st: ranking.finish_1st,
    finish_2nd: ranking.finish_2nd,
    finish_3rd: ranking.finish_3rd,
    finish_4th: ranking.finish_4th,
    finish_5th: ranking.finish_5th,
    finish_6th: ranking.finish_6th,
    finish_7th: ranking.finish_7th,
    finish_8th: ranking.finish_8th
  }));
}

// Get last updated timestamps
async function getLastUpdated() {
  const { data, error } = await supabase
    .from('last_updated')
    .select('*');
  
  if (error) throw new Error(`Failed to fetch last updated: ${error.message}`);
  
  const result = {};
  data.forEach(entry => {
    result[entry.update_type] = entry.updated_at;
  });
  
  return result;
}

// Read all data (comprehensive - for backwards compatibility)
async function readData() {
  const [teams, nflGames, eliminatedTeams, teamProbabilities, rankings, lastUpdated] = await Promise.all([
    getAllTeams(),
    Promise.all([
      getNFLGames('wildcard'),
      getNFLGames('divisional'),
      getNFLGames('championship'),
      getNFLGames('superbowl')
    ]),
    getEliminatedTeams(),
    getTeamProbabilities(),
    getAllTeamRankings(),
    getLastUpdated()
  ]);
  
  // Get full team data with rosters
  const teamsWithData = await Promise.all(
    teams.map(team => getFantasyData(team.teamName))
  );
  
  return {
    teams: teamsWithData,
    nflGames: {
      wildcard: nflGames[0],
      divisional: nflGames[1],
      championship: nflGames[2],
      superbowl: nflGames[3]
    },
    eliminatedTeams,
    teamProbabilities,
    winProbabilities: rankings
  };
}

// ============================================
// UPDATE FUNCTIONS
// ============================================

// Update player scores for a specific round
async function updateTeamScores(teamName, round, scores) {
  if (!Array.isArray(scores) || scores.length !== 8) {
    throw new Error('Scores must be an array of 8 numbers');
  }
  
  // Get team ID
  const { data: team, error: teamError } = await supabase
    .from('fantasy_teams')
    .select('id')
    .eq('team_name', teamName)
    .single();
  
  if (teamError) throw new Error(`Team not found: ${teamError.message}`);
  
  // Get roster in order
  const { data: roster, error: rosterError } = await supabase
    .from('player_roster')
    .select('id')
    .eq('team_id', team.id)
    .order('roster_order');
  
  if (rosterError) throw new Error(`Failed to fetch roster: ${rosterError.message}`);
  
  // Update each player's score
  const columnName = `score_${round}`;
  const updatePromises = roster.map((player, index) => 
    supabase
      .from('player_roster')
      .update({ [columnName]: scores[index] })
      .eq('id', player.id)
  );
  
  await Promise.all(updatePromises);
  return true;
}

// Update player scores with scoring breakdown for a specific round
async function updatePlayerScoreWithBreakdown(teamName, round, playerIndex, score, breakdown) {
  // Get team ID
  const { data: team, error: teamError } = await supabase
    .from('fantasy_teams')
    .select('id')
    .eq('team_name', teamName)
    .single();
  
  if (teamError) throw new Error(`Team not found: ${teamError.message}`);
  
  // Get the specific player by roster order
  const { data: player, error: playerError } = await supabase
    .from('player_roster')
    .select('id')
    .eq('team_id', team.id)
    .eq('roster_order', playerIndex)
    .single();
  
  if (playerError) throw new Error(`Player not found: ${playerError.message}`);
  
  // Update score and breakdown
  const scoreColumn = `score_${round}`;
  const breakdownColumn = `scoring_breakdown_${round}`;
  
  const { error: updateError } = await supabase
    .from('player_roster')
    .update({ 
      [scoreColumn]: score,
      [breakdownColumn]: breakdown
    })
    .eq('id', player.id);
  
  if (updateError) throw new Error(`Failed to update player: ${updateError.message}`);
  return true;
}

// Update manual 2-point conversions for a player in a specific round
async function updatePlayerTwoPointConversions(teamName, round, playerIndex, twoPtCount) {
  // Get team ID
  const { data: team, error: teamError } = await supabase
    .from('fantasy_teams')
    .select('id')
    .eq('team_name', teamName)
    .single();
  
  if (teamError) throw new Error(`Team not found: ${teamError.message}`);
  
  // Get the specific player by roster order
  const { data: player, error: playerError } = await supabase
    .from('player_roster')
    .select('id')
    .eq('team_id', team.id)
    .eq('roster_order', playerIndex)
    .single();
  
  if (playerError) throw new Error(`Player not found: ${playerError.message}`);
  
  // Update 2PT conversion count
  const twoPtColumn = `two_point_${round}`;
  
  const { error: updateError } = await supabase
    .from('player_roster')
    .update({ 
      [twoPtColumn]: twoPtCount
    })
    .eq('id', player.id);
  
  if (updateError) throw new Error(`Failed to update 2PT conversions: ${updateError.message}`);
  return true;
}

// Update player projections for a specific round
async function updateTeamProjections(teamName, round, projections) {
  if (!Array.isArray(projections) || projections.length !== 8) {
    throw new Error('Projections must be an array of 8 numbers');
  }
  
  // Get team ID
  const { data: team, error: teamError } = await supabase
    .from('fantasy_teams')
    .select('id')
    .eq('team_name', teamName)
    .single();
  
  if (teamError) throw new Error(`Team not found: ${teamError.message}`);
  
  // Get roster in order
  const { data: roster, error: rosterError } = await supabase
    .from('player_roster')
    .select('id')
    .eq('team_id', team.id)
    .order('roster_order');
  
  if (rosterError) throw new Error(`Failed to fetch roster: ${rosterError.message}`);
  
  // Update each player's projection
  const columnName = `projected_${round}`;
  const updatePromises = roster.map((player, index) => 
    supabase
      .from('player_roster')
      .update({ [columnName]: projections[index] })
      .eq('id', player.id)
  );
  
  await Promise.all(updatePromises);
  return true;
}

// Update last updated timestamp
async function updateLastUpdated(updateType) {
  const { error } = await supabase
    .from('last_updated')
    .upsert({
      update_type: updateType,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'update_type'
    });
  
  if (error) throw new Error(`Failed to update timestamp: ${error.message}`);
  return true;
}

module.exports = {
  getAllTeams,
  getTeamByName,
  getFantasyData,
  getNFLGames,
  getEliminatedTeams,
  getTeamProbabilities,
  getAllTeamRankings,
  getLastUpdated,
  readData,
  updateTeamScores,
  updatePlayerScoreWithBreakdown,
  updatePlayerTwoPointConversions,
  updateTeamProjections,
  updateLastUpdated
};
