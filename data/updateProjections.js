const fs = require('fs');

// Parse the player data from the provided table
const playerProjections = {
  "Puka Nacua": 21.1,
  "Christian McCaffrey": 20.3,
  "James Cook": 17.8,
  "Josh Jacobs": 16.6,
  "A.J. Brown": 16.1,
  "Saquon Barkley": 15.4,
  "George Kittle": 14.9,
  "Kyren Williams": 14.7,
  "Nico Collins": 13.8,
  "Kenneth Gainwell": 13.7,
  "Travis Etienne": 13.6,
  "Davante Adams": 13.5,
  "Jakobi Meyers": 13.4,
  "Parker Washington": 13.4,
  "Stefon Diggs": 13.2,
  "Rhamondre Stevenson": 12.8,
  "Ladd McConkey": 12.6,
  "Jauan Jennings": 12.6,
  "Christian Watson": 12.6,
  "Tetairoa McMillan": 12.5,
  "Treveyon Henderson": 12.4,
  "D'andre Swift": 12.4,
  "Omarion Hampton": 12.3,
  "Woody Marks": 12.2,
  "Devonta Smith": 12.2,
  "Rico Dowdle": 12.2,
  "DK Metcalf": 12.2,
  "Hunter Henry": 12.1,
  "Khalil Shakir": 12.0,
  "Jaylen Warren": 11.8,
  "Colston Loveland": 11.3,
  "Luther Burden II": 11.2,
  "Jayden Reed": 11.2,
  "Quentin Johnston": 11.2,
  "Dalton Schultz": 11.1,
  "Brenton Strange": 10.8,
  "Dalton Kincaid": 10.8,
  "Brian Thomas Jr": 10.6,
  "Dallas Goedert": 9.7,
  "Romeo Doubs": 9.4,
  "Oronde Gadsden II": 9.2,
  "Kayshon Boutte": 8.9,
  "DJ Moore": 8.7,
  "Jalen Coker": 8.4,
  "Chuba Hubbard": 8.0,
  "Keenan Allen": 7.9,
  "Kyle Monangai": 7.8,
  "Blake Corum": 7.8,
  "Tyler Higbee": 7.6,
  "Brandin Cooks": 7.4,
  "Jayden Higgins": 7.3,
  "Pat Freiermuth": 7.1,
  "Kimani Vidal": 6.9,
  "Colby Parkinson": 6.6,
  "Luke Musgrave": 6.0,
  "Demarcus Robinson": 5.6,
  "Christian Kirk": 5.4,
  "Rome Odunze": 5.4,
  "Marquez Valdes-Scantling": 5.3,
  "Kyle Williams": 5.3,
  "Tommy Tremble": 5.3,
  "Ty Johnson": 5.2,
  "Xavier Legette": 5.1,
  "Calvin Austin III": 5.1,
  "Cole Kmet": 5.0,
  "Jawhar Jordan": 4.9,
  "Jonnu Smith": 4.8,
  "Dawson Knox": 4.7,
  "Demario Douglas": 4.7,
  "Dyami Brown": 4.6,
  "Xavier Hutchinson": 4.6,
  "Adam Thielen": 4.4,
  "Tre Harris": 4.3,
  "Emanuel Wilson": 4.2,
  "Tyrell Shavers": 4.1,
  "Konata Mumpfield": 4.1,
  "Bhayshul Tuten": 3.9,
  "Kendrick Bourne": 3.8,
  "Ricky Pearsall": 3.5,
  "Austin Hooper": 3.3,
  "Mitchell Evans": 3.3,
  "Cade Stover": 3.0,
  "Jahdae Walker": 3.0,
  "Matthew Golden": 2.9,
  "Brian Robinson Jr.": 2.9,
  "Jimmy Horn Jr.": 2.8,
  "Gabe Davis": 2.7,
  "Joshua Palmer": 2.7,
  "Kyle Juszczyk": 2.6,
  "Jaylin Noel": 2.5
};

// Read the data file
const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

// Update projections for all teams
let updatedCount = 0;
data.teams.forEach(team => {
  team.roster.forEach((player, index) => {
    const projection = playerProjections[player.playerName];
    if (projection !== undefined) {
      // Update all rounds with the same projection
      ['wildcard', 'divisional', 'championship', 'superbowl'].forEach(round => {
        team.projectedPoints[round][index] = projection;
      });
      updatedCount++;
      console.log(`Updated ${player.playerName}: ${projection}`);
    }
  });
});

// Write the updated data back
fs.writeFileSync('data.json', JSON.stringify(data, null, 2), 'utf8');

console.log(`\nTotal players updated: ${updatedCount}`);

// Re-apply formatting
let formatted = fs.readFileSync('data.json', 'utf8');

// Make number arrays single line with spaces after commas
formatted = formatted.replace(/\[\s+(null|[\d.]+)(,\s+(null|[\d.]+))*\s+\]/g, (match) => {
  return match.replace(/\s+/g, ' ').replace(/, /g, ', ');
});

// Make player objects single line with spaces after commas
formatted = formatted.replace(/\{\s+"slot":[^}]+\}/g, (match) => {
  return match.replace(/\s+/g, ' ').replace(/,\s+/g, ', ').replace(/:\s+/g, ': ');
});

fs.writeFileSync('data.json', formatted, 'utf8');

console.log('Formatting applied. Now run calculateExpectedPoints.js to update expected values.');
