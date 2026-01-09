const fs = require('fs');
const path = require('path');

// Load the data
const dataPath = path.join(__dirname, 'data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

/**
 * Calculate variance using the scaled Bernoulli formula:
 * Variance = (ProjectedPoints²) × p × (1 − p)
 * 
 * Where:
 * - ProjectedPoints = expected points if the player's team reaches that round
 * - p = probability the team reaches that round
 * - (1 - p) = probability the team does NOT reach that round
 * 
 * This captures advancement uncertainty - the biggest source of variance in playoff fantasy.
 */

const rounds = ['wildcard', 'divisional', 'championship', 'superbowl'];

console.log('Calculating variance for all teams using advancement probability formula...\n');

// Process each team
data.teams.forEach(team => {
    console.log(`\nProcessing: ${team.teamName}`);
    
    // Initialize variance object if it doesn't exist
    if (!team.variance) {
        team.variance = {
            wildcard: [],
            divisional: [],
            championship: [],
            superbowl: []
        };
    }
    
    // Calculate variance for each round
    rounds.forEach((round, roundIndex) => {
        team.variance[round] = team.roster.map((player, playerIndex) => {
            const nflTeam = player.nflTeam;
            const projectedPoints = team.projectedPoints[round][playerIndex];
            const probability = data.teamProbabilities[nflTeam]?.[roundIndex] ?? 0;
            
            // Variance = (projectedPoints²) × p × (1 − p)
            const variance = Math.pow(projectedPoints, 2) * probability * (1 - probability);
            
            // Round to 1 decimal place
            const roundedVariance = Math.round(variance * 10) / 10;
            
            if (roundIndex === 0) {
                console.log(`  ${player.playerName} (${nflTeam}): σ² = ${roundedVariance.toFixed(1)}`);
            }
            
            return roundedVariance;
        });
    });
});

// Add timestamp for when variance was last calculated
data.lastUpdated = data.lastUpdated || {};
data.lastUpdated.variance = new Date().toISOString();

// Write back to file
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');

console.log('\n✅ Variance calculated and saved to data.json');
console.log(`📅 Timestamp: ${data.lastUpdated.variance}`);
console.log('\nFormula used: Variance = (ProjectedPoints²) × p × (1 − p)');
console.log('This captures advancement uncertainty - the primary source of variance in playoff fantasy.');

// Show example calculation
console.log('\n📊 Example calculation:');
const exampleTeam = data.teams.find(t => t.teamName === 'Ryan');
const examplePlayer = exampleTeam.roster[0]; // Josh Allen
const exampleProj = exampleTeam.projectedPoints.divisional[0];
const exampleProb = data.teamProbabilities['BUF'][1]; // divisional
const exampleVar = exampleTeam.variance.divisional[0];

console.log(`Player: ${examplePlayer.playerName} (BUF) - Divisional Round`);
console.log(`Projected Points: ${exampleProj}`);
console.log(`Advancement Probability: ${exampleProb}`);
console.log(`Variance: ${exampleProj}² × ${exampleProb} × ${(1-exampleProb).toFixed(3)} = ${exampleVar.toFixed(1)}`);
console.log(`Standard Deviation: σ = √${exampleVar.toFixed(1)} = ${Math.sqrt(exampleVar).toFixed(2)}`);

// Calculate and display team-level stats
console.log('\n📈 Team-level variance summary:');
data.teams.forEach(team => {
    // Sum variance across all players and rounds
    const totalVariance = rounds.reduce((sum, round) => {
        return sum + team.variance[round].reduce((s, v) => s + v, 0);
    }, 0);
    
    const totalExpected = rounds.reduce((sum, round) => {
        return sum + team.expectedPoints[round].reduce((s, v) => s + v, 0);
    }, 0);
    
    const teamStdDev = Math.sqrt(totalVariance);
    
    console.log(`  ${team.teamName}: EV=${totalExpected.toFixed(1)}, σ=${teamStdDev.toFixed(1)} (CV=${(teamStdDev/totalExpected*100).toFixed(1)}%)`);
});

console.log('\n💡 Next steps:');
console.log('1. Run this script whenever projections or probabilities change');
console.log('2. Use variance in Monte Carlo simulations for more accurate win probabilities');
console.log('3. Calculate team-level percentiles: P25 = EV - 0.674×σ, P75 = EV + 0.674×σ');
