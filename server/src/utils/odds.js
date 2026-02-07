/**
 * Odds math utilities — pure functions for probability, EV, and bet sizing.
 */

/**
 * Convert American odds to decimal odds.
 *
 * @param {number} odds - American odds (e.g. -110, +150)
 * @returns {number} Decimal odds (e.g. 1.909, 2.5)
 *
 * @example
 *   americanToDecimal(-110) // 1.909
 *   americanToDecimal(+150) // 2.5
 *   americanToDecimal(100)  // 2.0
 */
export function americanToDecimal(odds) {
  if (odds === 0) return 1;
  if (odds > 0) return odds / 100 + 1;
  return 100 / Math.abs(odds) + 1;
}

/**
 * Convert decimal odds to American odds.
 *
 * @param {number} decimal - Decimal odds (e.g. 1.909, 2.5)
 * @returns {number} American odds, rounded to nearest integer
 *
 * @example
 *   decimalToAmerican(2.5)   // 150
 *   decimalToAmerican(1.909) // -110
 *   decimalToAmerican(2.0)   // 100
 */
export function decimalToAmerican(decimal) {
  if (decimal <= 1) return 0;
  if (decimal === 2) return 100;
  if (decimal >= 2) return Math.round((decimal - 1) * 100);
  return Math.round(-100 / (decimal - 1));
}

/**
 * Calculate the implied probability from American odds.
 * This is the bookmaker's raw probability including vig.
 *
 * @param {number} odds - American odds
 * @returns {number} Probability as a decimal (0–1), e.g. 0.5238
 *
 * @example
 *   impliedProbability(-110) // ~0.5238
 *   impliedProbability(+150) // ~0.4000
 *   impliedProbability(100)  // 0.5000
 */
export function impliedProbability(odds) {
  if (odds === 0) return 0;
  if (odds > 0) return 100 / (odds + 100);
  return Math.abs(odds) / (Math.abs(odds) + 100);
}

/**
 * Remove the vig (overround) and return fair/true probabilities.
 * Uses the multiplicative method: divide each implied prob by their sum.
 *
 * @param {number} homeOdds - American odds for the home side
 * @param {number} awayOdds - American odds for the away side
 * @returns {{ home: number, away: number, overround: number }}
 *   home/away are fair probabilities (0–1), overround is the vig %
 *
 * @example
 *   removeVig(-110, -110) // { home: 0.5, away: 0.5, overround: 0.0476 }
 */
export function removeVig(homeOdds, awayOdds) {
  const homeImpl = impliedProbability(homeOdds);
  const awayImpl = impliedProbability(awayOdds);
  const total = homeImpl + awayImpl;

  if (total === 0) return { home: 0, away: 0, overround: 0 };

  return {
    home: homeImpl / total,
    away: awayImpl / total,
    overround: total - 1,
  };
}

/**
 * Calculate expected value of a bet.
 * EV = (probability * potentialProfit) - ((1 - probability) * stake)
 * Expressed as a percentage of the stake.
 *
 * @param {number} probability - Your estimated true probability (0–1)
 * @param {number} americanOdds - The odds being offered
 * @returns {number} EV as a percentage (e.g. 4.5 means +4.5% EV)
 *
 * @example
 *   expectedValue(0.55, -110) // ~4.55 (positive = profitable long-term)
 *   expectedValue(0.40, +150) // 0.0 (break-even)
 */
export function expectedValue(probability, americanOdds) {
  const decimal = americanToDecimal(americanOdds);
  // EV = (prob * (decimal - 1)) - ((1 - prob) * 1), on a $1 stake
  const ev = probability * (decimal - 1) - (1 - probability);
  return ev * 100; // as percentage
}

/**
 * Kelly criterion for optimal bet sizing.
 * Full Kelly = (bp - q) / b, where b = decimal odds - 1, p = prob, q = 1 - p.
 * Quarter-Kelly is the default for risk management.
 *
 * @param {number} probability - Your estimated true probability (0–1)
 * @param {number} americanOdds - The odds being offered
 * @param {number} [bankroll=1000] - Total bankroll
 * @param {number} [fraction=0.25] - Kelly fraction (0.25 = quarter-Kelly)
 * @returns {{ fraction: number, amount: number, fullKelly: number }}
 *   fraction = recommended % of bankroll, amount = dollar amount, fullKelly = raw Kelly %
 *
 * @example
 *   kellyBet(0.55, -110, 1000, 0.25) // { fraction: 0.0126, amount: 12.6, fullKelly: 0.0505 }
 */
export function kellyBet(probability, americanOdds, bankroll = 1000, fraction = 0.25) {
  const decimal = americanToDecimal(americanOdds);
  const b = decimal - 1;

  if (b <= 0) return { fraction: 0, amount: 0, fullKelly: 0 };

  const q = 1 - probability;
  const fullKelly = (b * probability - q) / b;

  // Never recommend negative bets (no edge); treat tiny floats as zero
  if (fullKelly <= 1e-10) return { fraction: 0, amount: 0, fullKelly: 0 };

  const adjusted = fullKelly * fraction;

  return {
    fraction: adjusted,
    amount: Math.round(adjusted * bankroll * 100) / 100,
    fullKelly,
  };
}

/**
 * Find the best available odds across multiple bookmakers for a given outcome.
 * Takes an array of { bookmaker, price } and returns the best one.
 *
 * @param {Array<{ bookmaker: string, price: number }>} bookmakerOdds
 * @returns {{ bookmaker: string, price: number } | null} Best odds entry, or null if empty
 *
 * @example
 *   bestOdds([
 *     { bookmaker: 'FanDuel', price: -110 },
 *     { bookmaker: 'DraftKings', price: -105 },
 *     { bookmaker: 'BetMGM', price: -112 },
 *   ])
 *   // { bookmaker: 'DraftKings', price: -105 }
 */
export function bestOdds(bookmakerOdds) {
  if (!bookmakerOdds?.length) return null;

  return bookmakerOdds.reduce((best, current) => {
    // Higher American odds = better for the bettor
    // For positive: +200 > +150. For negative: -105 > -110.
    // Comparing decimal equivalents handles both cases cleanly.
    const bestDec = americanToDecimal(best.price);
    const currDec = americanToDecimal(current.price);
    return currDec > bestDec ? current : best;
  });
}
