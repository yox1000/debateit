import Brand from "./Brand.jsx";
import { getLevel } from "../utils/profile.js";

function IconButton({ label, children, className = "", badge = 0, onClick }) {
  return (
    <button className={`icon-button ${className}`} type="button" aria-label={label} onClick={onClick}>
      {children}
      {badge > 0 ? <span className="notification-badge">{badge}</span> : null}
    </button>
  );
}

export default function Header({ user, panel, setPanel, onHome, onLogout, onProfile }) {
  const proposalsBadge = panel.proposals.filter((proposal) => !proposal.acceptedBy?.includes(user.id)).length;

  return (
    <header className="app-header">
      <Brand onHome={onHome} />
      <div className="header-actions">
        <IconButton label="My debates" className="document-button" onClick={() => setPanel(panel.open === "debates" ? "" : "debates")}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 2.75h8.4L19 7.35v13.9H6V2.75Zm2 2v14.5h9V8.4h-3.65V4.75H8Zm7.1 1.4v.5H16l-.9-.5ZM9.25 11h5.5v1.5h-5.5V11Zm0 3.25h5.5v1.5h-5.5v-1.5Zm0-6.5h3v1.5h-3v-1.5Z" />
          </svg>
        </IconButton>
        <IconButton label="Match inbox" className="mail-button" badge={proposalsBadge} onClick={() => setPanel(panel.open === "mail" ? "" : "mail")}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M3 5h18v14H3V5Zm2 3.2V17h14V8.2l-7 5.1-7-5.1Zm1.4-1.2 5.6 4.1L17.6 7H6.4Z" />
          </svg>
        </IconButton>
        <button className="profile-button" type="button" aria-label="Open profile" onClick={() => setPanel(panel.open === "profile" ? "" : "profile")}>
          <span>{(user.name || "D").charAt(0).toUpperCase()}</span>
        </button>
        {panel.open === "profile" ? (
          <div className="profile-menu">
            <div className="profile-menu-head">
              <strong>{user.name}</strong>
              <span>{getLevel(user.xp)} - {user.xp || 0} XP</span>
            </div>
            <button type="button" onClick={onProfile}>Edit profile</button>
            <button type="button" id="profile-menu-logout" onClick={onLogout}>Sign out</button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
