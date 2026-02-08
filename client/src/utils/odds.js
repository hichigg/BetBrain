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

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

/**
 * Convert American odds to fractional odds string.
 *
 * @param {number} odds - American odds
 * @returns {string} e.g. "3/2", "10/11", "EVEN"
 */
export function americanToFractional(odds) {
  if (odds == null) return '\u2014';
  if (odds === 100 || odds === -100) return 'EVEN';
  let num, den;
  if (odds > 0) {
    num = odds;
    den = 100;
  } else {
    num = 100;
    den = Math.abs(odds);
  }
  const d = gcd(num, den);
  return `${num / d}/${den / d}`;
}

/**
 * Format odds in the given display format.
 *
 * @param {number | string | null | undefined} odds - American odds (number or string like "+150")
 * @param {'american' | 'decimal' | 'fractional'} format - Display format
 * @returns {string} Formatted odds string
 */
export function formatOddsDisplay(odds, format = 'american') {
  if (odds == null) return '\u2014';
  const numOdds = typeof odds === 'string' ? parseInt(odds, 10) : odds;
  if (isNaN(numOdds)) return typeof odds === 'string' ? odds : '\u2014';

  switch (format) {
    case 'decimal':
      return americanToDecimal(numOdds).toFixed(2);
    case 'fractional':
      return americanToFractional(numOdds);
    default:
      return formatOdds(numOdds);
  }
}
