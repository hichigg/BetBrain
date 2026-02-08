import { useState, useEffect } from 'react';
import { picksApi } from '../services/api';

export function useTopPicks(date, limit = 5) {
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    picksApi
      .top(date, limit)
      .then((data) => {
        if (!cancelled) setPicks(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [date, limit]);

  return { picks, loading, error };
}

export function usePicks(sport, date) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sport) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    picksApi
      .getAll(sport, date)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sport, date]);

  return { data, loading, error };
}
