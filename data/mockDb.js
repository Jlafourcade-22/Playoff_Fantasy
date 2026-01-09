const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');

// Read data from JSON file
function readData() {
  try {
    const rawData = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error('Error reading data file:', error);
    return { teams: [] };
  }
}

// Write data to JSON file
function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing data file:', error);
    return false;
  }
}

// Get all teams
function getAllTeams() {
  const data = readData();
  return data.teams;
}

// Get single team by name
function getTeamByName(teamName) {
  const data = readData();
  return data.teams.find(team => team.teamName.toLowerCase() === teamName.toLowerCase());
}

// Get fantasy data for a specific team
function getFantasyData(teamName) {
  const team = getTeamByName(teamName);
  
  if (!team) {
    throw new Error(`Team "${teamName}" not found`);
  }

  const data = team.roster.map((player, index) => ({
    slot: player.slot,
    playerName: player.playerName,
    nflTeam: player.nflTeam,
    wildcard: team.scores.wildcard[index],
    divisional: team.scores.divisional[index],
    championship: team.scores.championship[index],
    superbowl: team.scores.superbowl[index],
    total: (team.scores.wildcard[index] || 0) + (team.scores.divisional[index] || 0) + 
           (team.scores.championship[index] || 0) + (team.scores.superbowl[index] || 0)
  }));

  // Calculate team totals
  const teamTotal = {
    slot: 'TEAM TOTAL',
    playerName: '',
    wildcard: team.scores.wildcard.reduce((a, b) => a + (b || 0), 0),
    divisional: team.scores.divisional.reduce((a, b) => a + (b || 0), 0),
    championship: team.scores.championship.reduce((a, b) => a + (b || 0), 0),
    superbowl: team.scores.superbowl.reduce((a, b) => a + (b || 0), 0),
    total: 0
  };
  teamTotal.total = teamTotal.wildcard + teamTotal.divisional + teamTotal.championship + teamTotal.superbowl;

  return {
    teamName: team.teamName,
    coach: team.coach,
    roster: data,
    teamTotal
  };
}

// Update scores for a team
function updateTeamScores(teamName, round, scores) {
  const data = readData();
  const teamIndex = data.teams.findIndex(team => team.teamName.toLowerCase() === teamName.toLowerCase());
  
  if (teamIndex === -1) {
    throw new Error(`Team "${teamName}" not found`);
  }

  if (!['wildcard', 'divisional', 'championship', 'superbowl'].includes(round)) {
    throw new Error(`Invalid round: ${round}`);
  }

  data.teams[teamIndex].scores[round] = scores;
  return writeData(data);
}

module.exports = { 
  getAllTeams,
  getTeamByName,
  getFantasyData,
  updateTeamScores,
  readData,
  writeData
};
