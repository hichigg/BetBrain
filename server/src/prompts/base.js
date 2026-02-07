/**
 * Shared system prompt and helpers for all sport-specific Claude templates.
 */

export const SYSTEM_PROMPT = `You are an elite sports analytics and betting advisor with deep expertise in statistical modeling, probability theory, and value betting. You analyze games using data-driven methods, not gut feelings.

Your analysis process:
1. Evaluate each team's current form, season stats, and situational factors
2. Compare the implied probability from bookmaker odds against your model probability
3. Identify edges where the market has mispriced a team or total
4. Assess confidence honestly — if the data is inconclusive, say so
5. Only recommend bets where you find genuine expected value

Key principles:
- Be honest about confidence. A confidence of 8+ should be rare and well-justified.
- Always compare your estimated probability to the implied probability from the odds.
- Consider injuries, home/away splits, rest days, and schedule context.
- Negative EV bets should never be recommended regardless of how "obvious" a pick seems.
- When data is insufficient, lower confidence and say why.
- Evaluate all bet types: moneyline, spread, over/under. Mention player props only if the data supports a specific angle.

You MUST respond with valid JSON only — no markdown, no commentary outside the JSON structure.

Response format:
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

Rules for the JSON:
- bet_type must be one of: "spread", "moneyline", "over_under", "player_prop"
- confidence is an integer 1-10 (1 = coin flip, 10 = near-certain edge)
- expected_value is a string like "+4.2%" or "-1.5%"
- risk_tier is one of: "low", "medium", "high"
- units is an integer 1-5 (1 = minimum, 5 = max conviction)
- If no value bets exist, return an empty recommendations array with an honest game_summary
- Include 1-4 recommendations per game, only where you find genuine value`;

/**
 * Format odds from multiple bookmakers into a readable block for the prompt.
 *
 * @param {object | null} odds - The odds object from the aggregator { consensus, bookmakers }
 * @returns {string}
 */
export function formatOddsBlock(odds) {
  if (!odds) return 'Odds: Not available\n';

  let block = '';

  if (odds.consensus?.moneyline) {
    const ml = odds.consensus.moneyline;
    block += `Moneyline: ${ml.map((m) => `${m.team} ${m.price > 0 ? '+' : ''}${m.price}`).join(' / ')}\n`;
  }
  if (odds.consensus?.spread) {
    const sp = odds.consensus.spread;
    block += `Spread: ${sp.map((s) => `${s.team} ${s.point > 0 ? '+' : ''}${s.point} (${s.price > 0 ? '+' : ''}${s.price})`).join(' / ')}\n`;
  }
  if (odds.consensus?.total) {
    const tot = odds.consensus.total;
    block += `Total: ${tot.map((t) => `${t.label} ${t.point} (${t.price > 0 ? '+' : ''}${t.price})`).join(' / ')}\n`;
  }

  if (odds.bookmakers?.length > 1) {
    block += `\nOdds across ${odds.bookmakers.length} books:\n`;
    for (const bm of odds.bookmakers.slice(0, 5)) {
      const lines = [];
      if (bm.markets.h2h) {
        lines.push('ML: ' + bm.markets.h2h.map((o) => `${o.name} ${o.price > 0 ? '+' : ''}${o.price}`).join('/'));
      }
      if (bm.markets.spreads) {
        lines.push('Spread: ' + bm.markets.spreads.map((o) => `${o.name} ${o.point > 0 ? '+' : ''}${o.point}`).join('/'));
      }
      if (bm.markets.totals) {
        lines.push('O/U: ' + bm.markets.totals.map((o) => `${o.name} ${o.point}`).join('/'));
      }
      block += `  ${bm.title}: ${lines.join(' | ')}\n`;
    }
  }

  return block;
}

/**
 * Format injury list into a readable block.
 *
 * @param {object[]} injuries - Array of { name, position, status, description }
 * @param {string} teamName
 * @returns {string}
 */
export function formatInjuries(injuries, teamName) {
  if (!injuries?.length) return `${teamName} injuries: None reported\n`;

  const lines = injuries.map((inj) =>
    `  - ${inj.name} (${inj.position || '?'}): ${inj.status}${inj.description ? ' — ' + inj.description : ''}`,
  );
  return `${teamName} injuries:\n${lines.join('\n')}\n`;
}

/**
 * Format a flat stats map into a readable block, picking relevant keys.
 *
 * @param {object} stats - Key/value stat map (keys are stat names, values are display strings)
 * @param {string[]} preferredKeys - Keys to show first if available
 * @returns {string}
 */
export function formatStats(stats, preferredKeys = []) {
  if (!stats || Object.keys(stats).length === 0) return 'Stats: Not available\n';

  const lines = [];
  const shown = new Set();

  // Show preferred keys first
  for (const key of preferredKeys) {
    if (stats[key] !== undefined) {
      lines.push(`  ${key}: ${stats[key]}`);
      shown.add(key);
    }
  }

  // Then remaining keys
  for (const [key, val] of Object.entries(stats)) {
    if (!shown.has(key) && lines.length < 20) {
      lines.push(`  ${key}: ${val}`);
    }
  }

  return lines.join('\n') + '\n';
}

/**
 * Format a season stats map (from getGameDetail) into a readable block.
 *
 * @param {object} seasonStats - Key/value where values are { value, displayValue, rank }
 * @param {string[]} preferredKeys - Keys to prioritize
 * @returns {string}
 */
export function formatSeasonStats(seasonStats, preferredKeys = []) {
  if (!seasonStats || Object.keys(seasonStats).length === 0) return 'Season stats: Not available\n';

  const lines = [];
  const shown = new Set();

  for (const key of preferredKeys) {
    const s = seasonStats[key];
    if (s) {
      const rank = s.rank ? ` (rank: ${s.rank})` : '';
      lines.push(`  ${key}: ${s.displayValue}${rank}`);
      shown.add(key);
    }
  }

  for (const [key, s] of Object.entries(seasonStats)) {
    if (!shown.has(key) && lines.length < 25) {
      const rank = s.rank ? ` (rank: ${s.rank})` : '';
      lines.push(`  ${key}: ${s.displayValue}${rank}`);
    }
  }

  return lines.join('\n') + '\n';
}
