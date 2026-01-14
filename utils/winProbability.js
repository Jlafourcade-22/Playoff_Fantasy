// Monte Carlo simulation for rotisserie fantasy league win probabilities

const SIMULATIONS = 10000;

/**
 * Generate a random value from normal distribution using Box-Muller transform
 */
function randomNormal(mean, stdDev) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
}

/**
 * Simulate one complete playoff season for all teams
 * Uses individual player variances from team.variance arrays
 */
function simulateOneSeason(teams) {
  return teams.map(team => {
    // Sum all player scores for this team
    let totalScore = 0;
    
    const rounds = ['wildcard', 'divisional', 'championship', 'superbowl'];
    
    rounds.forEach((round, roundIdx) => {
      if (roundIdx === 0) {
        // For wildcard, use actual scores
        team.scores.wildcard.forEach(score => {
          totalScore += (score || 0);
        });
      } else {
        // For other rounds, use expected points with variance
        team.expectedPoints[round].forEach((expectedPts, idx) => {
          // Get player's variance for this round
          const variance = team.variance[round][idx];
          const stdDev = Math.sqrt(variance);
          
          // Generate random score with player-specific standard deviation
          totalScore += randomNormal(expectedPts, stdDev);
        });
      }
    });
    
    return {
      teamName: team.teamName,
      totalScore: totalScore
    };
  });
}

/**
 * Run Monte Carlo simulation to calculate win probabilities
 */
function calculateWinProbabilities(teams) {
  // Initialize finish counts for each team
  const finishCounts = {};
  const expectedTotals = {};
  
  teams.forEach(team => {
    finishCounts[team.teamName] = [0, 0, 0, 0, 0, 0, 0, 0]; // counts for 1st through 8th
    
    // Calculate total expected points: wildcard actual scores + expected for remaining rounds
    const totalExpected = 
      team.scores.wildcard.reduce((a, b) => a + (b || 0), 0) +
      team.expectedPoints.divisional.reduce((a, b) => a + b, 0) +
      team.expectedPoints.championship.reduce((a, b) => a + b, 0) +
      team.expectedPoints.superbowl.reduce((a, b) => a + b, 0);
    
    expectedTotals[team.teamName] = totalExpected;
  });
  
  // Run simulations
  for (let i = 0; i < SIMULATIONS; i++) {
    const results = simulateOneSeason(teams);
    
    // Sort by total score (descending)
    results.sort((a, b) => b.totalScore - a.totalScore);
    
    // Record finish position for each team
    results.forEach((result, position) => {
      finishCounts[result.teamName][position]++;
    });
  }
  
  // Calculate probabilities
  const probabilities = {};
  
  teams.forEach(team => {
    const counts = finishCounts[team.teamName];
    probabilities[team.teamName] = {
      teamName: team.teamName,
      expectedTotal: Math.round(expectedTotals[team.teamName] * 10) / 10,
      finishProbabilities: counts.map(count => 
        Math.round((count / SIMULATIONS) * 1000) / 10 // percentage with 1 decimal
      ),
      winProbability: Math.round((counts[0] / SIMULATIONS) * 1000) / 10,
      top3Probability: Math.round(((counts[0] + counts[1] + counts[2]) / SIMULATIONS) * 1000) / 10,
      lastPlaceProbability: Math.round((counts[7] / SIMULATIONS) * 1000) / 10
    };
  });
  
  // Sort by win probability (descending)
  const sorted = Object.values(probabilities).sort((a, b) => b.winProbability - a.winProbability);
  
  return sorted;
}

module.exports = {
  calculateWinProbabilities
};
