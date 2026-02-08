export const TIMEOUTS = {
  ESPN: 10_000,
  ODDS: 10_000,
  BDL: 10_000,
  CLAUDE: 60_000,
};

/**
 * Fetch wrapper with AbortController-based timeout.
 *
 * @param {string} url
 * @param {RequestInit} [options={}]
 * @param {number} [timeoutMs=10000]
 * @returns {Promise<Response>}
 */
export default async function fetchWithTimeout(url, options = {}, timeoutMs = 10_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
