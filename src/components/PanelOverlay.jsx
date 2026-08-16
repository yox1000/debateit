import { useEffect, useState } from "react";

export default function PanelOverlay({ panel, user, debates, proposals, onClose, onAccept, onReject, onOpenDebate }) {
  const [filters, setFilters] = useState(new Set());

  useEffect(() => {
    if (panel.open === "debates") {
      setFilters(new Set());
    }
  }, [panel.open]);

  if (!panel.open || panel.open === "profile") return null;

  const visibleDebates = filters.size ? debates.filter((debate) => filters.has(debate.status)) : debates;

  return (
    <aside className="notification-center">
      <section className="notification-panel">
        <div className="notification-head">
          <strong>{panel.open === "mail" ? "Match inbox" : "My debates"}</strong>
          <button className="panel-close-button" type="button" onClick={onClose} aria-label="Close panel">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z" />
            </svg>
          </button>
        </div>
        {panel.open === "mail" ? (
          <div className="notification-list">
            {proposals.length ? proposals.map((proposal) => {
              const accepted = proposal.acceptedBy?.includes(user.id);
              const opponent = proposal.users?.find((item) => item.userId !== user.id);
              return (
                <article key={proposal.id} className="potential-match-card">
                  <div className="potential-match-row">
                    <div>
                      <span className="source-badge">{accepted ? "Waiting" : "Potential match"}</span>
                      <h3>{proposal.topicTitle}</h3>
                      <p>{opponent?.profile?.name || "Opponent"} - {opponent?.profile?.level || "Newcomer"} - {opponent?.profile?.country || "Country unset"}</p>
                    </div>
                  </div>
                  <div className="notification-actions">
                    <button className="accept-button" type="button" disabled={accepted} onClick={() => onAccept(proposal.id)}>{accepted ? "Accepted" : "Accept"}</button>
                    <button className="secondary-button compact-button" type="button" onClick={onClose}>Ignore</button>
                    <button className="reject-button" type="button" onClick={() => onReject(proposal.id)}>Deny</button>
                  </div>
                </article>
              );
            }) : <p className="empty-note">No match notifications.</p>}
          </div>
        ) : (
          <div className="notification-list">
            <div className="debate-filter-bar">
              {["active", "pending", "closed"].map((status) => (
                <button key={status} className={`filter-button ${filters.has(status) ? "active" : ""}`} type="button" onClick={() => {
                  setFilters((current) => {
                    const next = new Set(current);
                    next.has(status) ? next.delete(status) : next.add(status);
                    return next.size === 3 ? new Set() : next;
                  });
                }}>{status[0].toUpperCase() + status.slice(1)}</button>
              ))}
              <span>{filters.size ? [...filters].map((status) => status[0].toUpperCase() + status.slice(1)).join(", ") : "All"}</span>
            </div>
            {visibleDebates.length ? visibleDebates.map((debate) => (
              <button key={debate.id} className="debate-record clickable-record" type="button" onClick={() => debate.status === "active" || debate.status === "closed" ? onOpenDebate(debate.id) : null}>
                <h3>{debate.topicTitle}</h3>
                <p>{debate.detail || debate.status}</p>
              </button>
            )) : <p className="empty-note">No debates yet.</p>}
          </div>
        )}
      </section>
    </aside>
  );
}
