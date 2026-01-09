const express = require('express');
const cors = require('cors');
const path = require('path');
const { getAllTeams, getTeamByName, getFantasyData, updateTeamScores, updateTeamProjections, readData } = require('./data/mockDb');
const { getPlayerGameStatsByWeek, getPlayerGameStatsByTeam, getPlayerGameProjectionsByWeek, getPlayerPropsByScoreID, findPlayerStats, roundToWeek } = require('./services/sportsDataService');
const { shouldFetchLiveStats, getActiveTeams } = require('./utils/gameHelpers');
const { calculateFantasyPoints } = require('./utils/fantasyPoints');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API Routes

// Get all teams list
app.get('/api/teams', (req, res) => {
  try {
    const teams = getAllTeams();
    const teamList = teams.map(team => ({
      teamName: team.teamName,
      coach: team.coach
    }));
    res.json(teamList);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Get active games for a round
app.get('/api/active-games/:round', (req, res) => {
  try {
    const round = req.params.round.toLowerCase();
    const data = readData();
    const games = data.nflGames[round] || [];
    
    const activeTeams = getActiveTeams(games);
    
    res.json({
      round,
      activeTeams,
      eliminatedTeams: data.eliminatedTeams || [],
      totalActiveGames: activeTeams.length / 2
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active games' });
  }
});

// Get fantasy data for a specific team
app.get('/api/fantasy-data/:teamName', (req, res) => {
  try {
    const data = getFantasyData(req.params.teamName);
    res.json(data);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Legacy endpoint - defaults to first team for backwards compatibility
app.get('/api/fantasy-data', (req, res) => {
  try {
    const teams = getAllTeams();
    if (teams.length === 0) {
      return res.status(404).json({ error: 'No teams found' });
    }
    const data = getFantasyData(teams[0].teamName);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch fantasy data' });
  }
});

// Update scores for a team
app.put('/api/fantasy-data/:teamName/scores', (req, res) => {
  try {
    const { round, scores } = req.body;
    
    if (!round || !scores) {
      return res.status(400).json({ error: 'Round and scores are required' });
    }

    if (!Array.isArray(scores) || scores.length !== 8) {
      return res.status(400).json({ error: 'Scores must be an array of 8 numbers' });
    }

    const success = updateTeamScores(req.params.teamName, round, scores);
    
    if (success) {
      const updatedData = getFantasyData(req.params.teamName);
      res.json({ success: true, data: updatedData });
    } else {
      res.status(500).json({ error: 'Failed to update scores' });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update scores from live API data
app.post('/api/update-scores/:round', async (req, res) => {
  try {
    const round = req.params.round.toLowerCase();
    
    // Validate round
    if (!['wildcard', 'divisional', 'championship', 'superbowl'].includes(round)) {
      return res.status(400).json({ error: 'Invalid round. Must be: wildcard, divisional, championship, or superbowl' });
    }

    // Read data to get games and teams
    const data = readData();
    const games = data.nflGames[round];
    
    if (!games || games.length === 0) {
      return res.status(400).json({ error: `No games scheduled for ${round} round` });
    }

    // Get teams playing in active games
    const activeTeams = getActiveTeams(games);
    
    if (activeTeams.length === 0) {
      return res.json({ 
        message: 'No games currently active',
        activeGames: 0,
        teamsUpdated: 0
      });
    }

    // Get unique NFL teams that are active
    const activeNFLTeams = [...new Set(activeTeams)];
    
    // Fetch stats from SportsData.io API - one call per active team
    const week = roundToWeek(round);
    const statsPromises = activeNFLTeams.map(team => 
      getPlayerGameStatsByTeam('2025POST', week, team)
        .catch(err => {
          console.error(`Error fetching stats for team ${team}:`, err.message);
          return []; // Return empty array if fetch fails for a team
        })
    );
    
    const allTeamStats = await Promise.all(statsPromises);
    // Flatten the array of arrays into a single array of player stats
    const allPlayerStats = allTeamStats.flat();
    
    let updatedCount = 0;
    const updateResults = [];

    // Loop through all fantasy teams and update scores for players on active NFL teams
    for (const team of data.teams) {
      const updatedScores = [...team.scores[round]]; // Clone current scores
      
      team.roster.forEach((player, index) => {
        const playerTeam = player.nflTeam;
        
        // Only update stats for players whose NFL teams are currently playing
        if (activeNFLTeams.includes(playerTeam)) {
          const playerStats = findPlayerStats(allPlayerStats, player.playerName, playerTeam);
          
          if (playerStats) {
            const fantasyPoints = calculateFantasyPoints(playerStats);
            updatedScores[index] = fantasyPoints;
            updatedCount++;
            
            updateResults.push({
              team: team.teamName,
              player: player.playerName,
              previousScore: team.scores[round][index],
              newScore: fantasyPoints,
              updated: true
            });
          } else {
            updateResults.push({
              team: team.teamName,
              player: player.playerName,
              previousScore: team.scores[round][index],
              newScore: team.scores[round][index],
              updated: false,
              reason: 'Player stats not found in API'
            });
          }
        }
      });
      
      // Update the team's scores if any changed
      if (JSON.stringify(updatedScores) !== JSON.stringify(team.scores[round])) {
        updateTeamScores(team.teamName, round, updatedScores);
      }
    }

    res.json({
      success: true,
      message: `Updated scores for ${round} round`,
      activeGames: activeNFLTeams.length / 2,
      playersUpdated: updatedCount,
      details: updateResults
    });

  } catch (error) {
    console.error('Error updating scores:', error);
    res.status(500).json({ 
      error: 'Failed to update scores',
      message: error.message 
    });
  }
});

// Update projections from API data
app.post('/api/update-projections/:round', async (req, res) => {
  try {
    const round = req.params.round.toLowerCase();
    
    // Validate round
    if (!['wildcard', 'divisional', 'championship', 'superbowl'].includes(round)) {
      return res.status(400).json({ error: 'Invalid round. Must be: wildcard, divisional, championship, or superbowl' });
    }

    // Get week number for API call
    const week = roundToWeek(round);
    
    // Fetch all projections for the week
    const allProjections = await getPlayerGameProjectionsByWeek('2025POST', week);
    
    console.log(`\n📊 API Response for ${round} (week ${week}):`);
    console.log(`Total projections received: ${allProjections?.length || 0}`);
    if (allProjections && allProjections.length > 0) {
      console.log('Sample projection:', JSON.stringify(allProjections[0], null, 2));
      console.log('Teams in projections:', [...new Set(allProjections.map(p => p.Team))].filter(Boolean).sort());
    }
    
    if (!allProjections || allProjections.length === 0) {
      return res.status(404).json({ 
        error: 'No projections available',
        message: `No projection data found for ${round} round (week ${week})`
      });
    }

    // Read data to get all fantasy teams
    const data = readData();
    let updatedCount = 0;
    const updateResults = [];

    // Loop through all fantasy teams and update projections
    for (const team of data.teams) {
      // Initialize projectedPoints if it doesn't exist
      if (!team.projectedPoints) {
        team.projectedPoints = {
          wildcard: [0, 0, 0, 0, 0, 0, 0, 0],
          divisional: [0, 0, 0, 0, 0, 0, 0, 0],
          championship: [0, 0, 0, 0, 0, 0, 0, 0],
          superbowl: [0, 0, 0, 0, 0, 0, 0, 0]
        };
      }
      
      const updatedProjections = [...team.projectedPoints[round]]; // Clone current projections
      
      team.roster.forEach((player, index) => {
        const playerProjection = findPlayerStats(allProjections, player.playerName, player.nflTeam);
        
        if (playerProjection) {
          const projectedFantasyPoints = calculateFantasyPoints(playerProjection);
          updatedProjections[index] = projectedFantasyPoints;
          updatedCount++;
          
          // Log detailed stats for first few players to debug high projections
          if (updatedCount <= 3) {
            console.log(`\n🔍 Player: ${player.playerName} (${player.nflTeam})`);
            console.log(`   Passing: ${playerProjection.PassingYards || 0} yds, ${playerProjection.PassingTouchdowns || 0} TDs`);
            console.log(`   Rushing: ${playerProjection.RushingYards || 0} yds, ${playerProjection.RushingTouchdowns || 0} TDs`);
            console.log(`   Receiving: ${playerProjection.Receptions || 0} rec, ${playerProjection.ReceivingYards || 0} yds, ${playerProjection.ReceivingTouchdowns || 0} TDs`);
            console.log(`   Projected Fantasy Points: ${projectedFantasyPoints}`);
          }
          
          updateResults.push({
            team: team.teamName,
            player: player.playerName,
            nflTeam: player.nflTeam,
            previousProjection: team.projectedPoints[round][index],
            newProjection: projectedFantasyPoints,
            updated: true
          });
        } else {
          updateResults.push({
            team: team.teamName,
            player: player.playerName,
            nflTeam: player.nflTeam,
            previousProjection: team.projectedPoints[round][index],
            newProjection: team.projectedPoints[round][index],
            updated: false,
            reason: 'Player projection not found in API (likely bye week or not playing)'
          });
        }
      });
      
      // Update the team's projections
      updateTeamProjections(team.teamName, round, updatedProjections);
    }

    res.json({
      success: true,
      message: `Updated projections for ${round} round`,
      totalProjectionsAvailable: allProjections.length,
      playersUpdated: updatedCount,
      details: updateResults
    });

  } catch (error) {
    console.error('Error updating projections:', error);
    res.status(500).json({ 
      error: 'Failed to update projections',
      message: error.message 
    });
  }
});

// Update projections using player props (betting lines)
app.post('/api/update-projections-props/:round', async (req, res) => {
  try {
    const round = req.params.round.toLowerCase();
    
    // Validate round
    if (!['wildcard', 'divisional', 'championship', 'superbowl'].includes(round)) {
      return res.status(400).json({ error: 'Invalid round. Must be: wildcard, divisional, championship, or superbowl' });
    }

    // Read data to get games for this round
    const data = readData();
    const games = data.nflGames[round];
    
    if (!games || games.length === 0) {
      return res.status(400).json({ error: `No games scheduled for ${round} round` });
    }

    // Helper function to convert prop value to stat projection
    function propToStat(propName, propValue) {
      const projections = {};
      
      // Map common prop names to stat fields
      const propMap = {
        'passing yards': 'PassingYards',
        'pass yds': 'PassingYards',
        'passing tds': 'PassingTouchdowns',
        'pass td': 'PassingTouchdowns',
        'rushing yards': 'RushingYards',
        'rush yds': 'RushingYards',
        'rushing tds': 'RushingTouchdowns',
        'rush td': 'RushingTouchdowns',
        'receiving yards': 'ReceivingYards',
        'rec yds': 'ReceivingYards',
        'receiving tds': 'ReceivingTouchdowns',
        'rec td': 'ReceivingTouchdowns',
        'receptions': 'Receptions'
      };
      
      const normalizedProp = propName.toLowerCase().trim();
      const statField = propMap[normalizedProp];
      
      if (statField && propValue !== null && propValue !== undefined) {
        projections[statField] = propValue;
      }
      
      return projections;
    }

    // Fetch scores to get ScoreIDs for each game
    const week = roundToWeek(round);
    const scoresResponse = await fetch(`https://api.sportsdata.io/v3/nfl/scores/json/ScoresByWeek/2025POST/${week}?key=f0385433686543c48e1dd86818d4da12`);
    const scores = await scoresResponse.json();
    
    console.log(`\n📊 Fetching player props for ${round} (week ${week})`);
    console.log(`Found ${scores.length} games with scores`);

    // Collect all player props from all games
    const allPlayerProps = {}; // { "PlayerName_Team": { PassingYards: 250, ... } }
    
    for (const score of scores) {
      try {
        const props = await getPlayerPropsByScoreID(score.ScoreID);
        
        console.log(`\nGame ${score.AwayTeam} @ ${score.HomeTeam} (ScoreID: ${score.ScoreID})`);
        console.log(`  Props markets found: ${props?.length || 0}`);
        
        // Filter and log Player Props specifically
        if (props && props.length > 0) {
          const playerPropMarkets = props.filter(m => m.BettingMarketType === 'Player Prop');
          console.log(`  Player Prop markets: ${playerPropMarkets.length}`);
          
          // Log first 5 player prop markets
          console.log('  Sample Player Props:');
          playerPropMarkets.slice(0, 5).forEach((market, idx) => {
            console.log(`    [${idx}] Name: "${market.Name}"`);
            console.log(`        Outcomes: ${market.BettingOutcomes?.length || 0}`);
            if (market.BettingOutcomes && market.BettingOutcomes.length > 0) {
              const outcome = market.BettingOutcomes[0];
              console.log(`        Sample outcome:`, JSON.stringify({
                PlayerName: outcome.PlayerName,
                TeamKey: outcome.TeamKey,
                Value: outcome.Value,
                BetType: outcome.BetType,
                ParticipantName: outcome.ParticipantName
              }, null, 10));
            }
          });
        }
        
        if (props && props.length > 0) {
          // Parse through betting markets to extract player props
          props.forEach(market => {
            if (market.BettingOutcomes && market.BettingOutcomes.length > 0) {
              market.BettingOutcomes.forEach(outcome => {
                if (outcome.PlayerName && outcome.Value) {
                  const key = `${outcome.PlayerName}_${outcome.TeamKey || ''}`;
                  
                  if (!allPlayerProps[key]) {
                    allPlayerProps[key] = {
                      name: outcome.PlayerName,
                      team: outcome.TeamKey,
                      props: {}
                    };
                  }
                  
                  // Extract stat projections from prop
                  const statProj = propToStat(market.Name || '', outcome.Value);
                  Object.assign(allPlayerProps[key].props, statProj);
                }
              });
            }
          });
        }
      } catch (error) {
        console.error(`Error fetching props for ScoreID ${score.ScoreID}:`, error.message);
      }
    }

    console.log(`\nTotal unique players with props: ${Object.keys(allPlayerProps).length}`);

    let updatedCount = 0;
    const updateResults = [];

    // Loop through all fantasy teams and update projections
    for (const team of data.teams) {
      // Initialize projectedPoints if it doesn't exist
      if (!team.projectedPoints) {
        team.projectedPoints = {
          wildcard: [0, 0, 0, 0, 0, 0, 0, 0],
          divisional: [0, 0, 0, 0, 0, 0, 0, 0],
          championship: [0, 0, 0, 0, 0, 0, 0, 0],
          superbowl: [0, 0, 0, 0, 0, 0, 0, 0]
        };
      }
      
      const updatedProjections = [...team.projectedPoints[round]];
      
      team.roster.forEach((player, index) => {
        const key = `${player.playerName}_${player.nflTeam}`;
        const playerPropsData = allPlayerProps[key];
        
        if (playerPropsData && Object.keys(playerPropsData.props).length > 0) {
          // Calculate fantasy points from props
          const projectedFantasyPoints = calculateFantasyPoints(playerPropsData.props);
          updatedProjections[index] = projectedFantasyPoints;
          updatedCount++;
          
          updateResults.push({
            team: team.teamName,
            player: player.playerName,
            nflTeam: player.nflTeam,
            previousProjection: team.projectedPoints[round][index],
            newProjection: projectedFantasyPoints,
            propsUsed: playerPropsData.props,
            updated: true
          });
        } else {
          updateResults.push({
            team: team.teamName,
            player: player.playerName,
            nflTeam: player.nflTeam,
            previousProjection: team.projectedPoints[round][index],
            newProjection: team.projectedPoints[round][index],
            updated: false,
            reason: 'No betting props available for this player'
          });
        }
      });
      
      // Update the team's projections
      updateTeamProjections(team.teamName, round, updatedProjections);
    }

    res.json({
      success: true,
      message: `Updated projections for ${round} round using player props`,
      gamesProcessed: scores.length,
      playersWithProps: Object.keys(allPlayerProps).length,
      playersUpdated: updatedCount,
      details: updateResults
    });

  } catch (error) {
    console.error('Error updating projections from props:', error);
    res.status(500).json({ 
      error: 'Failed to update projections from props',
      message: error.message 
    });
  }
});

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🏈 Fantasy Football Playoff Tracker running on http://localhost:${PORT}`);
});
