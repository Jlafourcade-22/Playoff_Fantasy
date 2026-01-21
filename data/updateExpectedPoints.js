require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { updateTeamExpectedPoints, updateLastUpdated, getFantasyData, getTeamProbabilities } = require('./supabaseDb');

// Read the data file for team probabilities
const dataPath = path.join(__dirname, 'data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const rounds = ['wildcard', 'divisional', 'championship', 'superbowl'];

console.log('Updating expected points based on win probabilities...\n');
console.log('📡 Fetching data from Supabase...\n');

// Track Supabase updates
const supabaseUpdates = [];

async function updateExpectedPoints() {
  try {
    // Get team probabilities from Supabase
    const teamProbabilities = await getTeamProbabilities();
    
    // Convert format from {team: {wildcard: x, divisional: y}} to {team: [x, y, z, w]}
    const teamProbsArray = {};
    for (const [team, probs] of Object.entries(teamProbabilities)) {
      teamProbsArray[team] = [
        probs.wildcard,
        probs.divisional,
        probs.championship,
        probs.superbowl
      ];
    }
    
    // Get all teams from data.json for the team list
    for (const team of data.teams) {
      console.log(`Processing team: ${team.teamName}`);
      
      // Fetch team data from Supabase (includes roster, scores, projections)
      const teamData = await getFantasyData(team.teamName);
      
      // Rounds that have been completed
      const completedRounds = ['wildcard', 'divisional'];
      
      // For each round
      rounds.forEach((round, roundIndex) => {
        const roundExpectedPoints = [];
        
        // For each player in the roster
        teamData.roster.forEach((player, playerIndex) => {
          const nflTeam = player.nflTeam;
          const actualScore = teamData.scores[round][playerIndex];
          const projectedPoints = teamData.projectedPoints[round][playerIndex];
          
          let expectedPoints;
          
          if (completedRounds.includes(round)) {
            // Round has been completed - use actual score if available, otherwise 0
            expectedPoints = actualScore !== null ? actualScore : 0;
            console.log(`  ${player.playerName} (${round}): Using actual score ${expectedPoints}`);
          } else {
            // Round hasn't been played - use projected points * probability
            const teamProb = teamProbsArray[nflTeam];
            const probability = teamProb ? teamProb[roundIndex] : 0;
            expectedPoints = projectedPoints * probability;
            console.log(`  ${player.playerName} (${round}): Using projected ${projectedPoints} * prob ${probability} = ${expectedPoints.toFixed(1)}`);
          }
          
          // Update the expected points array
          const finalExpectedPoints = parseFloat(expectedPoints.toFixed(1));
          roundExpectedPoints.push(finalExpectedPoints);
          
          // Also update in data.json structure for compatibility
          if (!team.expectedPoints) team.expectedPoints = {};
          if (!team.expectedPoints[round]) team.expectedPoints[round] = [];
          team.expectedPoints[round][playerIndex] = finalExpectedPoints;
        });
        
        // Queue Supabase update for this team and round
        supabaseUpdates.push({
          teamName: team.teamName,
          round: round,
          expectedPoints: roundExpectedPoints
        });
      });
    }
    
    // Write back to data.json for compatibility
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
    
    console.log('\n✅ Expected points updated in data.json successfully!');
    
    // Update Supabase
    console.log('\n📡 Updating Supabase...');
    
    for (const update of supabaseUpdates) {
      await updateTeamExpectedPoints(update.teamName, update.round, update.expectedPoints);
      console.log(`  ✓ Updated ${update.teamName} - ${update.round}`);
    }
    
    // Update timestamp
    await updateLastUpdated('expected_points');
    
    console.log('\n✅ Supabase updated successfully!');
    console.log('📅 Last Updated:', new Date().toISOString());
  } catch (error) {
    console.error('❌ Error updating expected points:', error.message);
    process.exit(1);
  }
}

updateExpectedPoints();
