const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Find game IDs for NFL teams on ESPN
 * Scrapes ESPN's NFL scoreboard to find game IDs
 * @param {Array<string>} teams - Array of team abbreviations (e.g., ["GB", "CHI"])
 * @param {Date} date - Date to search for games (optional, defaults to today)
 * @returns {Promise<Object>} Map of team abbreviations to game IDs
 */
async function findGameIds(teams, date = new Date()) {
  try {
    // Format date as YYYYMMDD for ESPN URL
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    // ESPN scoreboard URL with date
    const url = `https://www.espn.com/nfl/scoreboard/_/seasontype/3/dates/${dateStr}`;
    
    console.log(`Fetching ESPN scoreboard: ${url}`);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const gameIdMap = {};
    
    // ESPN embeds game data in a window.__espnfitt__ variable or in data attributes
    // Try to extract game IDs from links
    $('a[href*="/nfl/game/"]').each((i, elem) => {
      const href = $(elem).attr('href');
      const match = href.match(/gameId\/(\d+)/);
      if (match) {
        const gameId = match[1];
        
        // Try to find team abbreviations near this link
        const section = $(elem).closest('section, div[class*="Scoreboard"], article');
        const text = section.text();
        
        // Check if any of our target teams are mentioned
        teams.forEach(team => {
          const teamUpper = team.toUpperCase();
          if (text.includes(teamUpper) || text.includes(getTeamFullName(team))) {
            gameIdMap[teamUpper] = gameId;
          }
        });
      }
    });
    
    // If we didn't find games this way, try looking in script tags for JSON data
    if (Object.keys(gameIdMap).length === 0) {
      $('script').each((i, elem) => {
        const scriptContent = $(elem).html();
        if (scriptContent && scriptContent.includes('gameId')) {
          // Try to extract game IDs and team info from embedded JSON
          const gameIdMatches = scriptContent.match(/gameId["']?\s*:\s*["']?(\d+)/g);
          if (gameIdMatches) {
            gameIdMatches.forEach(match => {
              const idMatch = match.match(/(\d+)/);
              if (idMatch) {
                const gameId = idMatch[1];
                // Store all found game IDs - we'll verify them later
                teams.forEach(team => {
                  if (!gameIdMap[team.toUpperCase()]) {
                    gameIdMap[team.toUpperCase()] = gameId;
                  }
                });
              }
            });
          }
        }
      });
    }
    
    return gameIdMap;
  } catch (error) {
    console.error('Error finding game IDs:', error.message);
    return {};
  }
}

/**
 * Get team full name from abbreviation
 */
function getTeamFullName(abbr) {
  const teamNames = {
    'GB': 'Packers',
    'CHI': 'Bears',
    'BUF': 'Bills',
    'KC': 'Chiefs',
    'LAR': 'Rams',
    'PHI': 'Eagles',
    'BAL': 'Ravens',
    'DET': 'Lions',
    'SF': '49ers',
    'HOU': 'Texans',
    'LAC': 'Chargers',
    'PIT': 'Steelers',
    'NE': 'Patriots',
    'JAX': 'Jaguars',
    'CAR': 'Panthers'
  };
  return teamNames[abbr.toUpperCase()] || '';
}

/**
 * Scrape ESPN box score for a game
 * @param {string} gameId - ESPN game ID
 * @returns {Promise<Object>} Player statistics from the game
 */
/**
 * Scrape ESPN box score for a game - Uses ESPN API directly
 * @param {string} gameId - ESPN game ID
 * @returns {Promise<Object>} Player statistics from the game
 */
async function scrapeBoxScore(gameId) {
  try {
    // Try ESPN's public API first
    const apiUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${gameId}`;
    console.log(`Fetching from ESPN API: ${apiUrl}`);
    
    const apiResponse = await axios.get(apiUrl);
    const gameData = apiResponse.data;
    
    if (gameData && gameData.boxscore && gameData.boxscore.players) {
      console.log('✅ Got data from ESPN API');
      const playerStats = [];
      const teams = [];
      
      // Extract teams
      if (gameData.boxscore.teams) {
        gameData.boxscore.teams.forEach(teamData => {
          teams.push(teamData.team.abbreviation);
        });
      }
      
      console.log(`Found ${teams.length} teams:`, teams);
      
      // Parse player stats from API response
      gameData.boxscore.players.forEach(teamData => {
        const teamAbbr = teamData.team.abbreviation;
        console.log(`\nProcessing team: ${teamAbbr}`);
        
        // Each team has statistics categories (passing, rushing, receiving, etc.)
        teamData.statistics.forEach(statCategory => {
          const categoryName = statCategory.name; // e.g., "passing", "rushing"
          console.log(`  Category: ${categoryName} (${statCategory.athletes.length} players)`);
          
          statCategory.athletes.forEach(athlete => {
            const playerName = athlete.athlete.displayName;
            const stats = {};
            
            // Map stats based on category
            athlete.stats.forEach((value, index) => {
              const label = statCategory.labels[index];
              stats[label] = value;
            });
            
            // Convert to our format
            let player = findOrCreatePlayer(playerStats, playerName, teamAbbr);
            
            if (categoryName === 'passing') {
              player.passingCompletions = parseInt(stats['C/ATT']?.split('/')[0]) || 0;
              player.passingAttempts = parseInt(stats['C/ATT']?.split('/')[1]) || 0;
              player.passingYards = parseInt(stats['YDS']) || 0;
              player.passingTouchdowns = parseInt(stats['TD']) || 0;
              player.passingInterceptions = parseInt(stats['INT']) || 0;
              player.sacks = parseInt(stats['SACKS']?.split('-')[0]) || 0;
            } else if (categoryName === 'rushing') {
              player.rushingAttempts = parseInt(stats['CAR']) || 0;
              player.rushingYards = parseInt(stats['YDS']) || 0;
              player.rushingTouchdowns = parseInt(stats['TD']) || 0;
            } else if (categoryName === 'receiving') {
              player.receptions = parseInt(stats['REC']) || 0;
              player.receivingYards = parseInt(stats['YDS']) || 0;
              player.receivingTouchdowns = parseInt(stats['TD']) || 0;
            } else if (categoryName === 'fumbles') {
              player.fumblesLost = parseInt(stats['LOST']) || 0;
            }
            
            console.log(`    ✅ ${playerName}: ${JSON.stringify(stats)}`);
          });
        });
      });
      
      console.log(`\nTotal players parsed from API: ${playerStats.length}`);
      return { players: playerStats, teams };
    }
    
    throw new Error('No boxscore data in API response');
    
  } catch (error) {
    console.error(`Error fetching ESPN API for game ${gameId}:`, error.message);
    throw error;
  }
}

/**
 * Convert team full name to abbreviation
 */
function getTeamAbbr(fullName) {
  const teamMap = {
    'Packers': 'GB',
    'Bears': 'CHI',
    'Bills': 'BUF',
    'Chiefs': 'KC',
    'Rams': 'LAR',
    'Eagles': 'PHI',
    'Ravens': 'BAL',
    'Lions': 'DET',
    '49ers': 'SF',
    'Texans': 'HOU',
    'Chargers': 'LAC',
    'Steelers': 'PIT',
    'Patriots': 'NE',
    'Jaguars': 'JAX',
    'Panthers': 'CAR'
  };
  return teamMap[fullName] || fullName.substring(0, 3).toUpperCase();
}

/**
 * Parse passing statistics from box score
 */
function parsePassingStats($, playerStats, teams) {
  // Find all Boxscore__Team sections and look for "Passing" in the text
  $('.Boxscore__Team').each((i, teamSection) => {
    const headerText = $(teamSection).text().trim();
    
    // Check if this is a passing section
    if (headerText.includes('Passing')) {
      console.log(`Found passing section: "${headerText.substring(0, 50)}..."`);
      
      // Identify team
      let team = '';
      if (headerText.includes('Green Bay')) team = 'GB';
      else if (headerText.includes('Chicago')) team = 'CHI';
      else {
        const teamMatch = headerText.match(/^([\w\s]+?)\s+Passing/);
        const teamName = teamMatch ? teamMatch[1].trim().split(' ').pop() : '';
        team = getTeamAbbr(teamName);
      }
      
      console.log(`  Team identified: ${team}`);
      
      // Look for table directly within or after this team section
      // Try different selectors
      const parentDiv = $(teamSection).parent();
      console.log(`    Parent has ${parentDiv.find('table').length} tables`);
      
      // Look for the table that comes right after this team section
      const nextTable = $(teamSection).nextAll('table').first();
      const tableInParent = parentDiv.find('table').first();
      const tableInSibling = $(teamSection).siblings('table').first();
      
      console.log(`    Next table has ${nextTable.find('tbody tr').length} rows`);
      console.log(`    Table in parent has ${tableInParent.find('tbody tr').length} rows`);
      console.log(`    Table in sibling has ${tableInSibling.find('tbody tr').length} rows`);
      
      // Use the table that actually has data
      let table = nextTable.length > 0 ? nextTable : tableInParent;
      
      console.log(`    Using table with ${table.find('tbody tr').length} rows`);
      
      // Parse table rows
      table.find('tbody tr').each((rowIdx, row) => {
        const cells = $(row).find('td');
        console.log(`      Row ${rowIdx}: ${cells.length} cells`);
        
        // Get player name from the row
        const playerName = $(row).find('.Boxscore__Athlete_Name, a.AnchorLink').first().text().trim();
        console.log(`        Player: "${playerName}"`);
        
        if (playerName && !playerName.toLowerCase().includes('team')) {
          // Stats might be in separate cells or divs
          // Look for all text content in the row
          const allCells = $(row).find('td');
          console.log(`        All cells text:`, allCells.map((i, cell) => $(cell).text().trim()).get());
          
          // Try to find stat columns - they might be after the first cell
          if (allCells.length >= 2) {
            const statsCell = $(allCells[1]);
            const statsText = statsCell.text().trim();
            console.log(`        Stats cell text: "${statsText}"`);
          } else if (allCells.length === 1) {
            // Single cell - stats might be in spans or divs within
            const allText = $(row).text().trim();
            console.log(`        Full row text: "${allText.substring(0, 100)}"`);
          }
        }
        
        if (cells.length >= 2) {
          const nameCell = $(cells[0]);
          const playerName = nameCell.find('a').text().trim();
          
          console.log(`        Player name: "${playerName}"`);
          
          if (playerName && !playerName.toLowerCase().includes('team')) {
            const statsCell = $(cells[1]).text().trim();
            const stats = statsCell.split('\t').filter(s => s);
            
            console.log(`        Stats: ${JSON.stringify(stats)}`);
            
            if (stats.length >= 3) {
              // Format: C/ATT YDS AVG TD INT SACKS QBR RTG
              const [compAtt, yards, avg, td, int, sacks] = stats;
              const [completions, attempts] = compAtt.split('/').map(n => parseInt(n) || 0);
              
              let player = findOrCreatePlayer(playerStats, playerName, team);
              player.passingYards = parseInt(yards) || 0;
              player.passingTouchdowns = parseInt(td) || 0;
              player.passingInterceptions = parseInt(int) || 0;
              player.passingAttempts = attempts;
              player.passingCompletions = completions;
              
              // Parse sacks (format: "1-1" means 1 sack for 1 yard)
              if (sacks && sacks.includes('-')) {
                const [sackCount] = sacks.split('-');
                player.sacks = parseInt(sackCount) || 0;
              }
              
              console.log(`      ✅ Parsed: ${playerName} (${team}) - ${yards} yds, ${td} TDs`);
            }
          }
        }
      });
    }
  });
}

/**
 * Parse rushing statistics from box score
 */
function parseRushingStats($, playerStats, teams) {
  $('.Boxscore__Team').each((i, teamSection) => {
    const headerText = $(teamSection).text().trim();
    
    if (headerText.includes('Rushing')) {
      console.log(`Found rushing section: "${headerText.substring(0, 50)}..."`);
      
      // Identify team
      let team = '';
      if (headerText.includes('Green Bay')) team = 'GB';
      else if (headerText.includes('Chicago')) team = 'CHI';
      else {
        const teamMatch = headerText.match(/^([\w\s]+?)\s+Rushing/);
        const teamName = teamMatch ? teamMatch[1].trim() : '';
        team = getTeamAbbr(teamName);
      }
      
      console.log(`  Team identified: ${team}`);
      
      const parentCategory = $(teamSection).parent();
      const table = parentCategory.find('table').first();
      
      table.find('tbody tr').each((rowIdx, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 2) {
          const nameCell = $(cells[0]);
          const playerName = nameCell.find('a').text().trim();
          
          if (playerName && !playerName.toLowerCase().includes('team')) {
            const statsCell = $(cells[1]).text().trim();
            const stats = statsCell.split('\t').filter(s => s);
            
            if (stats.length >= 3) {
              // Format: CAR YDS AVG TD LONG
              const [carries, yards, avg, td] = stats;
              
              let player = findOrCreatePlayer(playerStats, playerName, team);
              player.rushingYards = parseInt(yards) || 0;
              player.rushingTouchdowns = parseInt(td) || 0;
              player.rushingAttempts = parseInt(carries) || 0;
              
              console.log(`      ✅ Parsed rushing: ${playerName} (${team}) - ${yards} yds, ${td} TDs`);
            }
          }
        }
      });
    }
  });
}

/**
 * Parse receiving statistics from box score
 */
function parseReceivingStats($, playerStats, teams) {
  $('.Boxscore__Team').each((i, teamSection) => {
    const headerText = $(teamSection).text().trim();
    
    if (headerText.includes('Receiving')) {
      console.log(`Found receiving section: "${headerText.substring(0, 50)}..."`);
      
      // Identify team
      let team = '';
      if (headerText.includes('Green Bay')) team = 'GB';
      else if (headerText.includes('Chicago')) team = 'CHI';
      else {
        const teamMatch = headerText.match(/^([\w\s]+?)\s+Receiving/);
        const teamName = teamMatch ? teamMatch[1].trim() : '';
        team = getTeamAbbr(teamName);
      }
      
      console.log(`  Team identified: ${team}`);
      
      const parentCategory = $(teamSection).parent();
      const table = parentCategory.find('table').first();
      
      table.find('tbody tr').each((rowIdx, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 2) {
          const nameCell = $(cells[0]);
          const playerName = nameCell.find('a').text().trim();
          
          if (playerName && !playerName.toLowerCase().includes('team')) {
            const statsCell = $(cells[1]).text().trim();
            const stats = statsCell.split('\t').filter(s => s);
            
            if (stats.length >= 3) {
              // Format: REC YDS AVG TD LONG TGTS
              const [receptions, yards, avg, td] = stats;
              
              let player = findOrCreatePlayer(playerStats, playerName, team);
              player.receptions = parseInt(receptions) || 0;
              player.receivingYards = parseInt(yards) || 0;
              player.receivingTouchdowns = parseInt(td) || 0;
              
              console.log(`      ✅ Parsed receiving: ${playerName} (${team}) - ${receptions} rec, ${yards} yds, ${td} TDs`);
            }
          }
        }
      });
    }
  });
}

/**
 * Parse fumble statistics from box score
 */
function parseFumbleStats($, playerStats, teams) {
  $('.Boxscore__Team').each((i, teamSection) => {
    const headerText = $(teamSection).text().trim();
    
    if (headerText.includes('Fumbles')) {
      console.log(`Found fumbles section: "${headerText.substring(0, 50)}..."`);
      
      // Identify team
      let team = '';
      if (headerText.includes('Green Bay')) team = 'GB';
      else if (headerText.includes('Chicago')) team = 'CHI';
      else {
        const teamMatch = headerText.match(/^([\w\s]+?)\s+Fumbles/);
        const teamName = teamMatch ? teamMatch[1].trim() : '';
        team = getTeamAbbr(teamName);
      }
      
      console.log(`  Team identified: ${team}`);
      
      const parentCategory = $(teamSection).parent();
      const table = parentCategory.find('table').first();
      
      table.find('tbody tr').each((rowIdx, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 2) {
          const nameCell = $(cells[0]);
          const playerName = nameCell.find('a').text().trim();
          
          if (playerName && !playerName.toLowerCase().includes('team')) {
            const statsCell = $(cells[1]).text().trim();
            const stats = statsCell.split('\t').filter(s => s);
            
            if (stats.length >= 2) {
              // Format: FUM LOST REC
              const [fumbles, lost] = stats;
              
              let player = findOrCreatePlayer(playerStats, playerName, team);
              player.fumblesLost = parseInt(lost) || 0;
              
              console.log(`      ✅ Parsed fumbles: ${playerName} (${team}) - ${lost} lost`);
            }
          }
        }
      });
    }
  });
}

/**
 * Extract team abbreviation from team name
 */
function extractTeamAbbr(teamName, teams) {
  // Try to match against known teams
  for (const team of teams) {
    if (teamName.includes(team) || teamName.includes(getTeamFullName(team))) {
      return team;
    }
  }
  
  // Try to extract from the name
  const match = teamName.match(/\b([A-Z]{2,3})\b/);
  return match ? match[1] : 'UNK';
}

/**
 * Find existing player or create new player object
 */
function findOrCreatePlayer(playerStats, name, team) {
  let player = playerStats.find(p => 
    p.Name === name && p.Team === team
  );
  
  if (!player) {
    player = {
      Name: name,
      Team: team,
      passingYards: 0,
      passingTouchdowns: 0,
      passingInterceptions: 0,
      passingAttempts: 0,
      passingCompletions: 0,
      rushingYards: 0,
      rushingTouchdowns: 0,
      rushingAttempts: 0,
      receptions: 0,
      receivingYards: 0,
      receivingTouchdowns: 0,
      fumblesLost: 0,
      sacks: 0
    };
    playerStats.push(player);
  }
  
  return player;
}

/**
 * Get player stats for multiple games
 * @param {Array<string>} gameIds - Array of ESPN game IDs
 * @returns {Promise<Array>} Combined player statistics
 */
async function getPlayerStatsFromGames(gameIds) {
  const allStats = [];
  
  for (const gameId of gameIds) {
    try {
      const gameStats = await scrapeBoxScore(gameId);
      allStats.push(...gameStats.players);
    } catch (error) {
      console.error(`Failed to scrape game ${gameId}:`, error.message);
    }
  }
  
  return allStats;
}

/**
 * Get player stats for specific teams
 * @param {Array<string>} teams - Array of team abbreviations
 * @param {Date} date - Date to search for games
 * @returns {Promise<Array>} Player statistics for those teams
 */
async function getPlayerStatsByTeams(teams, date = new Date()) {
  try {
    // First, find game IDs for these teams
    const gameIdMap = await findGameIds(teams, date);
    
    // Get unique game IDs
    const uniqueGameIds = [...new Set(Object.values(gameIdMap))];
    
    if (uniqueGameIds.length === 0) {
      console.log('No games found for teams:', teams);
      return [];
    }
    
    console.log(`Found ${uniqueGameIds.length} game(s) for teams:`, teams);
    
    // Scrape stats from all games
    const allStats = await getPlayerStatsFromGames(uniqueGameIds);
    
    // Filter to only include players from requested teams
    return allStats.filter(player => 
      teams.map(t => t.toUpperCase()).includes(player.Team.toUpperCase())
    );
  } catch (error) {
    console.error('Error getting player stats by teams:', error.message);
    return [];
  }
}

module.exports = {
  scrapeBoxScore,
  findGameIds,
  getPlayerStatsFromGames,
  getPlayerStatsByTeams
};
