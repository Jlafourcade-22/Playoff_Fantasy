const https = require('https');

const API_KEY = process.env.SPORTSDATA_API_KEY || 'f0385433686543c48e1dd86818d4da12';
const BASE_URL = 'api.sportsdata.io';

/**
 * Fetch player game stats for a specific week
 * @param {string} season - Season and type (e.g., "2025POST")
 * @param {number} week - Week number (Postseason: 1=Wildcard, 2=Divisional, 3=Championship, 4=Super Bowl)
 * @returns {Promise<Array>} Array of player game stats
 */
function getPlayerGameStatsByWeek(season, week) {
  return new Promise((resolve, reject) => {
    const path = `/v3/nfl/stats/json/PlayerGameStatsByWeek/${season}/${week}?key=${API_KEY}`;
    
    const options = {
      hostname: BASE_URL,
      path: path,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (error) {
            reject(new Error('Failed to parse API response'));
          }
        } else {
          reject(new Error(`API request failed with status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

/**
 * Find player stats by name and team from API response
 * @param {Array} allPlayerStats - All player stats from API
 * @param {string} playerName - Player's name
 * @param {string} teamAbbr - Team abbreviation
 * @returns {Object|null} Player stats or null if not found
 */
function findPlayerStats(allPlayerStats, playerName, teamAbbr) {
  // Normalize the player name for comparison
  const normalizedSearchName = playerName.toLowerCase().trim();
  
  return allPlayerStats.find(player => {
    const normalizedPlayerName = (player.Name || '').toLowerCase().trim();
    const matchesTeam = player.Team === teamAbbr;
    
    // Check for exact match or partial match
    return matchesTeam && (
      normalizedPlayerName === normalizedSearchName ||
      normalizedPlayerName.includes(normalizedSearchName) ||
      normalizedSearchName.includes(normalizedPlayerName)
    );
  }) || null;
}

/**
 * Get current playoff round information
 * @returns {Object} Current season and week info
 */
function getCurrentPlayoffInfo() {
  // For 2025-2026 season, playoffs start January 2026
  return {
    season: '2025POST',
    week: 1 // Wildcard = 1, Divisional = 2, Championship = 3, Super Bowl = 4
  };
}

/**
 * Map round name to week number
 * @param {string} round - Round name (wildcard, divisional, championship, superbowl)
 * @returns {number} Week number for API
 */
function roundToWeek(round) {
  const mapping = {
    'wildcard': 1,
    'divisional': 2,
    'championship': 3,
    'superbowl': 4
  };
  return mapping[round.toLowerCase()] || 1;
}

module.exports = {
  getPlayerGameStatsByWeek,
  findPlayerStats,
  getCurrentPlayoffInfo,
  roundToWeek
};
