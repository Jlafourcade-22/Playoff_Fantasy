const fs = require('fs');
const { calculateWinProbabilities } = require('../utils/winProbability');

// Read the data file
const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

// Calculate win probabilities
console.log('Calculating win probabilities (10,000 simulations)...');
const probabilities = calculateWinProbabilities(data.teams);

// Add to data structure
data.winProbabilities = probabilities;

// Write back to file
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

console.log('\nWin probabilities calculated and saved!');
console.log('\nTop 3 teams:');
probabilities.slice(0, 3).forEach((team, index) => {
  console.log(`${index + 1}. ${team.teamName}: ${team.winProbability}% win chance (${team.expectedTotal} expected pts)`);
});
