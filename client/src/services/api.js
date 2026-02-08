const API_BASE = import.meta.env.VITE_API_URL || '/api';
const DEFAULT_TIMEOUT = 15_000;
const ANALYSIS_TIMEOUT = 90_000;

export class ApiError extends Error {
  constructor(message, type = 'api') {
    super(message);
    this.name = 'ApiError';
    this.type = type; // 'api' | 'network' | 'timeout'
  }
}

async function request(endpoint, options = {}, timeoutMs = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('betbrain_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers,
      ...options,
      signal: controller.signal,
    });
    const data = await res.json();
    if (!data.success) {
      throw new ApiError(data.error || 'Request failed', 'api');
    }
    return data.data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.name === 'AbortError') {
      throw new ApiError('Request timed out. Please try again.', 'timeout');
    }
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new ApiError('Network error — check your connection.', 'network');
    }
    throw new ApiError(err.message || 'Request failed', 'api');
  } finally {
    clearTimeout(timer);
  }
}

export const gamesApi = {
  getAll: (sport = 'all', date) => {
    const params = new URLSearchParams();
    if (sport) params.set('sport', sport);
    if (date) params.set('date', date);
    return request(`/games?${params}`);
  },
  getDetail: (sport, gameId) => request(`/games/${sport}/${gameId}`),
};

export const picksApi = {
  analyze: (body) =>
    request('/picks/analyze', { method: 'POST', body: JSON.stringify(body) }, ANALYSIS_TIMEOUT),
  getAll: (sport, date) => request(`/picks?sport=${sport}&date=${date}`),
  top: (date, limit = 5) => {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    params.set('limit', limit);
    return request(`/picks/top?${params}`, {}, ANALYSIS_TIMEOUT);
  },
};

export const betslipApi = {
  getAll: () => request('/betslip'),
  add: (pick) =>
    request('/betslip', { method: 'POST', body: JSON.stringify(pick) }),
  update: (id, body) =>
    request(`/betslip/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  remove: (id) => request(`/betslip/${id}`, { method: 'DELETE' }),
};

export const oddsApi = {
  usage: () => request('/odds/usage'),
};

export const authApi = {
  loginGoogle: (credential) =>
    request('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),
  me: () => request('/auth/me'),
};

export const subscriptionApi = {
  checkout: (plan) =>
    request('/subscription/checkout', { method: 'POST', body: JSON.stringify({ plan }) }),
  portal: () =>
    request('/subscription/portal', { method: 'POST' }),
  status: () => request('/subscription/status'),
};

export const performanceApi = {
  summary: (range = '7d') => request(`/performance/summary?range=${range}`),
  bySport: () => request('/performance/by-sport'),
  byBetType: () => request('/performance/by-bet-type'),
  byConfidence: () => request('/performance/by-confidence'),
  roi: (range = '30d') => request(`/performance/roi?range=${range}`),
};
