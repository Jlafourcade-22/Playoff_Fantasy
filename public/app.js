// API endpoints
const TEAMS_API_URL = '/api/teams';
const FANTASY_DATA_API_URL = '/api/fantasy-data';

// DOM elements
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const tablesContainer = document.getElementById('tablesContainer');

// Fetch and display fantasy data for all teams
async function loadFantasyData() {
    try {
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

        // Render all tables
        renderAllTables(allTeamData);
        
        // Hide loading, show tables
        loading.classList.add('hidden');
        tablesContainer.classList.remove('hidden');
    } catch (err) {
        console.error('Error loading fantasy data:', err);
        loading.classList.add('hidden');
        error.classList.remove('hidden');
    }
}

// Render all team tables
function renderAllTables(allTeamData) {
    tablesContainer.innerHTML = '';
    
    allTeamData.forEach(teamData => {
        const teamSection = document.createElement('div');
        teamSection.className = 'bg-gray-800 rounded-lg shadow-2xl overflow-hidden';
        
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
    return roster.map((player, index) => `
        <tr class="${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}">
            <td class="px-4 py-3 text-sm font-medium text-blue-400 border-b border-gray-700">${player.slot}</td>
            <td class="px-4 py-3 text-sm border-b border-gray-700">${player.playerName}</td>
            <td class="px-4 py-3 text-sm text-center border-b border-gray-700">${formatScore(player.wildcard)}</td>
            <td class="px-4 py-3 text-sm text-center border-b border-gray-700">${formatScore(player.divisional)}</td>
            <td class="px-4 py-3 text-sm text-center border-b border-gray-700">${formatScore(player.championship)}</td>
            <td class="px-4 py-3 text-sm text-center border-b border-gray-700">${formatScore(player.superbowl)}</td>
            <td class="px-4 py-3 text-sm text-center font-semibold text-yellow-400 border-b border-gray-700">${formatScore(player.total)}</td>
        </tr>
    `).join('');
}

// Format score display
function formatScore(score) {
    if (score === 0) {
        return '<span class="text-gray-500">-</span>';
    }
    return score.toFixed(1);
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadFantasyData();
});
