import { useSettings, SPORTSBOOKS, ALL_SPORTS, DEFAULT_SETTINGS } from '../hooks/useSettings';
import { useToast } from '../components/common/Toast';

const RISK_LEVELS = [
  {
    key: 'conservative',
    label: 'Conservative',
    description: 'Only show high-confidence picks. Hides confidence < 6 and high-risk picks under 7.',
  },
  {
    key: 'moderate',
    label: 'Moderate',
    description: 'Show all picks regardless of confidence or risk tier.',
  },
  {
    key: 'aggressive',
    label: 'Aggressive',
    description: 'Show all picks. Designed for bettors comfortable with higher risk.',
  },
];

const ODDS_FORMATS = [
  { key: 'american', label: 'American', example: '-110' },
  { key: 'decimal', label: 'Decimal', example: '1.91' },
  { key: 'fractional', label: 'Fractional', example: '10/11' },
];

function SettingsSection({ title, description, children }) {
  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700/40 p-5">
      <h2 className="text-sm font-semibold text-gray-200 mb-1">{title}</h2>
      {description && (
        <p className="text-xs text-gray-500 mb-4">{description}</p>
      )}
      {children}
    </div>
  );
}

export default function Settings() {
  const { settings, updateSettings, resetSettings, toggleBook, toggleSport } = useSettings();
  const { addToast } = useToast();

  const unitAmount = settings.startingBankroll * 0.01;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
        <p className="text-gray-500 text-sm">
          Changes are saved automatically.
        </p>
      </div>

      {/* 1. Preferred Sportsbooks */}
      <SettingsSection
        title="Preferred Sportsbooks"
        description="Highlighted in odds comparison tables so you can spot your books quickly."
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SPORTSBOOKS.map((book) => {
            const checked = settings.preferredBooks.includes(book.key);
            return (
              <label
                key={book.key}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                  checked
                    ? 'bg-indigo-600/15 border border-indigo-500/40'
                    : 'bg-gray-800/70 border border-gray-700/40 hover:border-gray-600/60'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleBook(book.key)}
                  className="w-3.5 h-3.5 rounded border-gray-600 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0 bg-gray-700"
                />
                <span className={`text-sm ${checked ? 'text-gray-200' : 'text-gray-400'}`}>
                  {book.label}
                </span>
              </label>
            );
          })}
        </div>
      </SettingsSection>

      {/* 2. Bankroll */}
      <SettingsSection
        title="Starting Bankroll"
        description="Set your starting bankroll. 1 unit = 1% of this amount. Your live balance is tracked on the Bet Slip page."
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
            <input
              type="number"
              min="0"
              step="100"
              value={settings.startingBankroll}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (!Number.isNaN(val)) updateSettings({ startingBankroll: Math.max(0, val) });
              }}
              className="w-full sm:w-40 pl-7 pr-3 py-2.5 bg-gray-800 border border-gray-700/60 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          1 unit = ${unitAmount.toFixed(2)}
        </p>
      </SettingsSection>

      {/* 3. Risk Tolerance */}
      <SettingsSection
        title="Risk Tolerance"
        description="Controls which picks appear on the Dashboard based on confidence and risk level."
      >
        <div className="space-y-2">
          {RISK_LEVELS.map((level) => {
            const active = settings.riskTolerance === level.key;
            return (
              <button
                key={level.key}
                onClick={() => updateSettings({ riskTolerance: level.key })}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                  active
                    ? 'bg-indigo-600/15 border-indigo-500/40'
                    : 'bg-gray-800/70 border-gray-700/40 hover:border-gray-600/60'
                }`}
              >
                <span className={`text-sm font-medium ${active ? 'text-indigo-300' : 'text-gray-300'}`}>
                  {level.label}
                </span>
                <p className="text-xs text-gray-500 mt-0.5">{level.description}</p>
              </button>
            );
          })}
        </div>
      </SettingsSection>

      {/* 4. Sports to Track */}
      <SettingsSection
        title="Sports to Track"
        description="Only tracked sports appear on your Dashboard."
      >
        <div className="flex flex-wrap gap-2">
          {ALL_SPORTS.map((sport) => {
            const active = settings.trackedSports.includes(sport.key);
            return (
              <button
                key={sport.key}
                onClick={() => toggleSport(sport.key)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800/70 text-gray-500 hover:text-gray-300 border border-gray-700/40'
                }`}
              >
                {sport.label}
              </button>
            );
          })}
        </div>
      </SettingsSection>

      {/* 5. Display Preferences */}
      <SettingsSection
        title="Display Preferences"
        description="Choose how odds are displayed throughout the app."
      >
        <div className="flex flex-col sm:flex-row gap-2">
          {ODDS_FORMATS.map((fmt) => {
            const active = settings.oddsFormat === fmt.key;
            return (
              <button
                key={fmt.key}
                onClick={() => updateSettings({ oddsFormat: fmt.key })}
                className={`flex-1 px-3 py-2.5 rounded-lg text-center transition-colors border ${
                  active
                    ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-300'
                    : 'bg-gray-800/70 border-gray-700/40 text-gray-400 hover:border-gray-600/60'
                }`}
              >
                <span className="text-sm font-medium block">{fmt.label}</span>
                <span className="text-xs text-gray-500 font-mono">{fmt.example}</span>
              </button>
            );
          })}
        </div>
      </SettingsSection>

      {/* Reset */}
      <div className="pt-2 pb-8">
        <button
          onClick={() => {
            resetSettings();
            addToast('Settings reset to defaults', 'info');
          }}
          className="px-4 py-2 text-sm text-gray-400 border border-gray-700/40 rounded-lg hover:text-red-400 hover:border-red-500/40 transition-colors"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
