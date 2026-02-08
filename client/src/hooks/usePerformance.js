import { useState, useEffect, useCallback } from 'react';
import { performanceApi } from '../services/api';

export default function usePerformance(range = '7d') {
  const [summary, setSummary] = useState(null);
  const [bySport, setBySport] = useState([]);
  const [byBetType, setByBetType] = useState([]);
  const [byConfidence, setByConfidence] = useState([]);
  const [roiData, setRoiData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      performanceApi.summary(range),
      performanceApi.bySport(),
      performanceApi.byBetType(),
      performanceApi.byConfidence(),
      performanceApi.roi(range),
    ])
      .then(([sum, sport, bet, conf, roi]) => {
        if (cancelled) return;
        setSummary(sum);
        setBySport(sport);
        setByBetType(bet);
        setByConfidence(conf);

        // Build cumulative profit series
        let cumulative = 0;
        setRoiData(
          roi.map((d) => {
            cumulative += d.profit || 0;
            return {
              date: d.date,
              profit: d.profit || 0,
              cumulative: parseFloat(cumulative.toFixed(2)),
              wins: d.wins,
              losses: d.losses,
            };
          }),
        );
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [range, refreshKey]);

  return { summary, bySport, byBetType, byConfidence, roiData, loading, error, refetch };
}
