import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** "Add to Home Screen" prompt card — shows only when the browser fires beforeinstallprompt. */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferred || dismissed) return null;

  return (
    <div className="card install-prompt">
      <div>
        <strong>Install My Daily Codex</strong>
        <p className="muted">Add it to your home screen for the full app experience.</p>
      </div>
      <div className="row">
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            void deferred.prompt();
            setDeferred(null);
          }}
        >
          Install
        </button>
        <button type="button" className="btn ghost" onClick={() => setDismissed(true)}>
          Not now
        </button>
      </div>
    </div>
  );
}
