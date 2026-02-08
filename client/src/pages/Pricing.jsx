import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { subscriptionApi } from '../services/api';
import { useToast } from '../components/common/Toast';

const PLANS = [
  {
    key: 'monthly',
    name: 'Monthly',
    price: '$30',
    period: '/month',
    features: [
      '50 AI analyses per day',
      'Claude Opus 4.6 model',
      'Fresh real-time odds',
      'Priority analysis',
    ],
  },
  {
    key: 'semiannual',
    name: '6 Months',
    price: '$170',
    period: '/6 months',
    savings: 'Save $10',
    popular: true,
    features: [
      '50 AI analyses per day',
      'Claude Opus 4.6 model',
      'Fresh real-time odds',
      'Priority analysis',
    ],
  },
  {
    key: 'annual',
    name: 'Annual',
    price: '$300',
    period: '/year',
    savings: 'Save $60',
    features: [
      '50 AI analyses per day',
      'Claude Opus 4.6 model',
      'Fresh real-time odds',
      'Priority analysis',
    ],
  },
];

export default function Pricing() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState(null);

  const handleSubscribe = async (plan) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/pricing' } });
      return;
    }

    setLoadingPlan(plan);
    try {
      const data = await subscriptionApi.checkout(plan);
      window.location.href = data.url;
    } catch (err) {
      addToast(err.message || 'Failed to start checkout', 'error');
      setLoadingPlan(null);
    }
  };

  const isSubscriber = user?.tier === 'subscriber' || user?.tier === 'admin';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold text-white mb-2">Upgrade to BetBrain Pro</h1>
        <p className="text-gray-500 text-sm">
          Unlock the full power of AI-driven betting analysis
        </p>
      </div>

      {/* Free tier comparison */}
      <div className="bg-gray-800/30 rounded-xl border border-gray-700/30 p-5 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-300">Free Plan</h3>
            <p className="text-xs text-gray-500 mt-1">1 analysis/day with Sonnet 4.5, cached odds only</p>
          </div>
          <span className="text-xs font-medium text-gray-500 bg-gray-800 px-3 py-1 rounded-full">Current</span>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {PLANS.map((plan) => (
          <div
            key={plan.key}
            className={`relative rounded-xl border p-6 ${
              plan.popular
                ? 'bg-indigo-600/10 border-indigo-500/40'
                : 'bg-gray-800/50 border-gray-700/40'
            }`}
          >
            {plan.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-indigo-600 text-white px-3 py-1 rounded-full">
                BEST VALUE
              </span>
            )}

            <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-bold text-white">{plan.price}</span>
              <span className="text-sm text-gray-500">{plan.period}</span>
            </div>
            {plan.savings && (
              <span className="text-xs font-medium text-emerald-400">{plan.savings}</span>
            )}

            <ul className="mt-5 space-y-2.5 mb-6">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-gray-300">
                  <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe(plan.key)}
              disabled={isSubscriber || loadingPlan === plan.key}
              className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isSubscriber
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : plan.popular
                    ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
              }`}
            >
              {loadingPlan === plan.key ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Loading...
                </span>
              ) : isSubscriber ? (
                'Already subscribed'
              ) : (
                'Subscribe'
              )}
            </button>
          </div>
        ))}
      </div>

      <p className="text-center text-[11px] text-gray-600 mt-6">
        Payments processed securely by Stripe. Cancel anytime from Settings.
      </p>
    </div>
  );
}
