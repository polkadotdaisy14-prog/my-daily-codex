/** Paywall gate for paid-tier sections. Free tier sees the card; the full
 * explained version ($3.99/mo) unlocks in beta behind a Stripe subscription (v2).
 */
export default function PaywallGate({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <section className="card paywall" aria-label={`${title} (paid)`}>
      <div className="paywall-lock" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      </div>
      <h3>{title}</h3>
      <p>The full explained version — $3.99/mo (coming soon in beta).</p>
      {children}
    </section>
  );
}
