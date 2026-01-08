const express = require('express');
const cors = require('cors');
const path = require('path');
const { getAllTeams, getTeamByName, getFantasyData, updateTeamScores } = require('./data/mockDb');

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

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🏈 Fantasy Football Playoff Tracker running on http://localhost:${PORT}`);
});
