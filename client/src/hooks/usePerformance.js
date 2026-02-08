import { useState, useEffect } from 'react';
import { performanceApi } from '../services/api';

export default function usePerformance(range = '7d') {
  const [summary, setSummary] = useState(null);
  const [bySport, setBySport] = useState([]);
  const [byBetType, setByBetType] = useState([]);
  const [byConfidence, setByConfidence] = useState([]);
  const [roiData, setRoiData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

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
      .catch((err) => console.error('Performance fetch failed:', err.message))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [range]);

  return { summary, bySport, byBetType, byConfidence, roiData, loading };
}
