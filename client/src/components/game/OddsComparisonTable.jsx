import { americanToDecimal, formatOddsDisplay } from '../../utils/odds';
import { useSettings } from '../../hooks/useSettings';

function isBest(price, allPrices) {
  if (price == null || allPrices.length === 0) return false;
  const decimals = allPrices.filter((p) => p != null).map(americanToDecimal);
  const best = Math.max(...decimals);
  return americanToDecimal(price) >= best;
}

function OddsCell({ price, allPrices, oddsFormat }) {
  const best = isBest(price, allPrices);
  return (
    <td
      className={`px-3 py-2.5 text-center text-sm font-mono ${
        best ? 'text-emerald-400 font-semibold' : 'text-gray-300'
      }`}
    >
      {formatOddsDisplay(price, oddsFormat)}
    </td>
  );
}

function PointCell({ point, price, allPrices, oddsFormat }) {
  const best = isBest(price, allPrices);
  return (
    <td className="px-3 py-2.5 text-center text-sm">
      {point != null && (
        <span className="text-gray-400 mr-1">
          {point > 0 ? '+' : ''}
          {point}
        </span>
      )}
      <span className={`font-mono ${best ? 'text-emerald-400 font-semibold' : 'text-gray-400'}`}>
        ({formatOddsDisplay(price, oddsFormat)})
      </span>
    </td>
  );
}

export default function OddsComparisonTable({ odds, homeName, awayName }) {
  const { settings } = useSettings();

  if (!odds?.bookmakers?.length) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No odds data available
      </div>
    );
  }

  const { bookmakers } = odds;

  // Collect all prices per market for best-odds highlighting
  const allHomeML = bookmakers.map((bm) => bm.markets.h2h?.find((o) => o.name === homeName)?.price).filter(Boolean);
  const allAwayML = bookmakers.map((bm) => bm.markets.h2h?.find((o) => o.name === awayName)?.price).filter(Boolean);
  const allHomeSpread = bookmakers.map((bm) => bm.markets.spreads?.find((o) => o.name === homeName)?.price).filter(Boolean);
  const allAwaySpread = bookmakers.map((bm) => bm.markets.spreads?.find((o) => o.name === awayName)?.price).filter(Boolean);
  const allOver = bookmakers.map((bm) => bm.markets.totals?.find((o) => o.name === 'Over')?.price).filter(Boolean);
  const allUnder = bookmakers.map((bm) => bm.markets.totals?.find((o) => o.name === 'Under')?.price).filter(Boolean);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700/50">
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Book
            </th>
            <th colSpan="2" className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Moneyline
            </th>
            <th colSpan="2" className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Spread
            </th>
            <th colSpan="2" className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total
            </th>
          </tr>
          <tr className="border-b border-gray-800/50">
            <th />
            <th className="px-3 py-1 text-center text-[10px] text-gray-600">{awayName?.split(' ').pop()}</th>
            <th className="px-3 py-1 text-center text-[10px] text-gray-600">{homeName?.split(' ').pop()}</th>
            <th className="px-3 py-1 text-center text-[10px] text-gray-600">{awayName?.split(' ').pop()}</th>
            <th className="px-3 py-1 text-center text-[10px] text-gray-600">{homeName?.split(' ').pop()}</th>
            <th className="px-3 py-1 text-center text-[10px] text-gray-600">Over</th>
            <th className="px-3 py-1 text-center text-[10px] text-gray-600">Under</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/30">
          {bookmakers.map((bm) => {
            const awayML = bm.markets.h2h?.find((o) => o.name === awayName);
            const homeML = bm.markets.h2h?.find((o) => o.name === homeName);
            const awaySpr = bm.markets.spreads?.find((o) => o.name === awayName);
            const homeSpr = bm.markets.spreads?.find((o) => o.name === homeName);
            const over = bm.markets.totals?.find((o) => o.name === 'Over');
            const under = bm.markets.totals?.find((o) => o.name === 'Under');
            const isPreferred = settings.preferredBooks.includes(bm.key);

            return (
              <tr
                key={bm.key}
                className={`hover:bg-gray-800/30 transition-colors ${
                  isPreferred ? 'bg-indigo-500/5 border-l-2 border-l-indigo-500' : ''
                }`}
              >
                <td className="px-3 py-2.5 text-sm font-medium text-gray-300 whitespace-nowrap">
                  {isPreferred && <span className="text-indigo-400 mr-1">★</span>}
                  {bm.title}
                </td>
                <OddsCell price={awayML?.price} allPrices={allAwayML} oddsFormat={settings.oddsFormat} />
                <OddsCell price={homeML?.price} allPrices={allHomeML} oddsFormat={settings.oddsFormat} />
                <PointCell price={awaySpr?.price} point={awaySpr?.point} allPrices={allAwaySpread} oddsFormat={settings.oddsFormat} />
                <PointCell price={homeSpr?.price} point={homeSpr?.point} allPrices={allHomeSpread} oddsFormat={settings.oddsFormat} />
                <PointCell price={over?.price} point={over?.point} allPrices={allOver} oddsFormat={settings.oddsFormat} />
                <PointCell price={under?.price} point={under?.point} allPrices={allUnder} oddsFormat={settings.oddsFormat} />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
