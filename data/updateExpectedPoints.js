const fs = require('fs');
const path = require('path');

// Read the data file
const dataPath = path.join(__dirname, 'data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const rounds = ['wildcard', 'divisional', 'championship', 'superbowl'];

console.log('Updating expected points based on win probabilities...\n');

// Update expected points for each team
data.teams.forEach(team => {
  console.log(`Processing team: ${team.teamName}`);
  
  // For each round
  rounds.forEach((round, roundIndex) => {
    // For each player in the roster
    team.roster.forEach((player, playerIndex) => {
      const nflTeam = player.nflTeam;
      const projectedPoints = team.projectedPoints[round][playerIndex];
      
      // Get the team's probability of making this round
      const teamProb = data.teamProbabilities[nflTeam];
      const probability = teamProb ? teamProb[roundIndex] : 0;
      
      // Calculate expected points (projected * probability)
      const expectedPoints = projectedPoints * probability;
      
      // Update the expected points array
      team.expectedPoints[round][playerIndex] = parseFloat(expectedPoints.toFixed(1));
    });
  });
});

// Write back to file
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');

// Re-apply formatting (single line arrays and player objects)
let formatted = fs.readFileSync(dataPath, 'utf8');

// Make number arrays single line with spaces after commas
formatted = formatted.replace(/\[\s+(null|[\d.]+)(,\s+(null|[\d.]+))*\s+\]/g, (match) => {
  return match.replace(/\s+/g, ' ').replace(/, /g, ', ');
});

// Make player objects single line with spaces after commas
formatted = formatted.replace(/\{\s+"slot":[^}]+\}/g, (match) => {
  return match.replace(/\s+/g, ' ').replace(/,\s+/g, ', ').replace(/:\s+/g, ': ');
});

fs.writeFileSync(dataPath, formatted, 'utf8');

console.log('\n✅ Expected points updated successfully!');
console.log('📅 Last Updated:', new Date().toISOString());
