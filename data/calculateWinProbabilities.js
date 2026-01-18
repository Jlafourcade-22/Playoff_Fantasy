require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { calculateWinProbabilities } = require('../utils/winProbability');
const supabase = require('../supabaseClient');
const { updateLastUpdated } = require('./supabaseDb');

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

console.log('\n✅ Win probabilities calculated and saved to data.json!');
console.log(`📅 Last Updated: ${data.lastUpdated.winProbabilities}`);
console.log('\nTop 3 teams:');
probabilities.slice(0, 3).forEach((team, index) => {
  console.log(`${index + 1}. ${team.teamName}: ${team.winProbability}% win chance (${team.expectedTotal} expected pts)`);
});

// Update Supabase
console.log('\n📡 Updating Supabase...');

async function updateSupabase() {
  try {
    // Get team IDs
    const { data: teams, error: teamsError } = await supabase
      .from('fantasy_teams')
      .select('id, team_name');
    
    if (teamsError) throw teamsError;
    
    // Update each team's rankings
    for (const prob of probabilities) {
      const team = teams.find(t => t.team_name === prob.teamName);
      if (!team) {
        console.warn(`  ⚠ Team not found: ${prob.teamName}`);
        continue;
      }
      
      const { error: updateError } = await supabase
        .from('team_rankings')
        .upsert({
          team_id: team.id,
          expected_total: prob.expectedTotal,
          win_probability: prob.winProbability,
          top3_probability: prob.top3Probability,
          last_place_probability: prob.lastPlaceProbability,
          finish_1st: prob.finish_1st,
          finish_2nd: prob.finish_2nd,
          finish_3rd: prob.finish_3rd,
          finish_4th: prob.finish_4th,
          finish_5th: prob.finish_5th,
          finish_6th: prob.finish_6th,
          finish_7th: prob.finish_7th,
          finish_8th: prob.finish_8th
        }, {
          onConflict: 'team_id'
        });
      
      if (updateError) throw updateError;
      console.log(`  ✓ Updated ${prob.teamName}`);
    }
    
    // Update timestamp
    await updateLastUpdated('win_probabilities');
    
    console.log('\n✅ Supabase updated successfully!');
  } catch (error) {
    console.error('❌ Error updating Supabase:', error.message);
    process.exit(1);
  }
}

updateSupabase();
