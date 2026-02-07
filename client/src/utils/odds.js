/**
 * Frontend odds utilities — display formatting and probability helpers.
 */

/**
 * Convert American odds to decimal odds.
 *
 * @param {number} odds - American odds (e.g. -110, +150)
 * @returns {number} Decimal odds (e.g. 1.909, 2.5)
 */
export function americanToDecimal(odds) {
  if (odds === 0) return 1;
  if (odds > 0) return odds / 100 + 1;
  return 100 / Math.abs(odds) + 1;
}

/**
 * Calculate the implied probability from American odds.
 *
 * @param {number} odds - American odds
 * @returns {number} Probability as a decimal (0–1)
 */
export function impliedProbability(odds) {
  if (odds === 0) return 0;
  if (odds > 0) return 100 / (odds + 100);
  return Math.abs(odds) / (Math.abs(odds) + 100);
}

/**
 * Format American odds for display with +/- prefix.
 *
 * @param {number | null | undefined} odds - American odds
 * @returns {string} Formatted string, e.g. "+150", "-110", "EVEN", or "—"
 *
 * @example
 *   formatOdds(150)  // "+150"
 *   formatOdds(-110) // "-110"
 *   formatOdds(100)  // "EVEN"
 *   formatOdds(null) // "—"
 */
export function formatOdds(odds) {
  if (odds == null) return '\u2014';
  if (odds === 100 || odds === -100) return 'EVEN';
  return odds > 0 ? `+${odds}` : `${odds}`;
}

/**
 * Format implied probability as a percentage string.
 *
 * @param {number} odds - American odds
 * @returns {string} e.g. "52.4%"
 */
export function formatProbability(odds) {
  if (odds == null) return '\u2014';
  return `${(impliedProbability(odds) * 100).toFixed(1)}%`;
}
