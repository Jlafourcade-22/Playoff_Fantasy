// API endpoints
const TEAMS_API_URL = '/api/teams';
const FANTASY_DATA_API_URL = '/api/fantasy-data';
const ACTIVE_GAMES_API_URL = '/api/active-games';

// Current round (can be made dynamic later)
const CURRENT_ROUND = 'divisional';

// DOM elements
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const standingsContainer = document.getElementById('standingsContainer');
const standingsBody = document.getElementById('standingsBody');
const tablesContainer = document.getElementById('tablesContainer');

// Store active teams globally
let activeTeams = [];

// Store eliminated teams globally
let eliminatedTeams = [];

// Store all team data globally for breakdown access
let allTeamsData = [];

// Store current modal context for 2PT conversions
let currentModalContext = {
    playerName: '',
    teamName: '',
    round: '',
    playerIndex: -1
};

// Store current sort configuration
let currentSort = {
    column: 'totalPoints',
    direction: 'desc'
};

// Fetch and display fantasy data for all teams
async function loadFantasyData() {
    try {
        // First, update scores from live data (checks for active games internally)
        console.log(`Updating live scores for ${CURRENT_ROUND} round...`);
        const updateResponse = await fetch(`/api/update-scores/${CURRENT_ROUND}`);
        
        if (updateResponse.ok) {
            const updateResult = await updateResponse.json();
            console.log('Score update result:', updateResult);
        } else {
            console.warn('Failed to update scores, continuing with cached data');
        }

        // Fetch active games
        const activeGamesResponse = await fetch(`${ACTIVE_GAMES_API_URL}/${CURRENT_ROUND}`);
        if (activeGamesResponse.ok) {
            const activeGamesData = await activeGamesResponse.json();
            activeTeams = activeGamesData.activeTeams || [];
            eliminatedTeams = activeGamesData.eliminatedTeams || [];
        }

        // Fetch all teams
        const teamsResponse = await fetch(TEAMS_API_URL);
        if (!teamsResponse.ok) {
            throw new Error('Failed to fetch teams');
        }
        const teams = await teamsResponse.json();

        // Fetch data for each team
        const teamDataPromises = teams.map(team => 
            fetch(`${FANTASY_DATA_API_URL}/${team.teamName}`).then(res => res.json())
        );
        const allTeamData = await Promise.all(teamDataPromises);

        // Store globally for breakdown access
        allTeamsData = allTeamData;

        // Render standings table
        renderStandings(allTeamData);
        
        // Render all tables
        renderAllTables(allTeamData);
        
        // Hide loading, show tables
        loading.classList.add('hidden');
        standingsContainer.classList.remove('hidden');
        tablesContainer.classList.remove('hidden');
    } catch (err) {
        console.error('Error loading fantasy data:', err);
        loading.classList.add('hidden');
        error.classList.remove('hidden');
    }
}

// Render standings table
async function renderStandings(allTeamData) {
    // Fetch win probabilities
    let winProbData = {};
    let lastUpdated = null;
    try {
        const response = await fetch('/api/win-probabilities');
        if (response.ok) {
            const data = await response.json();
            data.probabilities.forEach(team => {
                winProbData[team.teamName] = {
                    expectedTotal: team.expectedTotal,
                    winProbability: team.winProbability
                };
            });
            lastUpdated = data.lastUpdated?.winProbabilities;
        }
    } catch (err) {
        console.error('Failed to fetch win probabilities:', err);
    }
    
    // Calculate standings
    const standings = allTeamData.map(teamData => {
        const totalPoints = teamData.teamTotal.total || 0;
        
        // Count players remaining (not on eliminated teams)
        const playersRemaining = teamData.roster.filter(player => 
            !eliminatedTeams.includes(player.nflTeam)
        ).length;
        
        const probInfo = winProbData[teamData.teamName] || {};
        
        return {
            teamName: teamData.teamName,
            totalPoints: totalPoints,
            expectedPoints: probInfo.expectedTotal || 0,
            winProbability: probInfo.winProbability || 0,
            playersRemaining: playersRemaining
        };
    });
    
    // Sort standings based on current sort configuration
    sortStandings(standings);
    
    // Update timestamp in header if available
    updateStandingsTimestamp(lastUpdated);
    
    // Render standings rows
    standingsBody.innerHTML = standings.map((standing, index) => {
        const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        const rankClass = index === 0 ? 'text-yellow-400 font-bold' : index === 1 ? 'text-gray-300 font-semibold' : index === 2 ? 'text-orange-400 font-semibold' : '';
        
        return `
            <tr class="${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'} hover:bg-gray-700 transition-colors">
                <td class="px-4 py-3 text-sm ${rankClass} border-b border-gray-700">${rankEmoji}</td>
                <td class="px-4 py-3 text-sm font-medium border-b border-gray-700">
                    <a href="#team-${standing.teamName}" class="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer">${standing.teamName}</a>
                </td>
                <td class="px-4 py-3 text-sm text-center font-semibold text-yellow-400 border-b border-gray-700">${standing.totalPoints.toFixed(1)}</td>
                <td class="px-4 py-3 text-sm text-center text-purple-400 border-b border-gray-700 mobile-hide">${standing.expectedPoints.toFixed(1)}</td>
                <td class="px-4 py-3 text-sm text-center font-semibold text-green-400 border-b border-gray-700">${standing.winProbability.toFixed(1)}%</td>
                <td class="px-4 py-3 text-sm text-center border-b border-gray-700">${standing.playersRemaining}</td>
            </tr>
        `;
    }).join('');
}

// Sort standings array based on current sort configuration
function sortStandings(standings) {
    const { column, direction } = currentSort;
    
    standings.sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];
        
        if (direction === 'asc') {
            return aVal - bVal;
        } else {
            return bVal - aVal;
        }
    });
    
    // Update sort indicators in UI
    updateSortIndicators();
}

// Update visual sort indicators
function updateSortIndicators() {
    const columns = ['totalPoints', 'expectedPoints', 'winProbability', 'playersRemaining'];
    
    columns.forEach(col => {
        const header = document.getElementById(`sort-${col}`);
        if (header) {
            const indicator = header.querySelector('.sort-indicator');
            if (col === currentSort.column) {
                indicator.textContent = currentSort.direction === 'desc' ? '▼' : '▲';
            } else {
                indicator.textContent = '';
            }
        }
    });
}

// Update standings timestamp display
function updateStandingsTimestamp(isoTimestamp) {
    const timestampEl = document.getElementById('standings-timestamp');
    if (!timestampEl || !isoTimestamp) return;
    
    try {
        // Convert ISO timestamp to Central Standard Time
        const date = new Date(isoTimestamp);
        const options = {
            timeZone: 'America/Chicago',
            month: 'numeric',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        };
        const cstString = date.toLocaleString('en-US', options);
        timestampEl.textContent = `Last updated: ${cstString} CST`;
    } catch (err) {
        console.error('Error formatting timestamp:', err);
    }
}

// Handle column header click for sorting
function handleSortClick(column) {
    // Toggle direction if clicking same column, otherwise default to desc
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'desc' ? 'asc' : 'desc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'desc';
    }
    
    // Reload the data to trigger re-render with new sort
    loadFantasyData();
}

// Render all team tables
function renderAllTables(allTeamData) {
    tablesContainer.innerHTML = '';
    
    allTeamData.forEach(teamData => {
        const teamSection = document.createElement('div');
        teamSection.className = 'bg-gray-800 rounded-lg shadow-2xl overflow-hidden';
        teamSection.id = `team-${teamData.teamName}`;
        
        teamSection.innerHTML = `
            <div class="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
                <h2 class="text-2xl font-bold text-white">${teamData.teamName}</h2>
                <p class="text-green-100 text-sm">Coach: ${teamData.coach}</p>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full border-collapse">
                    <thead>
                        <tr class="bg-gray-700">
                            <th class="px-4 py-3 text-left text-sm font-semibold text-green-400 border-b border-gray-600"></th>
                            <th class="px-4 py-3 text-left text-sm font-semibold text-green-400 border-b border-gray-600">Player</th>
                            <th class="px-4 py-3 text-center text-sm font-semibold text-green-400 border-b border-gray-600">Wildcard</th>
                            <th class="px-4 py-3 text-center text-sm font-semibold text-green-400 border-b border-gray-600">Divisional</th>
                            <th class="px-4 py-3 text-center text-sm font-semibold text-green-400 border-b border-gray-600">Championship</th>
                            <th class="px-4 py-3 text-center text-sm font-semibold text-green-400 border-b border-gray-600">Super Bowl</th>
                            <th class="px-4 py-3 text-center text-sm font-semibold text-yellow-400 border-b border-gray-600">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${renderTableRows(teamData.roster)}
                    </tbody>
                    <tfoot>
                        <tr class="bg-gray-700 font-bold text-lg">
                            <td class="px-4 py-3 text-sm font-bold text-green-400 border-t-2 border-green-500" colspan="2">TEAM TOTAL</td>
                            <td class="px-4 py-3 text-sm text-center border-t-2 border-green-500">${formatScore(teamData.teamTotal.wildcard)}</td>
                            <td class="px-4 py-3 text-sm text-center border-t-2 border-green-500">${formatScore(teamData.teamTotal.divisional)}</td>
                            <td class="px-4 py-3 text-sm text-center border-t-2 border-green-500">${formatScore(teamData.teamTotal.championship)}</td>
                            <td class="px-4 py-3 text-sm text-center border-t-2 border-green-500">${formatScore(teamData.teamTotal.superbowl)}</td>
                            <td class="px-4 py-3 text-sm text-center font-bold text-yellow-400 border-t-2 border-green-500">${formatScore(teamData.teamTotal.total)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
        
        tablesContainer.appendChild(teamSection);
    });
}

// Render table rows for a team's roster
function renderTableRows(roster) {
    return roster.map((player, index) => {
        const isActive = activeTeams.includes(player.nflTeam);
        const isEliminated = eliminatedTeams.includes(player.nflTeam);
        
        let statusClass = '';
        let pulseClass = '';
        
        if (isActive) {
            statusClass = 'bg-green-900/30 border-l-4 border-green-500';
            pulseClass = 'animate-pulse';
        } else if (isEliminated) {
            statusClass = 'bg-red-900/30 border-l-4 border-red-500';
        }
        
        return `
        <tr class="${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'} ${statusClass}">
            <td class="px-4 py-3 text-sm font-medium text-blue-400 border-b border-gray-700 ${pulseClass}">${player.slot}</td>
            <td class="px-4 py-3 text-sm border-b border-gray-700 ${pulseClass}">${player.playerName}</td>
            <td class="px-4 py-3 text-sm text-center border-b border-gray-700 ${player.wildcard !== null ? 'score-clickable' : ''}" 
                ${player.wildcard !== null ? `onclick="showBreakdown('${player.playerName}', 'wildcard', ${index})"` : ''}>
                ${formatScore(player.wildcard, player.slot)}
            </td>
            <td class="px-4 py-3 text-sm text-center border-b border-gray-700 ${player.divisional !== null ? 'score-clickable' : ''}"
                ${player.divisional !== null ? `onclick="showBreakdown('${player.playerName}', 'divisional', ${index})"` : ''}>
                ${formatScore(player.divisional, player.slot)}
            </td>
            <td class="px-4 py-3 text-sm text-center border-b border-gray-700 ${player.championship !== null ? 'score-clickable' : ''}"
                ${player.championship !== null ? `onclick="showBreakdown('${player.playerName}', 'championship', ${index})"` : ''}>
                ${formatScore(player.championship, player.slot)}
            </td>
            <td class="px-4 py-3 text-sm text-center border-b border-gray-700 ${player.superbowl !== null ? 'score-clickable' : ''}"
                ${player.superbowl !== null ? `onclick="showBreakdown('${player.playerName}', 'superbowl', ${index})"` : ''}>
                ${formatScore(player.superbowl, player.slot)}
            </td>
            <td class="px-4 py-3 text-sm text-center font-semibold text-yellow-400 border-b border-gray-700">${formatScore(player.total, player.slot)}</td>
        </tr>
    `;
    }).join('');
}

// Format score display
function formatScore(score, slot) {
    if (score === null || score === undefined) {
        return '<span class="text-gray-500">-</span>';
    }
    if (score === 0) {
        // QBs show 0.00, others show 0.0
        return slot === 'QB' ? '0.00' : '0.0';
    }
    // QBs get 2 decimal places, everyone else gets 1
    return slot === 'QB' ? score.toFixed(2) : score.toFixed(1);
}

// Show scoring breakdown modal
function showBreakdown(playerName, round, playerIndex) {
    // Find the player data and team name
    let player = null;
    let teamName = '';
    for (const teamData of allTeamsData) {
        const foundPlayer = teamData.roster.find(p => p.playerName === playerName);
        if (foundPlayer) {
            player = foundPlayer;
            teamName = teamData.teamName;
            break;
        }
    }
    
    if (!player) {
        console.error('Player not found:', playerName);
        return;
    }
    
    // Store context for 2PT conversions
    currentModalContext = {
        playerName,
        teamName,
        round,
        playerIndex
    };
    
    // Get the breakdown for this round
    const breakdownKey = `breakdown${round.charAt(0).toUpperCase() + round.slice(1)}`;
    const breakdown = player[breakdownKey];
    
    // Get 2PT conversion count for this round
    const twoPtKey = `twoPt${round.charAt(0).toUpperCase() + round.slice(1)}`;
    const twoPtCount = player[twoPtKey] || 0;
    
    // Set modal title and 2PT input value
    document.getElementById('modalTitle').textContent = 'Scoring Breakdown';
    document.getElementById('modalSubtitle').textContent = `${playerName} - ${round.charAt(0).toUpperCase() + round.slice(1)} Round`;
    document.getElementById('twoPtInput').value = twoPtCount;
    
    // Build modal body
    const modalBody = document.getElementById('modalBody');
    
    if ((!breakdown || Object.keys(breakdown).length === 0) && twoPtCount === 0) {
        modalBody.innerHTML = '<p class="text-gray-400 text-center py-4">No scoring breakdown available for this game.</p>';
    } else {
        let totalPoints = 0;
        let breakdownHTML = '<div class="space-y-1">';
        
        // Category labels mapping
        const categoryLabels = {
            'passing_yards': 'Passing Yards',
            'passing_tds': 'Passing TDs',
            'interceptions': 'Interceptions',
            'rushing_yards': 'Rushing Yards',
            'rushing_tds': 'Rushing TDs',
            'receptions': 'Receptions (PPR)',
            'receiving_yards': 'Receiving Yards',
            'receiving_tds': 'Receiving TDs',
            'fumbles_lost': 'Fumbles Lost',
            'two_point_conversions': '2-Point Conversions'
        };
        
        // Render each category from API breakdown
        if (breakdown) {
            for (const [key, data] of Object.entries(breakdown)) {
                const label = categoryLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const isNegative = data.points < 0;
                const pointsColor = isNegative ? 'text-red-400' : 'text-green-400';
                
                breakdownHTML += `
                    <div class="breakdown-item">
                        <div>
                            <div class="font-medium text-gray-200">${label}</div>
                            <div class="text-xs text-gray-400">${data.calculation}</div>
                        </div>
                        <div class="text-right">
                            <div class="text-lg font-semibold ${pointsColor}">${data.points > 0 ? '+' : ''}${data.points.toFixed(2)}</div>
                            <div class="text-xs text-gray-400">${data.stat}</div>
                        </div>
                    </div>
                `;
                totalPoints += data.points;
            }
        }
        
        // Add manual 2PT conversions if they exist
        if (twoPtCount > 0) {
            const twoPtPoints = twoPtCount * 2;
            breakdownHTML += `
                <div class="breakdown-item bg-blue-900/30">
                    <div>
                        <div class="font-medium text-gray-200">2-Point Conversions (Manual)</div>
                        <div class="text-xs text-gray-400">${twoPtCount} × 2</div>
                    </div>
                    <div class="text-right">
                        <div class="text-lg font-semibold text-green-400">+${twoPtPoints.toFixed(2)}</div>
                        <div class="text-xs text-gray-400">${twoPtCount} conversions</div>
                    </div>
                </div>
            `;
            totalPoints += twoPtPoints;
        }
        
        breakdownHTML += `
            <div class="breakdown-item bg-gray-700 font-bold">
                <div class="text-lg text-white">Total Points</div>
                <div class="text-2xl text-yellow-400">${totalPoints.toFixed(2)}</div>
            </div>
        `;
        
        breakdownHTML += '</div>';
        modalBody.innerHTML = breakdownHTML;
    }
    
    // Show modal
    document.getElementById('breakdownModal').classList.add('show');
}

// Close breakdown modal
function closeBreakdownModal() {
    document.getElementById('breakdownModal').classList.remove('show');
}

// Save 2PT conversions for current player
async function saveTwoPointConversions() {
    const twoPtCount = parseInt(document.getElementById('twoPtInput').value);
    
    if (isNaN(twoPtCount) || twoPtCount < 0) {
        alert('Please enter a valid non-negative number');
        return;
    }
    
    const { playerName, teamName, round, playerIndex } = currentModalContext;
    
    try {
        const response = await fetch(`/api/fantasy-data/${teamName}/two-point`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                round,
                playerIndex,
                twoPtCount
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update 2PT conversions');
        }
        
        const result = await response.json();
        console.log('2PT update result:', result);
        
        // Close modal and reload data
        closeBreakdownModal();
        loadFantasyData();
        
        // Show success message briefly
        alert(`Updated ${playerName} 2PT conversions to ${twoPtCount} for ${round} round`);
    } catch (error) {
        console.error('Error saving 2PT conversions:', error);
        alert('Failed to save 2PT conversions. Please try again.');
    }
}

// Close modal when clicking outside of it
window.onclick = function(event) {
    const modal = document.getElementById('breakdownModal');
    if (event.target === modal) {
        closeBreakdownModal();
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadFantasyData();
});
