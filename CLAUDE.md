# BetBrain — AI Sports Betting Advisor

## Project Overview

BetBrain is a Claude-powered web application that analyzes historical stats, real-time data, and betting odds across NFL, College Football, NBA, College Basketball, MLB, and NHL to generate high-confidence betting recommendations. It combines statistical modeling with value analysis to surface the best opportunities across moneyline, spread, over/under, and player prop markets.

> **Disclaimer**: This tool is for informational and entertainment purposes only. Sports betting involves risk. Always bet responsibly.

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS 3
- **Backend**: Node.js 20+ + Express 4
- **AI Engine**: Anthropic Claude API (claude-sonnet-4-5-20250929)
- **Database**: SQLite via better-sqlite3 (local dev), migrate to PostgreSQL for production
- **Caching**: node-cache (in-memory, 15–30 min TTL)
- **Deployment**: Vercel (frontend) + Railway (backend)

## Project Structure

```
betbrain/
├── client/                    # React frontend (Vite)
│   ├── public/
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── common/        # Buttons, cards, loaders, badges
│   │   │   ├── layout/        # Navbar, sidebar, page shell
│   │   │   ├── game/          # GameCard, GameDetail, OddsDisplay
│   │   │   ├── picks/         # PickCard, BetSlip, ConfidenceBadge
│   │   │   └── charts/        # Performance charts, ROI graphs
│   │   ├── pages/             # Route-level page components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── GamesToday.jsx
│   │   │   ├── GameDetail.jsx
│   │   │   ├── BetSlip.jsx
│   │   │   ├── Performance.jsx
│   │   │   └── Settings.jsx
│   │   ├── hooks/             # Custom React hooks
│   │   │   ├── useGames.js
│   │   │   ├── usePicks.js
│   │   │   └── usePerformance.js
│   │   ├── services/          # API client functions
│   │   │   └── api.js
│   │   ├── utils/             # Helpers, formatters, constants
│   │   │   ├── odds.js        # Odds conversion, implied probability
│   │   │   ├── formatters.js  # Date, currency, stat formatting
│   │   │   └── constants.js   # League configs, sport mappings
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
├── server/                    # Express backend
│   ├── src/
│   │   ├── index.js           # Express app entry, middleware, routes
│   │   ├── routes/
│   │   │   ├── games.js       # GET /api/games, /api/games/:id
│   │   │   ├── picks.js       # GET /api/picks, POST /api/picks/analyze
│   │   │   ├── betslip.js     # CRUD for user's saved picks
│   │   │   └── performance.js # GET /api/performance/summary
│   │   ├── services/
│   │   │   ├── espn.js        # ESPN API client (stats, scores, injuries)
│   │   │   ├── odds.js        # The Odds API client
│   │   │   ├── balldontlie.js # BallDontLie API client (deep stats)
│   │   │   ├── claude.js      # Claude analysis engine
│   │   │   ├── aggregator.js  # Combines all data sources per game
│   │   │   └── cache.js       # node-cache wrapper with TTL config
│   │   ├── prompts/
│   │   │   ├── base.js        # Shared system prompt and instructions
│   │   │   ├── nfl.js         # NFL-specific prompt template
│   │   │   ├── nba.js         # NBA-specific prompt template
│   │   │   ├── mlb.js         # MLB-specific prompt template
│   │   │   ├── nhl.js         # NHL-specific prompt template
│   │   │   ├── ncaafb.js      # College football prompt template
│   │   │   └── ncaamb.js      # College basketball prompt template
│   │   ├── models/
│   │   │   ├── db.js          # SQLite connection and schema init
│   │   │   ├── picks.js       # Pick CRUD operations
│   │   │   └── performance.js # Performance tracking queries
│   │   └── utils/
│   │       ├── odds.js        # Implied probability, EV calculations
│   │       ├── sportMappings.js # ESPN/Odds API sport key mappings
│   │       └── validators.js  # Input validation helpers
│   ├── package.json
│   └── .env.example
├── CLAUDE.md                  # This file
├── README.md
└── .gitignore
```

## Data Sources

### ESPN Hidden API (No API key required)
- **Base URL**: `https://site.api.espn.com/apis/site/v2/sports`
- **Scoreboard**: `/{sport}/{league}/scoreboard?dates={YYYYMMDD}`
- **Standings**: `/{sport}/{league}/standings`
- **Team Stats**: `/{sport}/{league}/teams/{id}/statistics`
- **Game Summary**: `https://site.web.api.espn.com/apis/site/v2/sports/{sport}/{league}/summary?event={id}`
- **Sport/League Mappings**:
  - NFL: `football/nfl`
  - NCAAF: `football/college-football`
  - NBA: `basketball/nba`
  - NCAAB: `basketball/mens-college-basketball`
  - MLB: `baseball/mlb`
  - NHL: `hockey/nhl`
- **Caching**: 30 minutes for pre-game data
- **Notes**: Unofficial API, no SLA, but highly reliable. Be respectful with request frequency.

### The Odds API
- **Base URL**: `https://api.the-odds-api.com/v4`
- **Sports list**: `GET /v4/sports/?apiKey={key}`
- **Odds**: `GET /v4/sports/{sport}/odds?apiKey={key}&regions=us&markets=h2h,spreads,totals`
- **Event odds (props)**: `GET /v4/sports/{sport}/events/{eventId}/odds?apiKey={key}&regions=us&markets={markets}`
- **Sport Keys**: `americanfootball_nfl`, `americanfootball_ncaaf`, `basketball_nba`, `basketball_ncaab`, `baseball_mlb`, `icehockey_nhl`
- **Free Tier**: 500 requests/month — budget ~16/day
- **Caching**: 15 minutes for odds data
- **Key stored in**: `ODDS_API_KEY` env variable

### BallDontLie API
- **Base URL**: `https://api.balldontlie.io`
- **Coverage**: NBA, NFL, MLB, NHL, NCAAF, NCAAB
- **Use for**: Deep player stats, game logs, season averages, advanced metrics
- **Free tier with rate limits** — supplement ESPN data for player-level analysis
- **Key stored in**: `BALLDONTLIE_API_KEY` env variable

## Environment Variables

```
# server/.env
ANTHROPIC_API_KEY=sk-ant-...       # Claude API key
ODDS_API_KEY=...                    # The Odds API key
BALLDONTLIE_API_KEY=...             # BallDontLie API key
PORT=3001                           # Backend port
NODE_ENV=development
```

## Claude Analysis Engine

### How It Works
1. **Collect**: Fetch today's games, team stats, recent form, injuries, and odds from all APIs
2. **Aggregate**: Combine data per game into a structured analysis package
3. **Prompt**: Send to Claude API with sport-specific prompt template
4. **Parse**: Extract structured JSON recommendations from Claude's response
5. **Rank**: Sort by confidence and expected value, assign risk tiers

### Prompt Design Principles
- Each sport has its own prompt template in `server/src/prompts/`
- All prompts share a base system prompt from `base.js`
- Prompts include: team records, recent form (last 10 games), head-to-head, injuries, odds from multiple books, home/away splits, ATS records
- Claude returns structured JSON with: bet_type, pick, confidence (1-10), expected_value, risk_tier, units (1-5), and reasoning
- Batch games by sport to minimize API calls (e.g., all NBA games in one Claude call)

### Expected Claude Response Format
```json
{
  "game_summary": "Brief overview of the matchup and key factors",
  "recommendations": [
    {
      "bet_type": "spread|moneyline|over_under|player_prop",
      "pick": "Team/Player and the specific bet",
      "odds": "+150 or -110",
      "confidence": 8,
      "expected_value": "+4.2%",
      "risk_tier": "low|medium|high",
      "units": 2,
      "reasoning": "Detailed explanation of why this bet has value"
    }
  ]
}
```

## API Endpoints

### Games
- `GET /api/games?sport={sport}&date={YYYY-MM-DD}` — List games with basic info and odds
- `GET /api/games/:gameId` — Full game detail with stats, injuries, odds

### Picks
- `POST /api/picks/analyze` — Trigger Claude analysis for a specific game or all games for a sport/date
  - Body: `{ "sport": "nba", "date": "2026-02-07" }` or `{ "gameId": "..." }`
- `GET /api/picks?sport={sport}&date={date}` — Retrieve analyzed picks

### Bet Slip
- `GET /api/betslip` — User's saved picks
- `POST /api/betslip` — Add pick to slip
- `PATCH /api/betslip/:id` — Update result (won/lost/push)
- `DELETE /api/betslip/:id` — Remove pick

### Performance
- `GET /api/performance/summary?range={7d|30d|all}` — W/L record, ROI, units +/-
- `GET /api/performance/by-sport` — Breakdown by sport
- `GET /api/performance/by-bet-type` — Breakdown by bet type

## Caching Strategy

| Data Source       | TTL        | Key Pattern                        |
|-------------------|------------|-------------------------------------|
| ESPN scores       | 30 min     | `espn:{sport}:scores:{date}`       |
| ESPN team stats   | 60 min     | `espn:{sport}:team:{id}:stats`     |
| ESPN game summary | 30 min     | `espn:{sport}:game:{id}:summary`   |
| Odds API          | 15 min     | `odds:{sport}:{date}`              |
| BallDontLie stats | 60 min     | `bdl:{sport}:player:{id}:stats`    |
| Claude analysis   | 60 min     | `analysis:{sport}:{date}:{gameId}` |

## Coding Conventions

- **Language**: JavaScript (ES modules with `import/export`)
- **Formatting**: Use Prettier defaults (2-space indent, single quotes, trailing commas)
- **Error handling**: Every API call must have try/catch with meaningful error messages. Never let unhandled errors crash the server.
- **Logging**: Use `console.log` for dev; structured logging (winston) for production later.
- **API responses**: Always return `{ success: boolean, data: ..., error?: string }`
- **Frontend state**: React hooks + context (no Redux needed at this scale)
- **Component style**: Functional components only, use custom hooks for data fetching
- **Tailwind**: Use utility classes directly, avoid custom CSS unless absolutely necessary
- **File naming**: camelCase for JS files, PascalCase for React components

## Important Notes

- The ESPN API is unofficial. Handle errors gracefully and fall back to cached data if endpoints fail.
- The Odds API free tier is 500 requests/month. The caching layer is critical. Never fetch odds without checking cache first.
- Claude API calls cost money. Batch multiple games into a single analysis call per sport when possible.
- All picks should include a disclaimer that this is for entertainment purposes only.
- The performance tracker should honestly show losses as well as wins — no cherry-picking.
- Player props require the event-level Odds API endpoint which costs 1 request per event. Use sparingly on free tier.

## Build Phases

### Phase 1: Foundation
Set up monorepo, React + Vite + Tailwind frontend, Express backend, ESPN API integration, The Odds API integration, basic game listing page.

### Phase 2: AI Brain
Claude prompt templates per sport, analysis pipeline (collect → aggregate → prompt → parse → rank), confidence scoring, expected value calculations.

### Phase 3: Dashboard & UX
Full dashboard with top picks, game detail with Claude reasoning, sport filtering, bet slip, mobile-responsive design.

### Phase 4: Tracking & Optimization
Performance tracking, SQLite database, pick history, prompt refinement, player props, bankroll management.

### Phase 5: Polish & Deploy
Error handling, loading states, settings page, deploy to Vercel + Railway, notification system for high-confidence picks.
