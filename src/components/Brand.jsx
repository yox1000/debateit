export default function Brand({ onHome }) {
  return (
    <button className="brand-mark app-brand brand-button" type="button" onClick={onHome} aria-label="Debate.it home">
      <span className="brand-emblem" aria-hidden="true">
        <svg className="gavel-icon" viewBox="0 0 32 32" focusable="false">
          <path d="M13.3 4.7 18 9.4l-2.2 2.2 2.8 2.8 2.2-2.2 4.7 4.7-5.2 5.2-4.7-4.7 2.1-2.1-2.8-2.8-2.1 2.1-4.7-4.7 5.2-5.2Z" />
          <path d="m5.7 24.2 8.1-8.1 2.1 2.1-8.1 8.1H5.7v-2.1Z" />
          <path d="M13.3 24.7h13.5v2.8H13.3z" />
        </svg>
      </span>
      <span>Debate.it</span>
    </button>
  );
}
