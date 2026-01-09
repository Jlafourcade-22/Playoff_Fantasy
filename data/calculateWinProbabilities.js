const fs = require('fs');
const path = require('path');
const { calculateWinProbabilities } = require('../utils/winProbability');

// Read the data file
const dataPath = path.join(__dirname, 'data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Calculate win probabilities
console.log('Calculating win probabilities (10,000 simulations)...');
const probabilities = calculateWinProbabilities(data.teams);

// Add to data structure with timestamp
data.winProbabilities = probabilities;
data.lastUpdated = data.lastUpdated || {};
data.lastUpdated.winProbabilities = new Date().toISOString();

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

fs.writeFileSync(dataPath, formatted, 'utf8');

console.log('\n✅ Win probabilities calculated and saved!');
console.log(`📅 Last Updated: ${data.lastUpdated.winProbabilities}`);
console.log('\nTop 3 teams:');
probabilities.slice(0, 3).forEach((team, index) => {
  console.log(`${index + 1}. ${team.teamName}: ${team.winProbability}% win chance (${team.expectedTotal} expected pts)`);
});
