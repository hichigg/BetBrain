import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

const STORAGE_KEY = 'betbrain_settings';

export const SPORTSBOOKS = [
  { key: 'fanduel', label: 'FanDuel' },
  { key: 'draftkings', label: 'DraftKings' },
  { key: 'betmgm', label: 'BetMGM' },
  { key: 'caesars', label: 'Caesars' },
  { key: 'pointsbet', label: 'PointsBet' },
  { key: 'bet365', label: 'Bet365' },
  { key: 'bovada', label: 'Bovada' },
  { key: 'betrivers', label: 'BetRivers' },
  { key: 'unibet', label: 'Unibet' },
  { key: 'wynnbet', label: 'WynnBET' },
  { key: 'superbook', label: 'SuperBook' },
  { key: 'twinspires', label: 'TwinSpires' },
  { key: 'betus', label: 'BetUS' },
];

export const ALL_SPORTS = [
  { key: 'nfl', label: 'NFL' },
  { key: 'ncaaf', label: 'NCAAF' },
  { key: 'nba', label: 'NBA' },
  { key: 'ncaab', label: 'NCAAB' },
  { key: 'mlb', label: 'MLB' },
  { key: 'nhl', label: 'NHL' },
];

export const DEFAULT_SETTINGS = {
  preferredBooks: ['fanduel', 'draftkings'],
  bankroll: 1000,
  riskTolerance: 'moderate',
  trackedSports: ['nfl', 'ncaaf', 'nba', 'ncaab', 'mlb', 'nhl'],
  oddsFormat: 'american',
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = useCallback((partial) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  const toggleBook = useCallback((key) => {
    setSettings((prev) => {
      const books = prev.preferredBooks.includes(key)
        ? prev.preferredBooks.filter((b) => b !== key)
        : [...prev.preferredBooks, key];
      return { ...prev, preferredBooks: books };
    });
  }, []);

  const toggleSport = useCallback((key) => {
    setSettings((prev) => {
      const sports = prev.trackedSports.includes(key)
        ? prev.trackedSports.filter((s) => s !== key)
        : [...prev.trackedSports, key];
      return { ...prev, trackedSports: sports };
    });
  }, []);

  const value = useMemo(
    () => ({ settings, updateSettings, resetSettings, toggleBook, toggleSport }),
    [settings, updateSettings, resetSettings, toggleBook, toggleSport],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return ctx;
}
