import { useNavigate } from 'react-router-dom';

/** Persistent floating action button — opens a new Pattern Log entry from anywhere. */
export default function Fab() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="fab"
      aria-label="New log entry"
      title="New log entry"
      onClick={() => navigate('/log/new')}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
      </svg>
    </button>
  );
}
