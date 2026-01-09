/**
 * Check if a game is currently active (started but not finished)
 * @param {string} gameTime - ISO timestamp of game start
 * @param {number} gameDurationHours - How long after start to consider game active (default 3.5 hours)
 * @returns {boolean}
 */
function isGameActive(gameTime, gameDurationHours = 3.5) {
  const now = new Date();
  const gameStart = new Date(gameTime);
  const gameEnd = new Date(gameStart.getTime() + (gameDurationHours * 60 * 60 * 1000));
  
  return now >= gameStart && now <= gameEnd;
}

/**
 * Check if a player's team is playing in a given round
 * @param {string} playerTeam - Player's NFL team (e.g., "PHI")
 * @param {Array} games - Array of game objects for the round
 * @returns {Object|null} Game object if team is playing, null otherwise
 */
function getPlayerGame(playerTeam, games) {
  return games.find(game => 
    game.homeTeam === playerTeam || game.awayTeam === playerTeam
  ) || null;
}

/**
 * Check if a player should have live stats fetched
 * @param {string} playerTeam - Player's NFL team
 * @param {Array} games - Array of games for the round
 * @returns {boolean}
 */
function shouldFetchLiveStats(playerTeam, games) {
  const game = getPlayerGame(playerTeam, games);
  if (!game) return false;
  
  return isGameActive(game.gameTime);
}

/**
 * Get all active games for a round
 * @param {Array} games - Array of game objects
 * @returns {Array} Array of active games
 */
function getActiveGames(games) {
  return games.filter(game => isGameActive(game.gameTime));
}

/**
 * Get all teams playing in active games
 * @param {Array} games - Array of game objects
 * @returns {Array} Array of team abbreviations
 */
function getActiveTeams(games) {
  const activeGames = getActiveGames(games);
  const teams = [];
  
  activeGames.forEach(game => {
    teams.push(game.homeTeam, game.awayTeam);
  });
  
  return teams;
}

module.exports = {
  isGameActive,
  getPlayerGame,
  shouldFetchLiveStats,
  getActiveGames,
  getActiveTeams
};
