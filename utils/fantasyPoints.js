/**
 * Calculate fantasy points for a player based on standard scoring
 * @param {Object} playerStats - Player game stats from SportsData.io API
 * @returns {Object} Object with total points and scoring breakdown
 */
function calculateFantasyPoints(playerStats) {
  const breakdown = {};
  let totalPoints = 0;

  // Passing Yards (0.04 per yard = 1 point per 25 yards)
  if (playerStats.PassingYards && playerStats.PassingYards > 0) {
    const points = playerStats.PassingYards * 0.04;
    breakdown.passing_yards = {
      stat: `${playerStats.PassingYards} yds`,
      calculation: `${playerStats.PassingYards} × 0.04`,
      points: parseFloat(points.toFixed(2))
    };
    totalPoints += points;
  }

  // Passing Touchdowns (6 points each)
  if (playerStats.PassingTouchdowns && playerStats.PassingTouchdowns > 0) {
    const points = playerStats.PassingTouchdowns * 6;
    breakdown.passing_tds = {
      stat: `${playerStats.PassingTouchdowns} TD`,
      calculation: `${playerStats.PassingTouchdowns} × 6`,
      points: parseFloat(points.toFixed(2))
    };
    totalPoints += points;
  }

  // Interceptions (-2 points each)
  if (playerStats.Interceptions && playerStats.Interceptions > 0) {
    const points = playerStats.Interceptions * -2;
    breakdown.interceptions = {
      stat: `${playerStats.Interceptions} INT`,
      calculation: `${playerStats.Interceptions} × -2`,
      points: parseFloat(points.toFixed(2))
    };
    totalPoints += points;
  }

  // Rushing Yards (0.1 per yard = 1 point per 10 yards)
  if (playerStats.RushingYards && playerStats.RushingYards > 0) {
    const points = playerStats.RushingYards * 0.1;
    breakdown.rushing_yards = {
      stat: `${playerStats.RushingYards} yds`,
      calculation: `${playerStats.RushingYards} × 0.1`,
      points: parseFloat(points.toFixed(2))
    };
    totalPoints += points;
  }

  // Rushing Touchdowns (6 points each)
  if (playerStats.RushingTouchdowns && playerStats.RushingTouchdowns > 0) {
    const points = playerStats.RushingTouchdowns * 6;
    breakdown.rushing_tds = {
      stat: `${playerStats.RushingTouchdowns} TD`,
      calculation: `${playerStats.RushingTouchdowns} × 6`,
      points: parseFloat(points.toFixed(2))
    };
    totalPoints += points;
  }

  // Receptions (1 point each - PPR)
  if (playerStats.Receptions && playerStats.Receptions > 0) {
    const points = playerStats.Receptions * 1;
    breakdown.receptions = {
      stat: `${playerStats.Receptions} rec`,
      calculation: `${playerStats.Receptions} × 1`,
      points: parseFloat(points.toFixed(2))
    };
    totalPoints += points;
  }

  // Receiving Yards (0.1 per yard = 1 point per 10 yards)
  if (playerStats.ReceivingYards && playerStats.ReceivingYards > 0) {
    const points = playerStats.ReceivingYards * 0.1;
    breakdown.receiving_yards = {
      stat: `${playerStats.ReceivingYards} yds`,
      calculation: `${playerStats.ReceivingYards} × 0.1`,
      points: parseFloat(points.toFixed(2))
    };
    totalPoints += points;
  }

  // Receiving Touchdowns (6 points each)
  if (playerStats.ReceivingTouchdowns && playerStats.ReceivingTouchdowns > 0) {
    const points = playerStats.ReceivingTouchdowns * 6;
    breakdown.receiving_tds = {
      stat: `${playerStats.ReceivingTouchdowns} TD`,
      calculation: `${playerStats.ReceivingTouchdowns} × 6`,
      points: parseFloat(points.toFixed(2))
    };
    totalPoints += points;
  }

  // Fumbles Lost (-2 points each)
  if (playerStats.FumblesLost && playerStats.FumblesLost > 0) {
    const points = playerStats.FumblesLost * -2;
    breakdown.fumbles_lost = {
      stat: `${playerStats.FumblesLost} lost`,
      calculation: `${playerStats.FumblesLost} × -2`,
      points: parseFloat(points.toFixed(2))
    };
    totalPoints += points;
  }

  // 2-Point Conversions (2 points each)
  const twoPointTotal = (playerStats.TwoPointConversionPasses || 0) +
                        (playerStats.TwoPointConversionRuns || 0) +
                        (playerStats.TwoPointConversionReceptions || 0);
  
  if (twoPointTotal > 0) {
    const points = twoPointTotal * 2;
    breakdown.two_point_conversions = {
      stat: `${twoPointTotal} conversions`,
      calculation: `${twoPointTotal} × 2`,
      points: parseFloat(points.toFixed(2))
    };
    totalPoints += points;
  }

  return {
    points: parseFloat(totalPoints.toFixed(2)),
    breakdown: breakdown
  };
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
