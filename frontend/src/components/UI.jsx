export function Spinner() {
  return (
    <div className="loading-center">
      <div className="spinner" />
      <span>Loading…</span>
    </div>
  );
}

export function EmptyState({ icon = '📭', title, message }) {
  return (
    <div className="empty-state">
      <div className="icon">{icon}</div>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function FormField({ label, children }) {
  return (
    <div className="form-field">
      {label && <label>{label}</label>}
      {children}
    </div>
  );
}
