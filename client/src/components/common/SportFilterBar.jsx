import { Link } from 'react-router-dom';

const SPORTS = [
  { key: 'nfl', label: 'NFL' },
  { key: 'ncaaf', label: 'NCAAF' },
  { key: 'nba', label: 'NBA' },
  { key: 'ncaab', label: 'NCAAB' },
  { key: 'mlb', label: 'MLB' },
  { key: 'nhl', label: 'NHL' },
];

function SportFilterBar({ gameCounts = {}, activeSport, onSelect, linkMode = false, visibleSports }) {
  const sports = visibleSports ? SPORTS.filter((s) => visibleSports.includes(s.key)) : SPORTS;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {sports.map((s) => {
        const count = gameCounts[s.key] ?? null;
        const isActive = activeSport === s.key;

        const classes = `flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
          isActive
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
            : 'bg-gray-800/70 text-gray-400 hover:bg-gray-700/70 hover:text-gray-200'
        }`;

        const inner = (
          <>
            {s.label}
            {count !== null && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-700 text-gray-500'
                }`}
              >
                {count}
              </span>
            )}
          </>
        );

        if (linkMode) {
          return (
            <Link key={s.key} to={`/games?sport=${s.key}`} className={classes}>
              {inner}
            </Link>
          );
        }

        return (
          <button key={s.key} onClick={() => onSelect?.(s.key)} className={classes}>
            {inner}
          </button>
        );
      })}
    </div>
  );
}

export default SportFilterBar;
