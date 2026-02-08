# BetBrain — AI Sports Betting Advisor

AI-powered sports betting analysis using Claude, real-time odds, and historical stats across NFL, NBA, MLB, NHL, College Football, and College Basketball.

> **Disclaimer**: This tool is for informational and entertainment purposes only. Sports betting involves risk. Always bet responsibly.

## Architecture

```
Browser  ──>  Vercel (React SPA)  ──>  Railway (Express API)
                                            │
                              ┌─────────────┼─────────────┐
                              v             v             v
                          ESPN API    Odds API    Claude API
                        (stats/scores) (lines)   (analysis)
```

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18 + Vite + Tailwind CSS 3    |
| Backend    | Node.js 20+ + Express 4             |
| AI Engine  | Anthropic Claude API                |
| Database   | SQLite (better-sqlite3)             |
| Caching    | node-cache (in-memory, 15-60 min)   |
| Deployment | Vercel (frontend) + Railway (server)|

## Prerequisites

- Node.js 20+
- npm
- [Anthropic API key](https://console.anthropic.com/)
- [The Odds API key](https://the-odds-api.com/) (free tier: 500 req/month)
- [BallDontLie API key](https://www.balldontlie.io/) (optional, for deep stats)

## Quick Start

```bash
# 1. Clone
git clone <repo-url> && cd betbrain

# 2. Install dependencies
npm install

# 3. Configure environment
cp server/.env.example server/.env
# Edit server/.env with your API keys

# 4. Run (starts client on :5173, server on :3001)
npm run dev
```

## Project Structure

```
betbrain/
├── client/                   # React frontend (Vite)
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Route-level pages
│   │   ├── hooks/            # Custom React hooks
│   │   ├── services/api.js   # API client
│   │   └── utils/            # Helpers, formatters, constants
│   ├── vercel.json           # Vercel deployment config
│   └── vite.config.js
├── server/                   # Express backend
│   ├── src/
│   │   ├── index.js          # App entry, middleware, routes
│   │   ├── routes/           # API route handlers
│   │   ├── services/         # ESPN, Odds, Claude, cache
│   │   ├── prompts/          # Sport-specific Claude prompts
│   │   ├── models/           # SQLite DB + queries
│   │   └── utils/            # Odds math, validators
│   ├── Procfile              # Railway start command
│   └── .env.example
├── CLAUDE.md                 # Full project specification
└── README.md
```

## API Endpoints

| Method | Path                          | Description                        |
|--------|-------------------------------|------------------------------------|
| GET    | `/api/games?sport=&date=`     | List games with odds               |
| GET    | `/api/games/:sport/:gameId`   | Full game detail                   |
| POST   | `/api/picks/analyze`          | Trigger Claude analysis            |
| GET    | `/api/picks?sport=&date=`     | Retrieve analyzed picks            |
| GET    | `/api/picks/top?date=&limit=` | Top picks by confidence            |
| GET    | `/api/betslip`                | User's saved picks                 |
| POST   | `/api/betslip`                | Add pick to bet slip               |
| PATCH  | `/api/betslip/:id`            | Update pick result                 |
| DELETE | `/api/betslip/:id`            | Remove pick from slip              |
| GET    | `/api/performance/summary`    | W/L record, ROI, units             |
| GET    | `/api/performance/by-sport`   | Breakdown by sport                 |
| GET    | `/api/performance/by-bet-type`| Breakdown by bet type              |
| GET    | `/api/odds/usage`             | Odds API quota remaining           |
| GET    | `/api/health`                 | Health check with cache/odds stats |

## Environment Variables

| Variable              | Required | Default                  | Description                          |
|-----------------------|----------|--------------------------|--------------------------------------|
| `ANTHROPIC_API_KEY`   | Yes      | —                        | Claude API key                       |
| `ODDS_API_KEY`        | Yes      | —                        | The Odds API key                     |
| `BALLDONTLIE_API_KEY` | No       | —                        | BallDontLie API key                  |
| `PORT`                | No       | `3001`                   | Server port                          |
| `NODE_ENV`            | No       | `development`            | `development` or `production`        |
| `CORS_ORIGIN`         | No       | `http://localhost:5173`  | Comma-separated allowed origins      |
| `DATABASE_PATH`       | No       | `./betbrain.db`          | SQLite database file path            |
| `RATE_LIMIT_GENERAL`  | No       | `100`                    | General API rate limit (req/min)     |
| `RATE_LIMIT_ANALYSIS` | No       | `10`                     | Analysis endpoint rate limit (req/min)|

## Deployment

### Frontend — Vercel

1. Push the repo to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Set **Root Directory** to `client`
4. Framework preset: **Vite**
5. No environment variables needed (API calls proxy through `vercel.json`)
6. After deploying the backend, update the Railway URL in `client/vercel.json`

### Backend — Railway

1. Create a new project in [Railway](https://railway.app)
2. Set **Root Directory** to `server`
3. Add environment variables:
   - `ANTHROPIC_API_KEY`
   - `ODDS_API_KEY`
   - `BALLDONTLIE_API_KEY`
   - `NODE_ENV=production`
   - `CORS_ORIGIN=https://your-app.vercel.app`
   - `DATABASE_PATH=/data/betbrain.db` (attach a persistent volume at `/data`)
4. Railway auto-detects the `Procfile` and starts the server
5. Copy the Railway deployment URL and update `client/vercel.json` rewrite destination

## License

MIT
