const fs = require('fs');
const path = require('path');

// Load data and player standard deviations
const dataPath = path.join(__dirname, 'data.json');
const stdDevPath = path.join(__dirname, 'playerStdDev.json');

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const stdDevConfig = JSON.parse(fs.readFileSync(stdDevPath, 'utf8'));

/**
 * Get player-specific standard deviation based on position and adjustments
 */
function getPlayerStdDev(playerName, position) {
  // Normalize position (remove FLEX prefix)
  let normalizedPosition = position;
  if (position.includes('FLEX')) {
    // Try to infer position from player context or default to WR for FLEX
    normalizedPosition = 'WR';
  }

  // Get baseline standard deviation for position
  const baselineStdDev = stdDevConfig.positionBaselines[normalizedPosition] || 8;

  // Apply player-specific adjustment if exists
  const adjustment = stdDevConfig.playerAdjustments[playerName] || 1.0;

  return baselineStdDev * adjustment;
}

/**
 * Calculate enhanced variance combining advancement uncertainty and performance volatility
 * 
 * Total Variance = Advancement Variance + Performance Variance
 * 
 * Where:
 *   Advancement Variance = (ProjectedPoints)² × p × (1-p)
 *   Performance Variance = p × (PlayerStdDev)²
 */
function calculateEnhancedVariance() {
  console.log('Calculating Enhanced Variance (Advancement + Performance Volatility)...\n');

  data.teams.forEach(team => {
    const rounds = ['wildcard', 'divisional', 'championship', 'superbowl'];

    rounds.forEach(round => {
      team.roster.forEach((player, idx) => {
        const projectedPoints = team.projectedPoints[round][idx];
        const nflTeam = player.nflTeam;

        // Get team's probability to reach this round
        const probabilities = data.teamProbabilities[nflTeam];
        if (!probabilities) {
          team.variance[round][idx] = 0;
          return;
        }

        const roundIndex = rounds.indexOf(round);
        const probability = probabilities[roundIndex];

        // Calculate advancement variance (existing formula)
        const advancementVariance = Math.pow(projectedPoints, 2) * probability * (1 - probability);

        // Calculate performance variance (new component)
        const playerStdDev = getPlayerStdDev(player.playerName, player.slot);
        const performanceVariance = probability * Math.pow(playerStdDev, 2);

        // Total variance is the sum
        const totalVariance = advancementVariance + performanceVariance;

        // Store rounded variance
        team.variance[round][idx] = Math.round(totalVariance * 10) / 10;
      });
    });

    // Calculate team-level statistics
    const totalExpectedPoints = team.roster.reduce((sum, player, idx) => {
      return sum + 
        team.expectedPoints.wildcard[idx] +
        team.expectedPoints.divisional[idx] +
        team.expectedPoints.championship[idx] +
        team.expectedPoints.superbowl[idx];
    }, 0);

    const totalVariance = team.roster.reduce((sum, player, idx) => {
      return sum +
        team.variance.wildcard[idx] +
        team.variance.divisional[idx] +
        team.variance.championship[idx] +
        team.variance.superbowl[idx];
    }, 0);

    const totalStdDev = Math.sqrt(totalVariance);
    const coefficientOfVariation = (totalStdDev / totalExpectedPoints) * 100;

    console.log(`${team.teamName}:`);
    console.log(`  Expected Value: ${totalExpectedPoints.toFixed(1)} points`);
    console.log(`  Standard Deviation: ${totalStdDev.toFixed(1)} points`);
    console.log(`  Coefficient of Variation: ${coefficientOfVariation.toFixed(1)}%`);
    console.log();
  });

  // Update timestamp
  data.lastUpdated = data.lastUpdated || {};
  data.lastUpdated.variance = new Date().toISOString();

  // Save updated data
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  console.log('✅ Enhanced variance calculations saved to data.json');
  console.log(`Last Updated: ${data.lastUpdated.variance}`);
}

// Run the calculation
calculateEnhancedVariance();
