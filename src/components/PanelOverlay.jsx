import { useEffect, useState } from "react";

function getFriendLabel(status) {
  if (status === "friends") return "Friends";
  if (status === "outgoing") return "Requested";
  if (status === "incoming") return "";
  return "Add friend";
}

function UserActionCard({ person, user, onSendFriendRequest, onOpenProfile, hideIncomingAction = false }) {
  if (!person || person.userId === user.id || person.id === user.id) {
    return null;
  }

  const userId = person.userId || person.id;
  const stats = person.stats || {};
  const friendStatus = person.friendStatus || "none";
  const disabled = friendStatus !== "none";
  const label = getFriendLabel(friendStatus);

  return (
    <div className="user-action-card">
      <button className="user-link-button" type="button" onClick={() => onOpenProfile(userId)}>
        <span>{(person.name || stats.name || "D").charAt(0).toUpperCase()}</span>
        <strong>{person.name || stats.name || "Opponent"}</strong>
      </button>
      <small>{stats.level || "Newcomer"} - {stats.country || "Country unset"}</small>
      {label && !(hideIncomingAction && friendStatus === "incoming") ? (
        <button className="secondary-button compact-button" type="button" disabled={disabled} onClick={() => onSendFriendRequest(userId)}>
          {label}
        </button>
      ) : null}
    </div>
  );
}

export default function PanelOverlay({
  panel,
  user,
  debates,
  proposals,
  friends,
  friendRequests,
  onClose,
  onAccept,
  onReject,
  onSendFriendRequest,
  onOpenProfile,
  onAcceptFriendRequest,
  onRejectFriendRequest,
  onOpenDebate,
}) {
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
            {friendRequests.length ? (
              <section className="friend-request-list">
                <p className="eyebrow">Friend requests</p>
                {friendRequests.map((request) => {
                  const incoming = request.recipientId === user.id;
                  const other = incoming ? request.requester : request.recipient;

                  return (
                    <article key={request.id} className="potential-match-card">
                      <div className="potential-match-row">
                        <UserActionCard person={{ ...other, userId: other.id, friendStatus: incoming ? "incoming" : "outgoing" }} user={user} onSendFriendRequest={onSendFriendRequest} onOpenProfile={onOpenProfile} hideIncomingAction />
                      </div>
                      <div className="mini-actions">
                        {incoming ? <button className="mini-action accept-action" type="button" onClick={() => onAcceptFriendRequest(request.id)}>Accept</button> : <button className="mini-action ignore-action" type="button" disabled>Sent</button>}
                        <button className="mini-action deny-action" type="button" onClick={() => onRejectFriendRequest(request.id)}>{incoming ? "Reject" : "Cancel"}</button>
                      </div>
                    </article>
                  );
                })}
              </section>
            ) : null}
            {proposals.length ? proposals.map((proposal) => {
              const accepted = proposal.acceptedBy?.includes(user.id);
              const opponent = proposal.users?.find((item) => item.userId !== user.id);
              return (
                <article key={proposal.id} className="potential-match-card">
                  <div className="potential-match-row">
                    <div>
                      <span className="source-badge">{accepted ? "Waiting" : "Potential match"}</span>
                      <h3>{proposal.topicTitle}</h3>
                      <UserActionCard person={opponent} user={user} onSendFriendRequest={onSendFriendRequest} onOpenProfile={onOpenProfile} />
                    </div>
                  </div>
                  <div className="mini-actions">
                    <button className="mini-action accept-action" type="button" disabled={accepted} onClick={() => onAccept(proposal.id)}>{accepted ? "Accepted" : "Accept"}</button>
                    <button className="mini-action ignore-action" type="button" onClick={onClose}>Ignore</button>
                    <button className="mini-action deny-action" type="button" onClick={() => onReject(proposal.id)}>Deny</button>
                  </div>
                </article>
              );
            }) : friendRequests.length ? null : <p className="empty-note">No match notifications.</p>}
            {friends.length ? <p className="empty-note">{friends.length} friend{friends.length === 1 ? "" : "s"} connected.</p> : null}
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
