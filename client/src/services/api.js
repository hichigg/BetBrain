const API_BASE = '/api';

async function request(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Request failed');
    }
    return data.data;
  } catch (err) {
    console.error(`API error [${endpoint}]:`, err.message);
    throw err;
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
    request('/picks/analyze', { method: 'POST', body: JSON.stringify(body) }),
  getAll: (sport, date) => request(`/picks?sport=${sport}&date=${date}`),
  top: (date, limit = 5) => {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    params.set('limit', limit);
    return request(`/picks/top?${params}`);
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

export const performanceApi = {
  summary: (range = '7d') => request(`/performance/summary?range=${range}`),
  bySport: () => request('/performance/by-sport'),
  byBetType: () => request('/performance/by-bet-type'),
  byConfidence: () => request('/performance/by-confidence'),
  roi: (range = '30d') => request(`/performance/roi?range=${range}`),
};
