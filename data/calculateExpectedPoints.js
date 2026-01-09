const fs = require('fs');

// Read the data file
const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

// Round to 1 decimal place
const roundNum = (num) => Math.round(num * 10) / 10;

// Calculate expected points for each team
data.teams.forEach(team => {
  const rounds = ['wildcard', 'divisional', 'championship', 'superbowl'];
  
  rounds.forEach((round, roundIndex) => {
    // For each player in the roster
    team.expectedPoints[round] = team.roster.map((player, playerIndex) => {
      const nflTeam = player.nflTeam;
      const projectedPoints = team.projectedPoints[round][playerIndex];
      
      // Get the team's probability for this round
      const teamProb = data.teamProbabilities[nflTeam];
      
      if (!teamProb) {
        console.warn(`Warning: No probability data for team ${nflTeam}`);
        return 0;
      }
      
      const probability = teamProb[roundIndex];
      
      // Calculate expected points = projected points × probability
      const expectedPoints = projectedPoints * probability;
      
      return roundNum(expectedPoints);
    });
  });
});

// Write the updated data back to the file
fs.writeFileSync('data.json', JSON.stringify(data, null, 2), 'utf8');

// Re-apply formatting (single line arrays and player objects)
let formatted = fs.readFileSync('data.json', 'utf8');

// Make number arrays single line with spaces after commas
formatted = formatted.replace(/\[\s+(null|[\d.]+)(,\s+(null|[\d.]+))*\s+\]/g, (match) => {
  return match.replace(/\s+/g, ' ').replace(/, /g, ', ');
});

// Make player objects single line with spaces after commas
formatted = formatted.replace(/\{\s+"slot":[^}]+\}/g, (match) => {
  return match.replace(/\s+/g, ' ').replace(/,\s+/g, ', ').replace(/:\s+/g, ': ');
});

fs.writeFileSync('data.json', formatted, 'utf8');

console.log('Expected points calculated successfully!');
console.log('\nSample calculations:');
data.teams.slice(0, 2).forEach(team => {
  console.log(`\n${team.teamName}:`);
  const player = team.roster[0];
  console.log(`  ${player.playerName} (${player.nflTeam})`);
  console.log(`    Wildcard: ${team.projectedPoints.wildcard[0]} × ${data.teamProbabilities[player.nflTeam][0]} = ${team.expectedPoints.wildcard[0]}`);
});
