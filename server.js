require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
// Use Supabase for data operations
const { getAllTeams, getTeamByName, getFantasyData, updateTeamScores, updatePlayerScoreWithBreakdown, updatePlayerTwoPointConversions, updateTeamProjections, readData } = require('./data/supabaseDb');
const { getPlayerGameStatsByWeek, getPlayerGameStatsByTeam, getPlayerGameProjectionsByWeek, getPlayerPropsByScoreID, findPlayerStats, roundToWeek } = require('./services/sportsDataService');
const { getPlayerStatsByTeams, getPlayerStatsByGames } = require('./services/espnScraperService');
const { shouldFetchLiveStats, getActiveTeams } = require('./utils/gameHelpers');
const { calculateFantasyPoints, getPointsBreakdown } = require('./utils/fantasyPoints');
const { calculateWinProbabilities } = require('./utils/winProbability');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API Routes

// Get all teams list
app.get('/api/teams', async (req, res) => {
  try {
    const teams = await getAllTeams();
    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Get active games for a round
app.get('/api/active-games/:round', async (req, res) => {
  try {
    const round = req.params.round.toLowerCase();
    const data = await readData();
    const games = data.nflGames[round] || [];
    
    const activeTeams = getActiveTeams(games);
    
    res.json({
      round,
      activeTeams,
      eliminatedTeams: data.eliminatedTeams || [],
      totalActiveGames: activeTeams.length / 2
    });
  } catch (error) {
    console.error('Error fetching active games:', error);
    res.status(500).json({ error: 'Failed to fetch active games' });
  }
});

// Get win probabilities for all teams
app.get('/api/win-probabilities', async (req, res) => {
  try {
    const data = await readData();
    
    // Return stored win probabilities if available
    if (data.winProbabilities) {
      res.json({
        simulations: 10000,
        probabilities: data.winProbabilities,
        timestamp: new Date().toISOString(),
        cached: true,
        lastUpdated: data.lastUpdated || {}
      });
    } else {
      // Fall back to live calculation if not stored
      const probabilities = calculateWinProbabilities(data.teams);
      res.json({
        simulations: 10000,
        probabilities: probabilities,
        timestamp: new Date().toISOString(),
        cached: false,
        lastUpdated: data.lastUpdated || {}
      });
    }
  } catch (error) {
    console.error('Error fetching win probabilities:', error);
    res.status(500).json({ error: 'Failed to fetch win probabilities' });
  }
});

// Get fantasy data for a specific team
app.get('/api/fantasy-data/:teamName', async (req, res) => {
  try {
    const data = await getFantasyData(req.params.teamName);
    res.json(data);
  } catch (error) {
    console.error('Error fetching fantasy data:', error);
    res.status(404).json({ error: error.message });
  }
});

// Legacy endpoint - defaults to first team for backwards compatibility
app.get('/api/fantasy-data', async (req, res) => {
  try {
    const teams = await getAllTeams();
    if (teams.length === 0) {
      return res.status(404).json({ error: 'No teams found' });
    }
    const data = await getFantasyData(teams[0].teamName);
    res.json(data);
  } catch (error) {
    console.error('Error fetching fantasy data:', error);
    res.status(500).json({ error: 'Failed to fetch fantasy data' });
  }
});

// Update scores for a team
app.put('/api/fantasy-data/:teamName/scores', async (req, res) => {
  try {
    const { round, scores } = req.body;
    
    if (!round || !scores) {
      return res.status(400).json({ error: 'Round and scores are required' });
    }

    if (!Array.isArray(scores) || scores.length !== 8) {
      return res.status(400).json({ error: 'Scores must be an array of 8 numbers' });
    }

    await updateTeamScores(req.params.teamName, round, scores);
    
    const updatedData = await getFantasyData(req.params.teamName);
    res.json({ success: true, data: updatedData });
  } catch (error) {
    console.error('Error updating scores:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update manual 2-point conversions for a player
app.put('/api/fantasy-data/:teamName/two-point', async (req, res) => {
  try {
    const { round, playerIndex, twoPtCount } = req.body;
    
    if (!round || playerIndex === undefined || twoPtCount === undefined) {
      return res.status(400).json({ error: 'Round, playerIndex, and twoPtCount are required' });
    }

    if (typeof playerIndex !== 'number' || playerIndex < 0 || playerIndex > 7) {
      return res.status(400).json({ error: 'playerIndex must be a number between 0-7' });
    }

    if (typeof twoPtCount !== 'number' || twoPtCount < 0) {
      return res.status(400).json({ error: 'twoPtCount must be a non-negative number' });
    }

    await updatePlayerTwoPointConversions(req.params.teamName, round, playerIndex, twoPtCount);
    
    const updatedData = await getFantasyData(req.params.teamName);
    res.json({ 
      success: true, 
      message: `Updated ${updatedData.roster[playerIndex].playerName} 2PT conversions to ${twoPtCount} for ${round} round`,
      data: updatedData 
    });
  } catch (error) {
    console.error('Error updating 2PT conversions:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update scores from live API data
app.get('/api/update-scores/:round', async (req, res) => {
  try {
    const round = req.params.round.toLowerCase();
    
    // Validate round
    if (!['wildcard', 'divisional', 'championship', 'superbowl'].includes(round)) {
      return res.status(400).json({ error: 'Invalid round. Must be: wildcard, divisional, championship, or superbowl' });
    }

    // Read data to get games and teams
    const data = await readData();
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
            const result = calculateFantasyPoints(playerStats);
            const fantasyPoints = result.points;
            const breakdown = result.breakdown;
            
            updatedScores[index] = fantasyPoints;
            updatedCount++;
            
            // Update score with breakdown in database
            updatePlayerScoreWithBreakdown(team.teamName, round, index, fantasyPoints, breakdown)
              .catch(err => console.error(`Error updating ${player.playerName}:`, err.message));
            
            updateResults.push({
              team: team.teamName,
              player: player.playerName,
              nflTeam: playerTeam,
              previousScore: team.scores[round][index],
              newScore: fantasyPoints,
              breakdown: breakdown,
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
        await updateTeamScores(team.teamName, round, updatedScores);
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

// Update scores for ALL games in a round (regardless of active status)
app.get('/api/update-scores-all/:round', async (req, res) => {
  try {
    const round = req.params.round.toLowerCase();
    
    // Validate round
    if (!['wildcard', 'divisional', 'championship', 'superbowl'].includes(round)) {
      return res.status(400).json({ error: 'Invalid round. Must be: wildcard, divisional, championship, or superbowl' });
    }

    // Read data to get games and teams
    const data = await readData();
    const games = data.nflGames[round];
    
    if (!games || games.length === 0) {
      return res.status(400).json({ error: `No games scheduled for ${round} round` });
    }

    // Get ALL teams playing in the round (not just active ones)
    const allNFLTeams = [];
    games.forEach(game => {
      allNFLTeams.push(game.homeTeam, game.awayTeam);
    });
    const uniqueNFLTeams = [...new Set(allNFLTeams)];
    
    // Fetch stats from SportsData.io API - one call per team
    const week = roundToWeek(round);
    const statsPromises = uniqueNFLTeams.map(team => 
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

    // Loop through all fantasy teams and update scores for ALL players in this round
    for (const team of data.teams) {
      const updatedScores = [...team.scores[round]]; // Clone current scores
      
      team.roster.forEach((player, index) => {
        const playerTeam = player.nflTeam;
        
        // Update stats for ALL players whose NFL teams are in this round's games
        if (uniqueNFLTeams.includes(playerTeam)) {
          const playerStats = findPlayerStats(allPlayerStats, player.playerName, playerTeam);
          
          if (playerStats) {
            const result = calculateFantasyPoints(playerStats);
            const fantasyPoints = result.points;
            const breakdown = result.breakdown;
            
            updatedScores[index] = fantasyPoints;
            updatedCount++;
            
            // Update score with breakdown in database
            updatePlayerScoreWithBreakdown(team.teamName, round, index, fantasyPoints, breakdown)
              .catch(err => console.error(`Error updating ${player.playerName}:`, err.message));
            
            updateResults.push({
              team: team.teamName,
              player: player.playerName,
              nflTeam: playerTeam,
              previousScore: team.scores[round][index],
              newScore: fantasyPoints,
              breakdown: breakdown,
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
        await updateTeamScores(team.teamName, round, updatedScores);
      }
    }

    res.json({
      success: true,
      message: `Updated scores for ALL games in ${round} round`,
      totalGames: games.length,
      teamsInRound: uniqueNFLTeams.length,
      playersUpdated: updatedCount,
      details: updateResults
    });

  } catch (error) {
    console.error('Error updating all scores:', error);
    res.status(500).json({ 
      error: 'Failed to update all scores',
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
    const data = await readData();
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
      await updateTeamProjections(team.teamName, round, updatedProjections);
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
    const data = await readData();
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
      await updateTeamProjections(team.teamName, round, updatedProjections);
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

// ============================================
// NEW ESPN SCRAPER ENDPOINTS
// ============================================

// Test ESPN scraper - just scrape and return raw data
app.get('/api/test-espn-scraper', async (req, res) => {
  try {
    const { gameId, teams } = req.query;
    
    if (gameId) {
      // Test with specific game ID
      console.log(`\n🔍 Testing ESPN scraper with game ID: ${gameId}`);
      const { scrapeBoxScore } = require('./services/espnScraperService');
      const result = await scrapeBoxScore(gameId);
      
      res.json({
        success: true,
        gameId,
        teamsFound: result.teams,
        totalPlayers: result.players.length,
        players: result.players,
        rawData: result
      });
    } else if (teams) {
      // Test with team abbreviations (comma-separated)
      const teamList = teams.split(',').map(t => t.trim().toUpperCase());
      console.log(`\n🔍 Testing ESPN scraper with teams: ${teamList.join(', ')}`);
      
      const result = await getPlayerStatsByTeams(teamList);
      
      res.json({
        success: true,
        teams: teamList,
        totalPlayers: result.length,
        players: result
      });
    } else {
      res.status(400).json({
        error: 'Please provide either gameId or teams parameter',
        examples: [
          '/api/test-espn-scraper?gameId=401772981',
          '/api/test-espn-scraper?teams=GB,CHI'
        ]
      });
    }
  } catch (error) {
    console.error('Error testing ESPN scraper:', error);
    res.status(500).json({
      error: 'ESPN scraper test failed',
      message: error.message,
      stack: error.stack
    });
  }
});

// Update scores from ESPN box scores (active games only)
app.get('/api/update-scores-espn/:round', async (req, res) => {
  try {
    const round = req.params.round.toLowerCase();
    
    // Validate round
    if (!['wildcard', 'divisional', 'championship', 'superbowl'].includes(round)) {
      return res.status(400).json({ error: 'Invalid round. Must be: wildcard, divisional, championship, or superbowl' });
    }

    // Read data to get games and teams
    const data = await readData();
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
    
    console.log(`\n🔍 Scraping ESPN for active teams: ${activeNFLTeams.join(', ')}`);
    
    // Scrape stats from ESPN box scores - pass games array for date lookup
    const allPlayerStats = await getPlayerStatsByTeams(activeNFLTeams, new Date(), games);
    
    console.log(`✅ Found stats for ${allPlayerStats.length} players from ESPN`);
    
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
            const result = calculateFantasyPoints(playerStats);
            const fantasyPoints = result.points;
            const breakdown = result.breakdown;
            
            updatedScores[index] = fantasyPoints;
            updatedCount++;
            
            // Update score with breakdown in database
            updatePlayerScoreWithBreakdown(team.teamName, round, index, fantasyPoints, breakdown)
              .catch(err => console.error(`Error updating ${player.playerName}:`, err.message));
            
            updateResults.push({
              team: team.teamName,
              player: player.playerName,
              nflTeam: playerTeam,
              previousScore: team.scores[round][index],
              newScore: fantasyPoints,
              breakdown: breakdown,
              updated: true,
              source: 'ESPN'
            });
          } else {
            updateResults.push({
              team: team.teamName,
              player: player.playerName,
              previousScore: team.scores[round][index],
              newScore: team.scores[round][index],
              updated: false,
              reason: 'Player stats not found in ESPN box score',
              source: 'ESPN'
            });
          }
        }
      });
      
      // Update the team's scores if any changed
      if (JSON.stringify(updatedScores) !== JSON.stringify(team.scores[round])) {
        await updateTeamScores(team.teamName, round, updatedScores);
      }
    }

    res.json({
      success: true,
      message: `Updated scores for ${round} round from ESPN`,
      activeGames: activeNFLTeams.length / 2,
      playersUpdated: updatedCount,
      source: 'ESPN Box Score',
      details: updateResults
    });

  } catch (error) {
    console.error('Error updating scores from ESPN:', error);
    res.status(500).json({ 
      error: 'Failed to update scores from ESPN',
      message: error.message 
    });
  }
});

// Update scores for ALL games in a round from ESPN (regardless of active status)
app.get('/api/update-scores-all-espn/:round', async (req, res) => {
  try {
    const round = req.params.round.toLowerCase();
    
    // Validate round
    if (!['wildcard', 'divisional', 'championship', 'superbowl'].includes(round)) {
      return res.status(400).json({ error: 'Invalid round. Must be: wildcard, divisional, championship, or superbowl' });
    }

    // Read data to get games and teams
    const data = await readData();
    const games = data.nflGames[round];
    
    if (!games || games.length === 0) {
      return res.status(400).json({ error: `No games scheduled for ${round} round` });
    }

    // Get ALL teams playing in the round (not just active ones)
    const allNFLTeams = [];
    games.forEach(game => {
      allNFLTeams.push(game.homeTeam, game.awayTeam);
    });
    const uniqueNFLTeams = [...new Set(allNFLTeams)];
    
    console.log(`\n🔍 Scraping ESPN for ALL games in ${round}: ${games.length} matchups`);
    
    // Fetch stats using game matchups (not by date or team)
    const allPlayerStats = await getPlayerStatsByGames(games, round);
    
    console.log(`✅ Found stats for ${allPlayerStats.length} players from ESPN`);
    
    let updatedCount = 0;
    const updateResults = [];

    // Loop through all fantasy teams and update scores for ALL players in this round
    for (const team of data.teams) {
      const updatedScores = [...team.scores[round]]; // Clone current scores
      
      team.roster.forEach((player, index) => {
        const playerTeam = player.nflTeam;
        
        // Update stats for ALL players whose NFL teams are in this round's games
        if (uniqueNFLTeams.includes(playerTeam)) {
          const playerStats = findPlayerStats(allPlayerStats, player.playerName, playerTeam);
          
          if (playerStats) {
            const result = calculateFantasyPoints(playerStats);
            const fantasyPoints = result.points;
            const breakdown = result.breakdown;
            
            updatedScores[index] = fantasyPoints;
            updatedCount++;
            
            // Update score with breakdown in database
            updatePlayerScoreWithBreakdown(team.teamName, round, index, fantasyPoints, breakdown)
              .catch(err => console.error(`Error updating ${player.playerName}:`, err.message));
            
            updateResults.push({
              team: team.teamName,
              player: player.playerName,
              nflTeam: playerTeam,
              previousScore: team.scores[round][index],
              newScore: fantasyPoints,
              breakdown: breakdown,
              updated: true,
              source: 'ESPN'
            });
          } else {
            updateResults.push({
              team: team.teamName,
              player: player.playerName,
              previousScore: team.scores[round][index],
              newScore: team.scores[round][index],
              updated: false,
              reason: 'Player stats not found in ESPN box score',
              source: 'ESPN'
            });
          }
        }
      });
      
      // Update the team's scores if any changed
      if (JSON.stringify(updatedScores) !== JSON.stringify(team.scores[round])) {
        await updateTeamScores(team.teamName, round, updatedScores);
      }
    }

    res.json({
      success: true,
      message: `Updated scores for ALL games in ${round} round from ESPN`,
      totalGames: games.length,
      teamsInRound: uniqueNFLTeams.length,
      playersUpdated: updatedCount,
      source: 'ESPN Box Score',
      details: updateResults
    });

  } catch (error) {
    console.error('Error updating all scores from ESPN:', error);
    res.status(500).json({ 
      error: 'Failed to update all scores from ESPN',
      message: error.message 
    });
  }
});

// Test Supabase connection
app.get('/api/test-supabase', async (req, res) => {
  try {
    const teams = await getAllTeams();
    res.json({
      success: true,
      message: 'Supabase connection successful!',
      teamsFound: teams.length,
      teams: teams
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Supabase connection failed',
      error: error.message
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
