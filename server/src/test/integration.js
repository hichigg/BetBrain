/**
 * BetBrain — Full Integration Test
 *
 * Tests the complete pipeline end-to-end:
 *   1. Fetch games for each sport with scheduled games
 *   2. Verify ESPN data with team stats
 *   3. Verify odds data loads and matches to games
 *   4. Run Claude analysis on one sport
 *   5. Verify recommendations parse with required fields
 *   6. Save a pick to the database
 *   7. Mark as won, verify performance stats update
 *   8. Check cache hits on second run
 *   9. Report summary
 *  10. Security check
 *
 * Usage: node server/src/test/integration.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load .env BEFORE any service imports (ES imports hoist above code,
// so we use dynamic import() to guarantee dotenv runs first)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Dynamic imports — these run after dotenv has populated process.env
const { getGamesForSport, getGameDetail } = await import('../services/aggregator.js');
const { analyzeGamesForSport, getTokenUsage } = await import('../services/claude.js');
const { getTeamStats } = await import('../services/espn.js');
const { getOdds, getRemainingRequests } = await import('../services/odds.js');
const { stats: cacheStats, flush: flushCache } = await import('../services/cache.js');
const { savePick, getPickById, updateResult, deletePick } = await import('../models/picks.js');
const { getSummary } = await import('../models/performance.js');
const { getSupportedSports, getEspnMapping, getOddsApiKey } = await import('../utils/sportMappings.js');

// ── Formatting helpers ──────────────────────────────────────────────

const PASS = '\x1b[32m PASS \x1b[0m';
const FAIL = '\x1b[31m FAIL \x1b[0m';
const WARN = '\x1b[33m WARN \x1b[0m';
const INFO = '\x1b[36m INFO \x1b[0m';
const HEADER = '\x1b[1m\x1b[35m';
const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function elapsed(start) {
  return ((performance.now() - start) / 1000).toFixed(2);
}

function divider(title) {
  const line = '─'.repeat(60);
  console.log(`\n${HEADER}── ${title} ${line.slice(title.length + 4)}${RESET}`);
}

function logResult(passed, label, detail = '') {
  const icon = passed ? PASS : FAIL;
  const suffix = detail ? ` ${DIM}${detail}${RESET}` : '';
  console.log(`  ${icon} ${label}${suffix}`);
  return passed;
}

// ── State tracking ──────────────────────────────────────────────────

const report = {
  totalStart: 0,
  tests: { passed: 0, failed: 0, warned: 0 },
  sportsWithGames: [],
  apiCalls: { espn: 0, odds: 0, claude: 0, bdl: 0 },
  errors: [],
  stepTimings: {},
};

function pass(label, detail) {
  report.tests.passed++;
  return logResult(true, label, detail);
}

function fail(label, detail) {
  report.tests.failed++;
  report.errors.push(`${label}: ${detail || 'failed'}`);
  return logResult(false, label, detail);
}

function warn(label, detail) {
  report.tests.warned++;
  console.log(`  ${WARN} ${label} ${DIM}${detail || ''}${RESET}`);
}

// ── Test Steps ──────────────────────────────────────────────────────

async function step1_fetchGames() {
  divider('Step 1: Fetch Games for All Sports');
  const start = performance.now();
  const sports = getSupportedSports();
  const date = todayStr();
  console.log(`  ${INFO} Date: ${date}`);
  console.log(`  ${INFO} Sports: ${sports.join(', ')}`);

  const gamesBySport = {};

  for (const sport of sports) {
    try {
      const games = await getGamesForSport(sport, date);
      report.apiCalls.espn++;
      report.apiCalls.odds++;

      if (games && games.length > 0) {
        gamesBySport[sport] = games;
        report.sportsWithGames.push(sport);
        pass(`${sport.toUpperCase()}`, `${games.length} game(s) found`);
      } else {
        warn(`${sport.toUpperCase()}`, 'No games scheduled today');
      }
    } catch (err) {
      fail(`${sport.toUpperCase()}`, err.message);
    }
  }

  if (report.sportsWithGames.length === 0) {
    warn('No sports have games today', 'Some tests will be skipped');
  }

  report.stepTimings.step1 = elapsed(start);
  return gamesBySport;
}

async function step2_verifyEspnData(gamesBySport) {
  divider('Step 2: Verify ESPN Data + Team Stats');
  const start = performance.now();

  if (report.sportsWithGames.length === 0) {
    warn('Skipped', 'No games available');
    report.stepTimings.step2 = elapsed(start);
    return;
  }

  const sport = report.sportsWithGames[0];
  const games = gamesBySport[sport];
  const game = games[0];

  // Verify game structure (aggregator returns home/away, not homeTeam/awayTeam)
  const requiredGameFields = ['id', 'sport', 'home', 'away', 'status'];
  const missingFields = requiredGameFields.filter((f) => game[f] == null);

  if (missingFields.length === 0) {
    pass('Game object has required fields', requiredGameFields.join(', '));
  } else {
    fail('Game object missing fields', missingFields.join(', '));
  }

  // Verify team data
  const home = game.home;
  if (home && home.name) {
    pass('Home team has name', `${home.name} (${home.abbreviation || 'N/A'})`);
  } else {
    fail('Home team missing name');
  }

  if (home && home.record) {
    pass('Home team has record', home.record);
  } else {
    warn('Home team missing record', 'May not be available pre-season');
  }

  // Fetch team stats directly via ESPN
  const mapping = getEspnMapping(sport);
  if (mapping && home && home.id) {
    try {
      const stats = await getTeamStats(mapping.sport, mapping.league, home.id);
      report.apiCalls.espn++;
      if (stats) {
        pass('ESPN team stats loaded', `Team ID: ${home.id}`);
      } else {
        warn('ESPN team stats returned null', 'Endpoint may be unavailable');
      }
    } catch (err) {
      fail('ESPN team stats failed', err.message);
    }
  }

  // Fetch game detail (deep enrichment)
  try {
    const detail = await getGameDetail(sport, game.id);
    report.apiCalls.espn += 2; // summary + team stats
    if (detail) {
      pass('Game detail loaded', `${detail.home?.name} vs ${detail.away?.name}`);
      if (detail.home?.seasonStats && Object.keys(detail.home.seasonStats).length > 0) {
        pass('Season stats included', `${Object.keys(detail.home.seasonStats).length} stat(s)`);
      } else {
        warn('Season stats not available');
      }

      if (detail.leaders && detail.leaders.length > 0) {
        pass('Game leaders included', `${detail.leaders.length} categor(ies)`);
      } else {
        warn('Game leaders not available');
      }
    } else {
      fail('Game detail returned null');
    }
  } catch (err) {
    fail('Game detail failed', err.message);
  }

  report.stepTimings.step2 = elapsed(start);
}

async function step3_verifyOdds(gamesBySport) {
  divider('Step 3: Verify Odds Data + Game Matching');
  const start = performance.now();

  if (report.sportsWithGames.length === 0) {
    warn('Skipped', 'No games available');
    report.stepTimings.step3 = elapsed(start);
    return;
  }

  const sport = report.sportsWithGames[0];
  const oddsKey = getOddsApiKey(sport);

  if (!oddsKey) {
    fail('No Odds API key mapping', sport);
    report.stepTimings.step3 = elapsed(start);
    return;
  }

  try {
    const oddsData = await getOdds(oddsKey);
    report.apiCalls.odds++;

    if (!oddsData || oddsData.length === 0) {
      warn('No odds data returned', 'Games may not have lines yet');
      report.stepTimings.step3 = elapsed(start);
      return;
    }

    pass('Odds API returned data', `${oddsData.length} event(s)`);

    // Verify odds structure
    const event = oddsData[0];
    if (event.home_team && event.away_team) {
      pass('Odds event has team names', `${event.home_team} vs ${event.away_team}`);
    } else {
      fail('Odds event missing team names');
    }

    if (event.bookmakers && event.bookmakers.length > 0) {
      const bookmaker = event.bookmakers[0];
      pass('Bookmaker data present', `${bookmaker.key} (${event.bookmakers.length} books)`);

      if (bookmaker.markets && bookmaker.markets.length > 0) {
        const marketKeys = bookmaker.markets.map((m) => m.key);
        pass('Markets available', marketKeys.join(', '));
      } else {
        fail('No markets in bookmaker data');
      }
    } else {
      fail('No bookmaker data in odds');
    }

    // Verify odds matched to games
    const games = gamesBySport[sport];
    const gamesWithOdds = games.filter((g) => g.odds && Object.keys(g.odds).length > 0);
    if (gamesWithOdds.length > 0) {
      pass(
        'Odds matched to games',
        `${gamesWithOdds.length}/${games.length} games have odds`,
      );
    } else {
      warn('No games matched to odds', 'Team name matching may have failed');
    }

    // Check Odds API usage
    const usage = getRemainingRequests();
    if (usage.remaining != null) {
      const status = usage.remaining < 50 ? WARN : INFO;
      console.log(
        `  ${status} Odds API: ${usage.used} used, ${usage.remaining} remaining`,
      );
    }
  } catch (err) {
    fail('Odds fetch failed', err.message);
  }

  report.stepTimings.step3 = elapsed(start);
}

async function step4_claudeAnalysis(gamesBySport) {
  divider('Step 4: Claude Analysis');
  const start = performance.now();

  if (report.sportsWithGames.length === 0) {
    warn('Skipped', 'No games available');
    report.stepTimings.step4 = elapsed(start);
    return null;
  }

  // Pick the sport with the most games (better batch value)
  const sport = report.sportsWithGames.reduce((best, s) =>
    (gamesBySport[s]?.length || 0) > (gamesBySport[best]?.length || 0) ? s : best,
  );
  const date = todayStr();

  console.log(
    `  ${INFO} Analyzing ${sport.toUpperCase()} (${gamesBySport[sport].length} games)...`,
  );

  try {
    const result = await analyzeGamesForSport(sport, date);
    report.apiCalls.claude++;

    if (!result) {
      fail('Claude analysis returned null');
      report.stepTimings.step4 = elapsed(start);
      return null;
    }

    if (result.allPicks && result.allPicks.length > 0) {
      pass('Claude returned picks', `${result.allPicks.length} recommendation(s)`);
    } else if (result.games) {
      // Check individual games for picks or errors
      const gamesWithPicks = result.games.filter(
        (g) => g.recommendations && g.recommendations.length > 0,
      );
      if (gamesWithPicks.length > 0) {
        const totalPicks = gamesWithPicks.reduce(
          (sum, g) => sum + g.recommendations.length,
          0,
        );
        pass('Claude returned picks', `${totalPicks} across ${gamesWithPicks.length} game(s)`);
      } else {
        warn('Claude returned no actionable picks', 'Games may lack odds or be completed');
      }
    } else {
      warn('Unexpected result structure from Claude');
    }

    const tokens = getTokenUsage();
    console.log(
      `  ${INFO} Tokens: ${tokens.inputTokens.toLocaleString()} in / ${tokens.outputTokens.toLocaleString()} out`,
    );

    report.stepTimings.step4 = elapsed(start);
    return result;
  } catch (err) {
    fail('Claude analysis failed', err.message);
    report.stepTimings.step4 = elapsed(start);
    return null;
  }
}

function step5_verifyRecommendations(analysisResult) {
  divider('Step 5: Verify Recommendation Format');

  if (!analysisResult) {
    warn('Skipped', 'No analysis result');
    return null;
  }

  // Collect all recommendations from the result
  let recs = [];
  if (analysisResult.allPicks && analysisResult.allPicks.length > 0) {
    recs = analysisResult.allPicks;
  } else if (analysisResult.games) {
    for (const g of analysisResult.games) {
      if (g.recommendations) recs.push(...g.recommendations);
    }
  }

  if (recs.length === 0) {
    warn('No recommendations to verify', 'Analysis produced no picks');
    return null;
  }

  const REQUIRED = ['bet_type', 'pick', 'confidence', 'risk_tier', 'reasoning'];
  const VALID_BET_TYPES = ['spread', 'moneyline', 'over_under', 'player_prop'];
  const VALID_RISK_TIERS = ['low', 'medium', 'high'];

  const rec = recs[0];
  console.log(`  ${INFO} Checking first recommendation: "${rec.pick}"`);

  // Check required fields
  const missing = REQUIRED.filter((f) => rec[f] == null && rec[f] !== 0);
  if (missing.length === 0) {
    pass('All required fields present', REQUIRED.join(', '));
  } else {
    fail('Missing required fields', missing.join(', '));
  }

  // Validate bet_type
  if (VALID_BET_TYPES.includes(rec.bet_type)) {
    pass('bet_type is valid', rec.bet_type);
  } else {
    fail('Invalid bet_type', `"${rec.bet_type}" not in [${VALID_BET_TYPES.join(', ')}]`);
  }

  // Validate confidence
  if (typeof rec.confidence === 'number' && rec.confidence >= 1 && rec.confidence <= 10) {
    pass('confidence in range 1-10', `${rec.confidence}`);
  } else {
    fail('confidence out of range', `${rec.confidence}`);
  }

  // Validate risk_tier
  if (VALID_RISK_TIERS.includes(rec.risk_tier)) {
    pass('risk_tier is valid', rec.risk_tier);
  } else {
    fail('Invalid risk_tier', `"${rec.risk_tier}" not in [${VALID_RISK_TIERS.join(', ')}]`);
  }

  // Validate units
  if (rec.units != null) {
    if (typeof rec.units === 'number' && rec.units >= 1 && rec.units <= 5) {
      pass('units in range 1-5', `${rec.units}`);
    } else {
      fail('units out of range', `${rec.units}`);
    }
  } else {
    warn('units not present');
  }

  // Validate reasoning
  if (typeof rec.reasoning === 'string' && rec.reasoning.length > 10) {
    pass('reasoning is substantive', `${rec.reasoning.length} chars`);
  } else {
    fail('reasoning is missing or too short');
  }

  // Check optional but expected fields
  if (rec.odds != null) {
    pass('odds present', `${rec.odds}`);
  } else {
    warn('odds not present');
  }

  if (rec.expected_value != null) {
    pass('expected_value present', `${rec.expected_value}`);
  } else {
    warn('expected_value not present');
  }

  return rec;
}

function step6_savePick(rec, analysisResult) {
  divider('Step 6: Save Pick to Database');

  // Build a test pick — use real data if available, else synthetic
  const pickData = rec
    ? {
        game_id: 'integration-test-game',
        sport: analysisResult?.sport || 'nba',
        date: todayStr(),
        home_team: 'Test Home',
        away_team: 'Test Away',
        game_name: 'Test Home vs Test Away',
        bet_type: rec.bet_type,
        pick: rec.pick,
        odds: typeof rec.odds === 'number' ? rec.odds : -110,
        confidence: rec.confidence,
        expected_value: rec.expected_value || '+2.0%',
        risk_tier: rec.risk_tier,
        units: rec.units || 2,
        reasoning: rec.reasoning,
      }
    : {
        game_id: 'integration-test-game',
        sport: 'nba',
        date: todayStr(),
        home_team: 'Test Home',
        away_team: 'Test Away',
        game_name: 'Test Home vs Test Away',
        bet_type: 'spread',
        pick: 'Test Home -3.5',
        odds: -110,
        confidence: 7,
        expected_value: '+3.1%',
        risk_tier: 'medium',
        units: 2,
        reasoning: 'Integration test pick for pipeline verification.',
      };

  try {
    const saved = savePick(pickData);

    if (saved && saved.id) {
      pass('Pick saved to database', `ID: ${saved.id}`);
    } else {
      fail('savePick returned no ID');
      return null;
    }

    // Verify retrieval
    const fetched = getPickById(saved.id);
    if (fetched && fetched.pick === pickData.pick) {
      pass('Pick retrieved from database', `"${fetched.pick}"`);
    } else {
      fail('Pick retrieval failed');
    }

    if (fetched.result === 'pending') {
      pass('Initial result is pending');
    } else {
      fail('Initial result is not pending', fetched.result);
    }

    return saved;
  } catch (err) {
    fail('Database save failed', err.message);
    return null;
  }
}

function step7_markWonAndVerify(savedPick) {
  divider('Step 7: Mark Won + Verify Performance');

  if (!savedPick) {
    warn('Skipped', 'No saved pick');
    return;
  }

  try {
    // Get performance before
    const before = getSummary('all');
    const winsBefore = before.record.wins;
    const profitBefore = before.units.profit;

    // Mark as won
    const updated = updateResult(savedPick.id, 'won');

    if (updated && updated.result === 'won') {
      pass('Pick marked as won');
    } else {
      fail('updateResult did not set result to won');
      return;
    }

    // Verify profit was calculated
    if (updated.profit_loss > 0) {
      pass('Profit calculated', `+${updated.profit_loss} units`);
    } else {
      fail('Profit not calculated', `profit_loss: ${updated.profit_loss}`);
    }

    // Verify performance summary updated
    const after = getSummary('all');
    if (after.record.wins > winsBefore) {
      pass('Performance wins incremented', `${winsBefore} -> ${after.record.wins}`);
    } else {
      fail('Performance wins not updated', `still ${after.record.wins}`);
    }

    if (after.units.profit > profitBefore) {
      pass('Performance profit increased', `${profitBefore} -> ${after.units.profit}`);
    } else {
      warn('Performance profit unchanged', 'Possible rounding or prior losses');
    }

    // Clean up — delete the test pick
    const deleted = deletePick(savedPick.id);
    if (deleted) {
      pass('Test pick cleaned up');
    } else {
      warn('Failed to clean up test pick', savedPick.id);
    }
  } catch (err) {
    fail('Step 7 error', err.message);
    // Attempt cleanup
    try {
      deletePick(savedPick.id);
    } catch (_) {}
  }
}

async function step8_cacheHits(gamesBySport) {
  divider('Step 8: Cache Hit Verification');
  const start = performance.now();

  const before = cacheStats();
  console.log(
    `  ${INFO} Cache before: ${before.hits} hits, ${before.misses} misses, ${before.keys} keys, ${before.hitRate} hit rate`,
  );

  if (report.sportsWithGames.length === 0) {
    warn('Skipped', 'No sports to re-fetch');
    report.stepTimings.step8 = elapsed(start);
    return;
  }

  // Re-fetch the same sport — should hit cache
  const sport = report.sportsWithGames[0];
  await getGamesForSport(sport, todayStr());

  const after = cacheStats();
  const newHits = after.hits - before.hits;

  console.log(
    `  ${INFO} Cache after:  ${after.hits} hits, ${after.misses} misses, ${after.keys} keys, ${after.hitRate} hit rate`,
  );

  if (newHits > 0) {
    pass('Cache hits on re-fetch', `${newHits} new hit(s)`);
  } else {
    fail('No cache hits on re-fetch', 'Data should have been cached from step 1');
  }

  if (after.misses <= before.misses + 1) {
    pass('No significant new cache misses');
  } else {
    warn('New cache misses on re-fetch', `${after.misses - before.misses} new miss(es)`);
  }

  report.stepTimings.step8 = elapsed(start);
}

function step9_report() {
  divider('Step 9: Final Report');

  const totalTime = elapsed(report.totalStart);
  const tokens = getTokenUsage();
  const cache = cacheStats();
  const odds = getRemainingRequests();

  console.log('');
  console.log(`  ${BOLD}API Calls${RESET}`);
  console.log(`    ESPN .............. ${report.apiCalls.espn}`);
  console.log(`    Odds API .......... ${report.apiCalls.odds}`);
  console.log(`    Claude ............ ${report.apiCalls.claude}`);
  console.log('');
  console.log(`  ${BOLD}Claude Tokens${RESET}`);
  console.log(`    Input ............. ${tokens.inputTokens.toLocaleString()}`);
  console.log(`    Output ............ ${tokens.outputTokens.toLocaleString()}`);
  console.log('');
  console.log(`  ${BOLD}Cache${RESET}`);
  console.log(`    Keys .............. ${cache.keys}`);
  console.log(`    Hits .............. ${cache.hits}`);
  console.log(`    Misses ............ ${cache.misses}`);
  console.log(`    Hit Rate .......... ${cache.hitRate}`);
  console.log('');
  console.log(`  ${BOLD}Odds API Budget${RESET}`);
  console.log(`    Used .............. ${odds.used ?? 'N/A'}`);
  console.log(`    Remaining ......... ${odds.remaining ?? 'N/A'}`);
  console.log('');
  console.log(`  ${BOLD}Timing${RESET}`);
  for (const [step, time] of Object.entries(report.stepTimings)) {
    console.log(`    ${step} ............. ${time}s`);
  }
  console.log(`    ${BOLD}Total ............. ${totalTime}s${RESET}`);
  console.log('');
  console.log(`  ${BOLD}Sports with Games${RESET}`);
  if (report.sportsWithGames.length > 0) {
    console.log(`    ${report.sportsWithGames.map((s) => s.toUpperCase()).join(', ')}`);
  } else {
    console.log(`    (none today)`);
  }

  if (report.errors.length > 0) {
    console.log('');
    console.log(`  ${BOLD}\x1b[31mErrors${RESET}`);
    for (const err of report.errors) {
      console.log(`    - ${err}`);
    }
  }
}

function step10_securityCheck() {
  divider('Step 10: Security Audit');

  // 1. Check .env is not committed / accessible from client
  const envPath = path.resolve(__dirname, '../../.env');
  const gitignorePath = path.resolve(__dirname, '../../../.gitignore');

  if (fs.existsSync(envPath)) {
    pass('.env file exists (server has credentials)');
  } else {
    warn('.env file not found', 'Server may use system env vars in production');
  }

  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
    if (gitignore.includes('.env')) {
      pass('.env in .gitignore');
    } else {
      fail('.env NOT in .gitignore', 'Credentials could be committed!');
    }

    if (gitignore.includes('*.db')) {
      pass('*.db in .gitignore');
    } else {
      fail('*.db NOT in .gitignore', 'Database could be committed!');
    }

    if (gitignore.includes('node_modules')) {
      pass('node_modules in .gitignore');
    } else {
      fail('node_modules NOT in .gitignore');
    }
  } else {
    fail('.gitignore not found');
  }

  // 2. Check API keys are set (not empty)
  const envKeys = [
    { name: 'ANTHROPIC_API_KEY', val: process.env.ANTHROPIC_API_KEY },
    { name: 'ODDS_API_IO_KEY', val: process.env.ODDS_API_IO_KEY },
  ];

  for (const key of envKeys) {
    if (key.val && key.val.length > 5 && !key.val.includes('...')) {
      pass(`${key.name} is set`, `${key.val.slice(0, 8)}...`);
    } else {
      fail(`${key.name} is missing or placeholder`);
    }
  }

  // Optional key
  if (process.env.BALLDONTLIE_API_KEY && process.env.BALLDONTLIE_API_KEY.length > 5) {
    pass('BALLDONTLIE_API_KEY is set');
  } else {
    warn('BALLDONTLIE_API_KEY not set', 'BDL features will be limited');
  }

  // 3. Check that API keys are not hardcoded in source files
  const srcDir = path.resolve(__dirname, '..');
  const sourceFiles = collectSourceFiles(srcDir);
  let hardcodedKeyFound = false;

  const keyPatterns = [
    /sk-ant-api[a-zA-Z0-9_-]{20,}/,
    /ODDS_API_IO_KEY\s*=\s*['"][a-f0-9]{20,}['"]/,
    /ANTHROPIC_API_KEY\s*=\s*['"]sk-/,
  ];

  for (const file of sourceFiles) {
    // Skip this test file, .env, and .env.example
    if (
      file.endsWith('integration.js') ||
      file.endsWith('.env') ||
      file.endsWith('.env.example')
    )
      continue;

    try {
      const content = fs.readFileSync(file, 'utf-8');
      for (const pattern of keyPatterns) {
        if (pattern.test(content)) {
          hardcodedKeyFound = true;
          fail(
            'Hardcoded API key found',
            `${path.relative(srcDir, file)} matches ${pattern}`,
          );
        }
      }
    } catch (_) {}
  }

  if (!hardcodedKeyFound) {
    pass('No hardcoded API keys in source files');
  }

  // 4. Check CORS configuration
  const indexPath = path.resolve(__dirname, '../index.js');
  if (fs.existsSync(indexPath)) {
    const indexContent = fs.readFileSync(indexPath, 'utf-8');
    if (indexContent.includes('CORS_ORIGIN') || indexContent.includes('process.env.CORS_ORIGIN')) {
      pass('CORS uses environment variable');
    } else if (indexContent.includes("'*'") || indexContent.includes('"*"')) {
      fail('CORS allows all origins (wildcard *)');
    } else {
      warn('CORS configuration unclear');
    }

    // 5. Check rate limiting
    if (indexContent.includes('rateLimit') || indexContent.includes('express-rate-limit')) {
      pass('Rate limiting configured');
    } else {
      fail('No rate limiting found');
    }

    // 6. Check trust proxy
    if (indexContent.includes('trust proxy')) {
      pass('Trust proxy configured (for Railway)');
    } else {
      warn('Trust proxy not set', 'Rate limiting may not work behind proxy');
    }
  }

  // 7. Check database file permissions (Unix only)
  const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, '../../betbrain.db');
  if (fs.existsSync(dbPath)) {
    if (process.platform === 'win32') {
      pass('Database file exists', '(permission check skipped on Windows)');
    } else {
      try {
        const dbStats = fs.statSync(dbPath);
        const mode = (dbStats.mode & 0o777).toString(8);
        if (dbStats.mode & 0o002) {
          fail('Database is world-writable', `mode: ${mode}`);
        } else {
          pass('Database file permissions OK', `mode: ${mode}`);
        }
      } catch (_) {
        warn('Could not check database permissions');
      }
    }
  }

  // 8. Check package.json for known risky dependencies
  const pkgPath = path.resolve(__dirname, '../../package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.type === 'module') {
        pass('ES modules enabled');
      } else {
        warn('Not using ES modules');
      }

      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      const riskyDeps = ['eval', 'vm2', 'child_process'];
      const found = riskyDeps.filter((d) => deps[d]);
      if (found.length === 0) {
        pass('No risky dependencies found');
      } else {
        fail('Risky dependencies', found.join(', '));
      }
    } catch (_) {
      warn('Could not parse package.json');
    }
  }
}

/** Recursively collect .js files from a directory */
function collectSourceFiles(dir) {
  const files = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'test') {
        files.push(...collectSourceFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        files.push(fullPath);
      }
    }
  } catch (_) {}
  return files;
}

// ── Main Runner ─────────────────────────────────────────────────────

async function run() {
  report.totalStart = performance.now();

  console.log('');
  console.log(`${HEADER}${'═'.repeat(60)}${RESET}`);
  console.log(`${HEADER}  BetBrain Integration Test${RESET}`);
  console.log(`${HEADER}  ${todayStr()} — Full Pipeline E2E${RESET}`);
  console.log(`${HEADER}${'═'.repeat(60)}${RESET}`);

  // Flush cache to ensure clean run for miss/hit comparison
  flushCache();

  const gamesBySport = await step1_fetchGames();
  await step2_verifyEspnData(gamesBySport);
  await step3_verifyOdds(gamesBySport);
  const analysisResult = await step4_claudeAnalysis(gamesBySport);
  const validRec = step5_verifyRecommendations(analysisResult);
  const savedPick = step6_savePick(validRec, analysisResult);
  step7_markWonAndVerify(savedPick);
  await step8_cacheHits(gamesBySport);
  step9_report();
  step10_securityCheck();

  // ── Final Score ────────────────────────────────────────────────
  console.log('');
  console.log(`${HEADER}${'═'.repeat(60)}${RESET}`);
  const total = report.tests.passed + report.tests.failed;
  const pct = total > 0 ? ((report.tests.passed / total) * 100).toFixed(0) : 0;
  const color = report.tests.failed === 0 ? '\x1b[32m' : '\x1b[31m';
  console.log(
    `  ${color}${BOLD}${report.tests.passed}/${total} passed (${pct}%)${RESET}` +
      (report.tests.warned > 0 ? `  ${DIM}${report.tests.warned} warning(s)${RESET}` : '') +
      (report.tests.failed > 0
        ? `  \x1b[31m${report.tests.failed} failure(s)${RESET}`
        : ''),
  );
  console.log(`${HEADER}${'═'.repeat(60)}${RESET}`);
  console.log('');

  process.exit(report.tests.failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('\n\x1b[31mFatal error:\x1b[0m', err);
  process.exit(2);
});
