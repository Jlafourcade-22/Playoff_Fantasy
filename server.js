const express = require('express');
const cors = require('cors');
const path = require('path');
const { getAllTeams, getTeamByName, getFantasyData, updateTeamScores, readData } = require('./data/mockDb');
const { getPlayerGameStatsByWeek, getPlayerGameStatsByTeam, findPlayerStats, roundToWeek } = require('./services/sportsDataService');
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

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🏈 Fantasy Football Playoff Tracker running on http://localhost:${PORT}`);
});
