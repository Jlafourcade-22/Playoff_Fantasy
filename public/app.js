// API endpoints
const TEAMS_API_URL = '/api/teams';
const FANTASY_DATA_API_URL = '/api/fantasy-data';
const ACTIVE_GAMES_API_URL = '/api/active-games';

// Current round (can be made dynamic later)
const CURRENT_ROUND = 'wildcard';

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

// Fetch and display fantasy data for all teams
async function loadFantasyData() {
    try {
        // Fetch active games first
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
function renderStandings(allTeamData) {
    // Calculate standings
    const standings = allTeamData.map(teamData => {
        const totalPoints = teamData.teamTotal.total || 0;
        
        // Count players remaining (not on eliminated teams)
        const playersRemaining = teamData.roster.filter(player => 
            !eliminatedTeams.includes(player.nflTeam)
        ).length;
        
        return {
            teamName: teamData.teamName,
            totalPoints: totalPoints,
            playersRemaining: playersRemaining
        };
    });
    
    // Sort by total points (descending)
    standings.sort((a, b) => b.totalPoints - a.totalPoints);
    
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
                <td class="px-4 py-3 text-sm text-center font-semibold text-green-400 border-b border-gray-700">${standing.totalPoints.toFixed(1)}</td>
                <td class="px-4 py-3 text-sm text-center border-b border-gray-700">${standing.playersRemaining}</td>
            </tr>
        `;
    }).join('');
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
            <td class="px-4 py-3 text-sm text-center border-b border-gray-700">${formatScore(player.wildcard)}</td>
            <td class="px-4 py-3 text-sm text-center border-b border-gray-700">${formatScore(player.divisional)}</td>
            <td class="px-4 py-3 text-sm text-center border-b border-gray-700">${formatScore(player.championship)}</td>
            <td class="px-4 py-3 text-sm text-center border-b border-gray-700">${formatScore(player.superbowl)}</td>
            <td class="px-4 py-3 text-sm text-center font-semibold text-yellow-400 border-b border-gray-700">${formatScore(player.total)}</td>
        </tr>
    `;
    }).join('');
}

// Format score display
function formatScore(score) {
    if (score === null || score === undefined) {
        return '<span class="text-gray-500">-</span>';
    }
    if (score === 0) {
        return '0.0';
    }
    return score.toFixed(1);
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadFantasyData();
});
