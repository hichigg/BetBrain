import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-300">
      <header className="flex items-center justify-between px-6 sm:px-10 h-16 border-b border-gray-800/40">
        <Link to="/" className="flex items-center gap-2.5">
          <svg className="w-8 h-8 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span className="text-xl font-bold text-white tracking-tight">BetBrain</span>
          <span className="text-[10px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded-full leading-none">AI</span>
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-8">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: February 8, 2026</p>

        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. Information We Collect</h2>
            <p>When you sign in with your email, we store your email address. We also store your betting analysis history and bet slip data to provide our services.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
              <li>Authenticate your account and manage your session</li>
              <li>Provide AI-powered betting analysis personalized to your tier</li>
              <li>Track your bet slip and performance history</li>
              <li>Process subscription payments through Stripe</li>
              <li>Send important account notifications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. Data Storage & Security</h2>
            <p>Your data is stored securely on our servers. Payment processing is handled entirely by Stripe — we never store your credit card information. We use industry-standard security measures including JWT authentication and HTTPS encryption.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. Third-Party Services</h2>
            <p>We use the following third-party services:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
              <li><strong className="text-gray-300">Resend</strong> — for sending login verification emails</li>
              <li><strong className="text-gray-300">Stripe</strong> — for payment processing</li>
              <li><strong className="text-gray-300">Anthropic (Claude AI)</strong> — for betting analysis</li>
              <li><strong className="text-gray-300">ESPN, Odds-API.io, BallDontLie</strong> — for sports data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Data Sharing</h2>
            <p>We do not sell, trade, or share your personal information with third parties, except as required to provide our services (e.g., sending your email to Stripe for payment processing) or as required by law.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. Data Deletion</h2>
            <p>You can request deletion of your account and associated data by contacting us. Upon account deletion, we will remove your personal information from our systems.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">7. Cookies</h2>
            <p>We use localStorage to store your authentication token for session persistence. We do not use tracking cookies or third-party analytics cookies.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">8. Disclaimer</h2>
            <p>BetBrain is for entertainment and informational purposes only. Sports betting involves risk. We do not guarantee the accuracy of any analysis or recommendation. Always bet responsibly.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">9. Contact</h2>
            <p>For questions about this privacy policy, contact us at <a href="mailto:hichigg@gmail.com" className="text-indigo-400 hover:text-indigo-300">hichigg@gmail.com</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">10. Changes</h2>
            <p>We may update this privacy policy from time to time. Continued use of BetBrain after changes constitutes acceptance of the updated policy.</p>
          </section>
        </div>
      </main>

      <footer className="text-center px-6 py-5 border-t border-gray-800/40">
        <p className="text-[11px] text-gray-600">
          For entertainment purposes only. Sports betting involves risk. Always bet responsibly.
        </p>
      </footer>
    </div>
  );
}
