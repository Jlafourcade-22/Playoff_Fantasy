/**
 * Calculate fantasy points for a player based on standard scoring
 * @param {Object} playerStats - Player game stats from SportsData.io API
 * @returns {number} Fantasy points rounded to 1 decimal
 */
function calculateFantasyPoints(playerStats) {
  let points = 0;

  // Passing stats
  if (playerStats.PassingYards) {
    points += playerStats.PassingYards * 0.04; // 1 point per 25 yards
  }
  if (playerStats.PassingTouchdowns) {
    points += playerStats.PassingTouchdowns * 6;
  }
  if (playerStats.Interceptions) {
    points -= playerStats.Interceptions * 2;
  }

  // Rushing stats
  if (playerStats.RushingYards) {
    points += playerStats.RushingYards * 0.1; // 1 point per 10 yards
  }
  if (playerStats.RushingTouchdowns) {
    points += playerStats.RushingTouchdowns * 6;
  }

  // Receiving stats
  if (playerStats.ReceivingYards) {
    points += playerStats.ReceivingYards * 0.1; // 1 point per 10 yards
  }
  if (playerStats.Receptions) {
    points += playerStats.Receptions * 1; // PPR
  }
  if (playerStats.ReceivingTouchdowns) {
    points += playerStats.ReceivingTouchdowns * 6;
  }

  // Fumbles
  if (playerStats.FumblesLost) {
    points -= playerStats.FumblesLost * 2;
  }

  // 2-Point Conversions
  if (playerStats.TwoPointConversionPasses) {
    points += playerStats.TwoPointConversionPasses * 2;
  }
  if (playerStats.TwoPointConversionRuns) {
    points += playerStats.TwoPointConversionRuns * 2;
  }
  if (playerStats.TwoPointConversionReceptions) {
    points += playerStats.TwoPointConversionReceptions * 2;
  }

  return points
}

/**
 * Get readable scoring breakdown for a player
 * @param {Object} playerStats - Player game stats
 * @returns {Object} Breakdown of points by category
 */
function getPointsBreakdown(playerStats) {
  return {
    passing: {
      yards: playerStats.PassingYards || 0,
      touchdowns: playerStats.PassingTouchdowns || 0,
      interceptions: playerStats.Interceptions || 0,
      points: (
        (playerStats.PassingYards || 0) * 0.04 +
        (playerStats.PassingTouchdowns || 0) * 4 -
        (playerStats.Interceptions || 0) * 2
      )
    },
    rushing: {
      yards: playerStats.RushingYards || 0,
      touchdowns: playerStats.RushingTouchdowns || 0,
      points: (
        (playerStats.RushingYards || 0) * 0.1 +
        (playerStats.RushingTouchdowns || 0) * 6
      )
    },
    receiving: {
      receptions: playerStats.Receptions || 0,
      yards: playerStats.ReceivingYards || 0,
      touchdowns: playerStats.ReceivingTouchdowns || 0,
      points: (
        (playerStats.Receptions || 0) * 0.5 +
        (playerStats.ReceivingYards || 0) * 0.1 +
        (playerStats.ReceivingTouchdowns || 0) * 6
      )
    },
    misc: {
      fumblesLost: playerStats.FumblesLost || 0,
      twoPointConversions: (playerStats.TwoPointConversionPasses || 0) +
                           (playerStats.TwoPointConversionRuns || 0) +
                           (playerStats.TwoPointConversionReceptions || 0),
      points: (
        -(playerStats.FumblesLost || 0) * 2 +
        ((playerStats.TwoPointConversionPasses || 0) +
         (playerStats.TwoPointConversionRuns || 0) +
         (playerStats.TwoPointConversionReceptions || 0)) * 2
      )
    }
  };
}

module.exports = {
  calculateFantasyPoints,
  getPointsBreakdown
};
