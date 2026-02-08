import { useState, useEffect } from 'react';
import { oddsApi } from '../services/api';

export default function useOddsUsage(pollInterval = 120_000) {
  const [usage, setUsage] = useState({ remaining: null, used: null });

  useEffect(() => {
    let cancelled = false;

    function fetch() {
      oddsApi
        .usage()
        .then((data) => {
          if (!cancelled) setUsage(data);
        })
        .catch(() => {});
    }

    fetch();
    const id = setInterval(fetch, pollInterval);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pollInterval]);

  return usage;
}
