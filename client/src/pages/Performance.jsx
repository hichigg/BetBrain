import { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import usePerformance from '../hooks/usePerformance';
import ErrorPanel from '../components/common/ErrorPanel';

const RANGES = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
  { key: 'all', label: 'All' },
];

const SPORT_LABELS = {
  nfl: 'NFL',
  ncaaf: 'NCAAF',
  nba: 'NBA',
  ncaab: 'NCAAB',
  mlb: 'MLB',
  nhl: 'NHL',
};

const BET_TYPE_LABELS = {
  spread: 'Spread',
  moneyline: 'Moneyline',
  over_under: 'Over/Under',
  player_prop: 'Player Prop',
};

// ── Main Page ───────────────────────────────────────────────────────

export default function Performance() {
  const [range, setRange] = useState('30d');
  const { summary, bySport, byBetType, byConfidence, roiData, loading, error, refetch } =
    usePerformance(range);

  if (loading) return <PageSkeleton />;

  if (error) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">Performance</h1>
          <p className="text-gray-500 text-sm">Track your record, ROI, and calibration</p>
        </div>
        <ErrorPanel message={`Failed to load performance data: ${error}`} onRetry={refetch} />
      </div>
    );
  }

  const winPct =
    summary && summary.record.wins + summary.record.losses > 0
      ? (
          (summary.record.wins /
            (summary.record.wins + summary.record.losses)) *
          100
        ).toFixed(1)
      : '0.0';

  const bestSport =
    bySport.length > 0
      ? bySport.reduce((best, s) => (s.profit > best.profit ? s : best), bySport[0])
      : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Performance</h1>
          <p className="text-gray-500 text-sm">
            Track your record, ROI, and calibration
          </p>
        </div>

        {/* Range selector */}
        <div className="flex gap-1 bg-gray-800/50 rounded-lg p-1">
          {RANGES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                range === key
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          <StatCard label="Total Picks" value={summary.totalPicks} />
          <StatCard
            label="Record"
            value={`${summary.record.wins}-${summary.record.losses}${summary.record.pushes > 0 ? `-${summary.record.pushes}` : ''}`}
          />
          <StatCard label="Win %" value={`${winPct}%`} />
          <StatCard
            label="Units +/-"
            value={`${summary.units >= 0 ? '+' : ''}${summary.units}`}
            color={
              summary.units > 0
                ? 'text-emerald-400'
                : summary.units < 0
                  ? 'text-red-400'
                  : 'text-white'
            }
          />
          <StatCard
            label="ROI"
            value={`${summary.roi >= 0 ? '+' : ''}${summary.roi}%`}
            color={
              summary.roi > 0
                ? 'text-emerald-400'
                : summary.roi < 0
                  ? 'text-red-400'
                  : 'text-white'
            }
          />
          <StatCard
            label="Best Sport"
            value={
              bestSport
                ? SPORT_LABELS[bestSport.sport] || bestSport.sport.toUpperCase()
                : '—'
            }
          />
        </div>
      )}

      {/* No data state */}
      {summary && summary.totalPicks === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Profit over time chart */}
          {roiData.length > 0 && (
            <Section title="Cumulative Profit" className="mb-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={roiData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      tickFormatter={(d) => {
                        const parts = d.split('-');
                        return `${parts[1]}/${parts[2]}`;
                      }}
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      tickFormatter={(v) => `${v}u`}
                    />
                    <Tooltip content={<ProfitTooltip />} />
                    <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                    <Line
                      type="monotone"
                      dataKey="cumulative"
                      stroke="#818cf8"
                      strokeWidth={2}
                      dot={{ fill: '#818cf8', r: 3 }}
                      activeDot={{ r: 5, fill: '#6366f1' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* By Sport */}
            {bySport.length > 0 && (
              <Section title="By Sport">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700/50">
                        <Th align="left">Sport</Th>
                        <Th>Record</Th>
                        <Th>Win %</Th>
                        <Th>Profit</Th>
                        <Th>ROI</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/30">
                      {bySport.map((row) => {
                        const settled = row.record.wins + row.record.losses;
                        const wp = settled > 0 ? ((row.record.wins / settled) * 100).toFixed(1) : '—';
                        return (
                          <tr key={row.sport} className="hover:bg-gray-800/30 transition-colors">
                            <Td align="left" bold>
                              {SPORT_LABELS[row.sport] || row.sport?.toUpperCase()}
                            </Td>
                            <Td>
                              {row.record.wins}-{row.record.losses}
                              {row.record.pushes > 0 ? `-${row.record.pushes}` : ''}
                            </Td>
                            <Td>{wp}%</Td>
                            <Td color={row.profit > 0 ? 'text-emerald-400' : row.profit < 0 ? 'text-red-400' : ''}>
                              {row.profit > 0 ? '+' : ''}
                              {row.profit}u
                            </Td>
                            <Td color={row.roi > 0 ? 'text-emerald-400' : row.roi < 0 ? 'text-red-400' : ''}>
                              {row.roi > 0 ? '+' : ''}
                              {row.roi}%
                            </Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            {/* By Bet Type */}
            {byBetType.length > 0 && (
              <Section title="By Bet Type">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700/50">
                        <Th align="left">Type</Th>
                        <Th>Record</Th>
                        <Th>Win %</Th>
                        <Th>Profit</Th>
                        <Th>ROI</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/30">
                      {byBetType.map((row) => {
                        const settled = row.record.wins + row.record.losses;
                        const wp = settled > 0 ? ((row.record.wins / settled) * 100).toFixed(1) : '—';
                        return (
                          <tr key={row.bet_type} className="hover:bg-gray-800/30 transition-colors">
                            <Td align="left" bold>
                              {BET_TYPE_LABELS[row.bet_type] || row.bet_type}
                            </Td>
                            <Td>
                              {row.record.wins}-{row.record.losses}
                              {row.record.pushes > 0 ? `-${row.record.pushes}` : ''}
                            </Td>
                            <Td>{wp}%</Td>
                            <Td color={row.profit > 0 ? 'text-emerald-400' : row.profit < 0 ? 'text-red-400' : ''}>
                              {row.profit > 0 ? '+' : ''}
                              {row.profit}u
                            </Td>
                            <Td color={row.roi > 0 ? 'text-emerald-400' : row.roi < 0 ? 'text-red-400' : ''}>
                              {row.roi > 0 ? '+' : ''}
                              {row.roi}%
                            </Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}
          </div>

          {/* Confidence Calibration */}
          {byConfidence.length > 0 && (
            <Section title="Confidence Calibration" className="mb-6">
              <p className="text-xs text-gray-500 mb-4">
                Compares AI confidence scores against actual win rates. Well-calibrated
                predictions should have win % close to confidence level.
              </p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={byConfidence.map((d) => ({
                      ...d,
                      expectedWinPct: d.avgConfidence * 10,
                    }))}
                    margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="tier"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      tickFormatter={(v) => `${v}%`}
                      domain={[0, 100]}
                    />
                    <Tooltip content={<CalibrationTooltip />} />
                    <Bar
                      dataKey="expectedWinPct"
                      name="Expected Win %"
                      fill="#4f46e5"
                      opacity={0.4}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="winPct"
                      name="Actual Win %"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Calibration legend */}
              <div className="flex items-center gap-6 mt-3 justify-center">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-indigo-600 opacity-40" />
                  <span className="text-xs text-gray-500">Expected Win %</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                  <span className="text-xs text-gray-500">Actual Win %</span>
                </div>
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function StatCard({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700/40 px-4 py-4">
      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function Section({ title, className = '', children }) {
  return (
    <div
      className={`bg-gray-800/50 rounded-xl border border-gray-700/40 overflow-hidden ${className}`}
    >
      <div className="px-5 py-3.5 border-b border-gray-700/30">
        <h2 className="text-sm font-semibold text-gray-300">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Th({ children, align = 'center' }) {
  return (
    <th
      className={`px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider ${
        align === 'left' ? 'text-left' : 'text-center'
      }`}
    >
      {children}
    </th>
  );
}

function Td({ children, align = 'center', bold = false, color = '' }) {
  return (
    <td
      className={`px-3 py-2.5 text-sm ${align === 'left' ? 'text-left' : 'text-center'} ${
        bold ? 'font-medium text-gray-200' : color || 'text-gray-400'
      }`}
    >
      {children}
    </td>
  );
}

function ProfitTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className={`font-mono font-semibold ${d.cumulative >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {d.cumulative >= 0 ? '+' : ''}{d.cumulative}u cumulative
      </p>
      <p className="text-gray-500 mt-0.5">
        {d.wins}W {d.losses}L &middot; {d.profit >= 0 ? '+' : ''}{d.profit}u today
      </p>
    </div>
  );
}

function CalibrationTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-300 font-medium mb-1">{d.tier}</p>
      <p className="text-gray-400">
        Record: {d.record.wins}-{d.record.losses}
        {d.record.pushes > 0 ? `-${d.record.pushes}` : ''}
      </p>
      <p className="text-indigo-400">Expected: {d.expectedWinPct.toFixed(0)}%</p>
      <p className="text-emerald-400">Actual: {d.winPct}%</p>
      <p className={`font-mono ${d.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {d.profit >= 0 ? '+' : ''}{d.profit}u
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-gray-800/30 rounded-xl border border-gray-700/30 py-16 text-center">
      <svg
        className="w-12 h-12 text-gray-700 mx-auto mb-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 3v18h18" />
        <path d="M7 16l4-6 4 3 5-7" />
      </svg>
      <p className="text-gray-400 font-medium mb-1">No performance data yet</p>
      <p className="text-gray-600 text-sm">
        Add picks to your bet slip and mark results to see your performance.
      </p>
    </div>
  );
}

// ── Skeleton ────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-7 w-40 bg-gray-800 rounded mb-2" />
          <div className="h-4 w-56 bg-gray-800/60 rounded" />
        </div>
        <div className="h-9 w-44 bg-gray-800/50 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-gray-800/50 rounded-xl border border-gray-700/40 px-4 py-4">
            <div className="h-3 w-14 bg-gray-700 rounded mb-3" />
            <div className="h-6 w-10 bg-gray-700 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/40 h-72 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 rounded-xl border border-gray-700/40 h-48" />
        <div className="bg-gray-800/50 rounded-xl border border-gray-700/40 h-48" />
      </div>
    </div>
  );
}
