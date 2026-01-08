# Fantasy Football Playoff Tracker

A clean, minimal Express.js application with Tailwind CSS that displays a spreadsheet-style fantasy football playoff table.

## Features

- 📊 Spreadsheet-style fantasy football table
- 🏈 Track scores across Wildcard, Divisional, Championship, and Super Bowl rounds
- 🎯 Data-driven roster with position slots and player names
- 🔢 Automatic team total calculations
- 🎨 Modern UI with Tailwind CSS
- ⚡ Simple Express.js backend with mock data

## Project Structure

```
Playoff_Fantasy/
├── server.js           # Express server and API routes
├── package.json        # Dependencies and scripts
├── data/
│   └── mockDb.js      # Mock database with roster and scores
└── public/
    ├── index.html     # Frontend HTML with Tailwind
    └── app.js         # Frontend JavaScript for API fetching
```

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

## API Endpoints

- `GET /api/fantasy-data` - Returns roster data with scores for all playoff rounds

## Customization

### Update Roster
Edit `data/mockDb.js` to modify the roster array:
```javascript
const roster = [
  { slot: 'QB', playerName: 'Your Player' },
  // ... add more players
];
```

### Update Scores
Modify the scores object in `data/mockDb.js`:
```javascript
const scores = {
  wildcard: [18.5, 24.2, ...],
  divisional: [22.3, 19.5, ...],
  championship: [25.1, 31.2, ...],
  superbowl: [0, 0, ...]
};
```

## Technology Stack

- **Backend:** Express.js
- **Frontend:** Vanilla JavaScript, Tailwind CSS (CDN)
- **Data:** In-memory mock data (no database)

## Next Steps

This is an extensible foundation. Future enhancements could include:
- Database integration (PostgreSQL, MongoDB)
- User authentication
- Multiple team tracking
- Real-time score updates
- External API integration for live stats
- Admin panel for score management

## License

ISC
