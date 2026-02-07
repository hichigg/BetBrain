import { useParams } from 'react-router-dom';

function GameDetail() {
  const { sport, gameId } = useParams();

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-4">Game Detail</h1>
      <p className="text-gray-400">
        Detailed breakdown for{' '}
        <span className="text-indigo-400">{sport?.toUpperCase()}</span> game{' '}
        <span className="text-indigo-400">{gameId}</span> — stats, odds,
        injuries, and AI recommendations.
      </p>
    </div>
  );
}

export default GameDetail;
