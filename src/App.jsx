import { useEffect, useMemo, useRef, useState } from "react";

const topicChoices = ["Technology", "Politics", "Ethics", "Science", "Culture", "Business", "History", "Sports"];
const mockOpenDebateRooms = [
  {
    topic: "Should facial recognition be banned in public spaces?",
    category: "Technology",
    visibility: "Public",
    format: "1v1",
    sideSize: "1",
    pace: "Timed rounds",
    evidence: "Evidence encouraged",
    need: "Oppose",
    host: "Civil Liberties Forum",
  },
  {
    topic: "Should college athletes be paid?",
    category: "Sports",
    visibility: "Public",
    format: "2v2",
    sideSize: "2",
    pace: "Rapid fire",
    evidence: "Casual",
    need: "Affirm",
    host: "Saturday Sports Table",
  },
  {
    topic: "Should AI-generated content be labeled everywhere?",
    category: "Technology",
    visibility: "Public",
    format: "Panel",
    sideSize: "3",
    pace: "Slow evidence review",
    evidence: "Source required",
    need: "Oppose",
    host: "Creator Policy Room",
  },
  {
    topic: "Should schools ban smartphones during class?",
    category: "Education",
    visibility: "Public",
    format: "1v1",
    sideSize: "1",
    pace: "Timed rounds",
    evidence: "Evidence encouraged",
    need: "Affirm",
    host: "Education Lab",
  },
];

const featuredDebates = [
  {
    category: "Politics",
    label: "Politics - Public",
    title: "Housing advocate vs city council candidate",
    text: "Live written debate on rent caps, zoning, and neighborhood growth.",
  },
  {
    category: "Sports",
    label: "Sports - Public",
    title: "Former striker vs data analyst",
    text: "Whether expected-goals models are changing how fans judge players.",
  },
  {
    category: "Culture",
    label: "Culture - Public",
    title: "Film critic vs creator economy founder",
    text: "A timed debate on whether short-form video is weakening cinema.",
  },
];

const iconPaths = {
  politics: ["M4 9h16v2H4V9Zm2 3h2v6h2v-6h2v6h2v-6h2v6h2v2H4v-2h2v-6Zm6-9 8 4H4l8-4Z"],
  culture: [
    "M5 7.5c2 0 3.4.5 4.6 1.5 1.2-1 2.6-1.5 4.6-1.5 1 0 1.9.2 2.8.5v3.1c0 3-2.2 5.5-5.1 6.5l-2.3.8-2.3-.8C4.4 16.6 2.2 14.1 2.2 11.1V8c.9-.3 1.8-.5 2.8-.5Zm0 2c-.3 0-.6 0-.8.1v1.5c0 2 1.5 3.8 3.7 4.5l.7.2V11C7.7 10 6.6 9.5 5 9.5Zm9.2 0c-1.6 0-2.7.5-3.6 1.5v4.8l.7-.2c2.2-.7 3.7-2.5 3.7-4.5V9.6c-.2-.1-.5-.1-.8-.1Z",
    "M17.7 3.1 20.9 6l-1.4 1.5-1.7-1.6-5.7 6.3-1.5-1.3 5.7-6.4-1.1-1 1.3-1.5 1.2 1.1Z",
  ],
  sports: ["M7 4h10v2h3v3c0 2.4-1.7 4.4-4 4.9A5.1 5.1 0 0 1 13 16v2h3v2H8v-2h3v-2a5.1 5.1 0 0 1-3-2.1C5.7 13.4 4 11.4 4 9V6h3V4Zm2 2v4.5a3 3 0 0 0 6 0V6H9Zm-3 2v1c0 1 .5 1.9 1.3 2.4A5 5 0 0 1 7 10.5V8H6Zm11 0v2.5c0 .3 0 .6-.1.9A3 3 0 0 0 18 9V8h-1Z"],
  technology: ["M8 3h8v3h3v12h-3v3H8v-3H5V6h3V3Zm2 2v1h4V5h-4Zm-3 3v8h10V8H7Zm3 11h4v-1h-4v1Zm-1-8h6v2H9v-2Z"],
  science: ["M9 3h6v2h-1v4.2l4.7 7.9A2.5 2.5 0 0 1 16.5 21h-9a2.5 2.5 0 0 1-2.2-3.9L10 9.2V5H9V3Zm3 7-2.3 3.8h4.6L12 10Zm-3.9 6-1.1 1.9a.5.5 0 0 0 .5.8h9a.5.5 0 0 0 .5-.8L15.9 16H8.1Z"],
  history: ["M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm0 2a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm1 2v4.6l3.1 1.8-1 1.7-4.1-2.4V7h2Z"],
  business: ["M9 4h6l1 2h4v13H4V6h4l1-2Zm1.2 2-.4.8h4.4l-.4-.8h-3.6ZM6 8v3h12V8H6Zm0 5v4h12v-4h-5v1h-2v-1H6Z"],
  ethics: ["M11 4h2v3h5v2h-2.1l2.4 5.2A3.5 3.5 0 0 1 12 16a3.5 3.5 0 0 1-6.3-1.8L8.1 9H6V7h5V4Zm-3 8.8h3.8L9.9 8.7 8 12.8Zm8 0-1.9-4.1-1.9 4.1H16ZM11 17h2v2h4v2H7v-2h4v-2Z"],
  education: ["M12 4 3 8l9 4 7-3.1V14h2V8L12 4Zm-5 7.2V15c0 1.8 2.2 3.3 5 3.3s5-1.5 5-3.3v-3.8l-5 2.2-5-2.2Zm2 1.1 3 1.3 3-1.3V15c0 .5-1.1 1.3-3 1.3S9 15.5 9 15v-2.7Z"],
  general: ["M4 5h16v14H4V5Zm2 2v10h12V7H6Zm2 2h8v2H8V9Zm0 4h5v2H8v-2Z"],
};

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

function normalizeCategory(category = "General") {
  const lower = String(category).toLowerCase();
  return Object.keys(iconPaths).find((key) => lower.includes(key)) || "general";
}

function CategoryIcon({ category }) {
  const key = normalizeCategory(category);

  return (
    <span className="category-icon" data-category={key} aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        {iconPaths[key].map((path) => <path key={path} d={path} />)}
      </svg>
    </span>
  );
}

function Brand({ onHome }) {
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

function IconButton({ label, children, className = "", badge = 0, onClick }) {
  return (
    <button className={`icon-button ${className}`} type="button" aria-label={label} onClick={onClick}>
      {children}
      {badge > 0 ? <span className="notification-badge">{badge}</span> : null}
    </button>
  );
}

function Header({ user, panel, setPanel, onHome, onLogout, onProfile }) {
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
        <IconButton label="Match inbox" badge={proposalsBadge} onClick={() => setPanel(panel.open === "mail" ? "" : "mail")}>
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

function getLevel(xp = 0) {
  if (xp >= 250) return "Arena Veteran";
  if (xp >= 100) return "Policy Builder";
  if (xp >= 50) return "Calm Rebutter";
  return "Newcomer";
}

function getCountries() {
  const display = typeof Intl !== "undefined" && Intl.DisplayNames ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
  const codes = [
    "AF", "AL", "DZ", "AD", "AO", "AG", "AR", "AM", "AU", "AT", "AZ", "BS", "BH", "BD", "BB", "BY", "BE", "BZ", "BJ", "BT",
    "BO", "BA", "BW", "BR", "BN", "BG", "BF", "BI", "CV", "KH", "CM", "CA", "CF", "TD", "CL", "CN", "CO", "KM", "CG", "CD",
    "CR", "CI", "HR", "CU", "CY", "CZ", "DK", "DJ", "DM", "DO", "EC", "EG", "SV", "GQ", "ER", "EE", "SZ", "ET", "FJ", "FI",
    "FR", "GA", "GM", "GE", "DE", "GH", "GR", "GD", "GT", "GN", "GW", "GY", "HT", "HN", "HU", "IS", "IN", "ID", "IR", "IQ",
    "IE", "IL", "IT", "JM", "JP", "JO", "KZ", "KE", "KI", "KP", "KR", "KW", "KG", "LA", "LV", "LB", "LS", "LR", "LY", "LI",
    "LT", "LU", "MG", "MW", "MY", "MV", "ML", "MT", "MH", "MR", "MU", "MX", "FM", "MD", "MC", "MN", "ME", "MA", "MZ",
    "MM", "NA", "NR", "NP", "NL", "NZ", "NI", "NE", "NG", "MK", "NO", "OM", "PK", "PW", "PA", "PG", "PY", "PE", "PH",
    "PL", "PT", "QA", "RO", "RU", "RW", "KN", "LC", "VC", "WS", "SM", "ST", "SA", "SN", "RS", "SC", "SL", "SG", "SK",
    "SI", "SB", "SO", "ZA", "SS", "ES", "LK", "SD", "SR", "SE", "CH", "SY", "TJ", "TZ", "TH", "TL", "TG", "TO", "TT",
    "TN", "TR", "TM", "TV", "UG", "UA", "AE", "GB", "US", "UY", "UZ", "VU", "VA", "VE", "VN", "YE", "ZM", "ZW",
  ];

  return codes
    .map((code) => ({
      code,
      name: display?.of(code) || code,
      flag: code.replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0))),
    }))
    .filter((country) => country.name && country.name !== country.code)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function AuthView({ onUser }) {
  const [mode, setMode] = useState("login");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setMessage("");

    try {
      const payload = {
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
      };
      const { user } = await apiRequest(mode === "login" ? "/api/auth/login" : "/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      onUser(user);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function testLogin(email, password) {
    setLoading(true);
    setMessage("");
    try {
      const { user } = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onUser(user);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-label="Authentication">
        <Brand onHome={() => {}} />
        <div className="mode-toggle" role="tablist" aria-label="Authentication mode">
          {["login", "signup"].map((item) => (
            <button key={item} className={`mode-button ${mode === item ? "active" : ""}`} type="button" onClick={() => setMode(item)}>
              {item === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>
        <div className="form-heading">
          <p className="eyebrow">{mode === "login" ? "Welcome back" : "Create account"}</p>
          <h1>{mode === "login" ? "Log in to Debate.it" : "Join Debate.it"}</h1>
        </div>
        <form className="auth-form" onSubmit={submit}>
          {mode === "signup" ? (
            <label className="field">
              <span>Name</span>
              <input name="name" autoComplete="name" placeholder="Jordan Lee" />
            </label>
          ) : null}
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" autoComplete="email" placeholder="you@example.com" />
          </label>
          <label className="field">
            <span>Password</span>
            <input name="password" type="password" autoComplete="current-password" placeholder="Enter your password" />
          </label>
          <button className="primary-button" type="submit" disabled={loading}>{loading ? "Working..." : mode === "login" ? "Log in" : "Sign up"}</button>
          <p className="form-message" role="status">{message}</p>
        </form>
        <div className="divider"><span>test accounts</span></div>
        <div className="test-grid">
          <button className="secondary-button" type="button" onClick={() => testLogin("", "")}>Empty</button>
          <button className="secondary-button" type="button" onClick={() => testLogin("alex@debate.it", "test")}>Alex</button>
          <button className="secondary-button" type="button" onClick={() => testLogin("sam@debate.it", "test")}>Sam</button>
        </div>
      </section>
    </main>
  );
}

function SurveyView({ user, onUser }) {
  const [selected, setSelected] = useState(user.interests || []);
  const [bio, setBio] = useState(user.debateBio || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function save(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { profile } = await apiRequest("/api/profile", {
        method: "POST",
        body: JSON.stringify({
          selectedTopics: selected,
          debateBio: bio,
          profileSignals: {
            skillLevel: "Casual",
            preferredPace: "Standard",
            evidencePreference: "Balanced",
            civilityPreference: "Strict civility",
          },
        }),
      });
      const { user: updatedUser } = await apiRequest(`/api/users/${encodeURIComponent(user.id)}/profile`, {
        method: "PUT",
        body: JSON.stringify({
          interests: selected,
          debateBio: bio,
          debateProfile: profile,
          surveyCompleted: true,
        }),
      });
      onUser(updatedUser);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="survey-shell">
      <section className="survey-panel">
        <Brand onHome={() => {}} />
        <div className="form-heading">
          <p className="eyebrow">First debate profile</p>
          <h1>What do you want to argue about?</h1>
        </div>
        <form className="survey-form" onSubmit={save}>
          <div className="topic-grid">
            {topicChoices.map((topic) => (
              <label key={topic} className={`topic-choice ${selected.includes(topic) ? "selected" : ""}`}>
                <input
                  type="checkbox"
                  checked={selected.includes(topic)}
                  onChange={(event) => {
                    setSelected((current) => event.target.checked ? [...current, topic] : current.filter((item) => item !== topic));
                  }}
                />
                <span>{topic}</span>
              </label>
            ))}
          </div>
          <label className="field">
            <span>What makes a debate interesting to you?</span>
            <textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={6} placeholder="Write a paragraph or two..." />
          </label>
          <button className="primary-button" type="submit" disabled={loading}>{loading ? "Generating profile..." : "Save profile"}</button>
          <p className="form-message">{message}</p>
        </form>
      </section>
    </main>
  );
}

function scoreOpenRoom(room, config) {
  const topic = config.topic.toLowerCase();
  let score = 0;

  if (!topic || room.topic.toLowerCase().includes(topic) || topic.split(/\s+/).some((term) => term.length > 3 && room.topic.toLowerCase().includes(term))) score += 35;
  if (room.visibility === config.visibility) score += 15;
  if (room.format === config.format) score += 20;
  if (room.sideSize === config.sideSize) score += 10;
  if (room.pace === config.pace) score += 10;
  if (room.evidence === config.evidence) score += 10;
  return score;
}

function CreateDebateModal({ initialTopic, topics, onClose, onSelectTopic }) {
  const [config, setConfig] = useState({
    topic: initialTopic || "",
    visibility: "Public",
    format: "1v1",
    sideSize: "1",
    pace: "Timed rounds",
    evidence: "Evidence encouraged",
  });
  const matches = useMemo(() => mockOpenDebateRooms
    .map((room) => ({ ...room, score: scoreOpenRoom(room, config) }))
    .filter((room) => room.score >= 35)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3), [config]);

  function update(name, value) {
    setConfig((current) => ({ ...current, [name]: value }));
  }

  function createRoom() {
    const topic = topics.find((item) => item.title.toLowerCase() === config.topic.toLowerCase()) || {
      id: `custom-${config.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      title: config.topic || "Open debate topic",
      category: "General",
      tags: [],
    };
    onSelectTopic(topic, `${config.visibility} ${config.format}. ${config.sideSize} per side. ${config.pace}. ${config.evidence}. Choose a side to continue.`);
  }

  return (
    <section className="create-debate-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="create-debate-modal" role="dialog" aria-modal="true">
        <header className="create-modal-head">
          <div>
            <p className="eyebrow">Create debate</p>
            <h2>Set the room</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close create debate">x</button>
        </header>
        <div className="create-modal-grid">
          <label className="field"><span>Topic</span><input value={config.topic} onChange={(event) => update("topic", event.target.value)} placeholder="Facial recognition, college sports, AI art..." /></label>
          <label className="field"><span>Visibility</span><select value={config.visibility} onChange={(event) => update("visibility", event.target.value)}><option>Public</option><option>Private</option></select></label>
          <label className="field"><span>Format</span><select value={config.format} onChange={(event) => update("format", event.target.value)}><option>1v1</option><option>2v2</option><option>Panel</option><option>Free-for-all</option></select></label>
          <label className="field"><span>People per side</span><select value={config.sideSize} onChange={(event) => update("sideSize", event.target.value)}><option>1</option><option>2</option><option>3</option></select></label>
          <label className="field"><span>Pace</span><select value={config.pace} onChange={(event) => update("pace", event.target.value)}><option>Timed rounds</option><option>Slow evidence review</option><option>Rapid fire</option></select></label>
          <label className="field"><span>Evidence rule</span><select value={config.evidence} onChange={(event) => update("evidence", event.target.value)}><option>Evidence encouraged</option><option>Source required</option><option>Casual</option></select></label>
        </div>
        <section className="create-match-preview">
          <div className="matches-head">
            <div><p className="eyebrow">Possible matches</p><h3>Open rooms like this</h3></div>
            <span className="source-badge">{matches.length ? `${matches.length} found` : "No match"}</span>
          </div>
          <div className="create-match-list">
            {matches.length ? matches.map((room) => (
              <button key={room.topic} className="create-match-card" type="button" onClick={() => onSelectTopic(topics.find((topic) => topic.title === room.topic) || { title: room.topic, category: room.category, id: room.topic })}>
                <CategoryIcon category={room.category} />
                <span>{room.score}% match - Needs {room.need}</span>
                <strong>{room.topic}</strong>
                <small>{room.host} - {room.format} - {room.visibility} - {room.evidence}</small>
              </button>
            )) : <p className="profile-summary">No open rooms match this setup yet. Create a new room and wait for opponents.</p>}
          </div>
        </section>
        <footer className="create-modal-actions">
          <button className="secondary-button compact-button" type="button" onClick={onClose}>Cancel</button>
          <button className="primary-button compact-button" type="button" onClick={createRoom}>Create new room</button>
        </footer>
      </div>
    </section>
  );
}

function HomeView({ user, topics, matches, matchSource, debates, onTopic, onOpenDebate, onCreate }) {
  const [query, setQuery] = useState("");
  const suggestions = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return topics.filter((topic) => {
      const text = [topic.title, topic.category, ...(topic.tags || [])].join(" ").toLowerCase();
      return terms.every((term) => text.includes(term));
    }).slice(0, 6);
  }, [query, topics]);
  const currentDebates = debates.filter((debate) => ["active", "pending"].includes(debate.status)).slice(0, 4);

  return (
    <section className="home-panel" aria-label="Debate.it home">
      {currentDebates.length ? (
        <section className="continue-panel">
          <div className="matches-head"><div><p className="eyebrow">Continue</p><h2>Current debates</h2></div></div>
          <div className="continue-list">
            {currentDebates.map((debate) => (
              <button key={debate.id} className="continue-card" type="button" onClick={() => debate.status === "active" && onOpenDebate(debate.id)}>
                <span>{debate.status}</span>
                <strong>{debate.topicTitle}</strong>
                <span>{debate.detail}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
      <section className="topic-search-panel">
        <div className="matches-head">
          <div><h2>Discover debates</h2></div>
          <button className="secondary-button compact-button" type="button" onClick={() => onCreate(query)}>Create debate</button>
        </div>
        <label className="field search-field">
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search AI, schools, climate, sports, history..." />
          {suggestions.length ? (
            <div className="search-suggestions">
              {suggestions.map((topic) => (
                <button key={topic.id} className="suggestion-row" type="button" onClick={() => onTopic(topic, "Choose a side to start a debate on this topic.")}>
                  <CategoryIcon category={topic.category} />
                  <span className="suggestion-text"><span className="suggestion-title">{topic.title}</span><span className="suggestion-meta">{topic.category}</span></span>
                </button>
              ))}
            </div>
          ) : null}
        </label>
      </section>
      <section className="featured-panel">
        <div className="matches-head"><div><p className="eyebrow">Featured public debates</p><h2>Read the room</h2></div></div>
        <div className="featured-grid">
          {featuredDebates.map((debate) => (
            <article key={debate.title} className="featured-card" data-category={debate.category}>
              <CategoryIcon category={debate.category} />
              <span>{debate.label}</span>
              <h3>{debate.title}</h3>
              <p>{debate.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="open-seats-panel">
        <div className="matches-head"><div><p className="eyebrow">Open seats</p><h2>Waiting for opponents</h2></div></div>
        <div className="open-seat-grid">
          {mockOpenDebateRooms.slice(0, 3).map((room) => (
            <button key={room.topic} className="open-seat-card" type="button" onClick={() => onTopic(topics.find((topic) => topic.title === room.topic) || { id: room.topic, title: room.topic, category: room.category, tags: [] })}>
              <CategoryIcon category={room.category} />
              <span>Needs {room.need} - {room.format}</span>
              <strong>{room.topic}</strong>
              <small>{room.visibility} - {room.pace} - {room.evidence}</small>
            </button>
          ))}
        </div>
      </section>
      <section className="matches-panel">
        <div className="matches-head"><div><p className="eyebrow">Recommended</p><h2>For your style</h2></div><span className="source-badge">{matchSource}</span></div>
        <div className="match-grid">
          {matches.length ? matches.slice(0, 5).map((match) => (
            <article key={match.topicId || match.title} className="match-card" onClick={() => onTopic(topics.find((topic) => topic.id === match.topicId) || { id: match.topicId, title: match.title, category: match.category, tags: [] }, match.stancePrompt)}>
              <CategoryIcon category={match.category} />
              <div className="match-meta"><span className="match-category">{match.category}</span><span className="match-score">{match.score || 0}% match</span></div>
              <h3>{match.title}</h3>
              <p>{match.reason}</p>
            </article>
          )) : <p className="profile-summary">No topic matches yet. Complete the survey to generate recommendations.</p>}
        </div>
      </section>
    </section>
  );
}

function PanelOverlay({ panel, user, debates, proposals, onClose, onAccept, onReject, onOpenDebate }) {
  const [filters, setFilters] = useState(new Set());

  if (!panel.open || panel.open === "profile") return null;

  const visibleDebates = filters.size ? debates.filter((debate) => filters.has(debate.status)) : debates;

  return (
    <aside className="notification-center">
      <section className="notification-panel">
        <div className="notification-head">
          <strong>{panel.open === "mail" ? "Match inbox" : "My debates"}</strong>
          <button type="button" onClick={onClose}>Close</button>
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
                    <button className="secondary-button compact-button" type="button">Ignore</button>
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

function TopicView({ topic, prompt, user, onBack, onOpenDebate, onRefreshState }) {
  const [stance, setStance] = useState("");
  const [status, setStatus] = useState("Pick a side before entering the matchmaking queue.");
  const [requestId, setRequestId] = useState("");

  async function findOpponent() {
    if (!stance) return;
    setStatus("Finding opponent. This can take time; the inbox will notify both sides when a match is found.");

    try {
      const result = await apiRequest("/api/match-requests", {
        method: "POST",
        body: JSON.stringify({
          topicId: topic.id,
          topicTitle: topic.title,
          topicCategory: topic.category,
          topicTags: topic.tags || [],
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          stance,
        }),
      });
      setRequestId(result.request?.id || "");
      setStatus(result.status === "proposal" ? "Potential match found. Check the mail icon to accept." : "Finding opponent. Your request is open.");
      await onRefreshState();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function cancel() {
    if (!requestId) return;
    await apiRequest(`/api/match-requests/${encodeURIComponent(requestId)}/cancel`, { method: "POST", body: "{}" });
    setRequestId("");
    setStatus("Matchmaking cancelled. You can start a new search.");
    await onRefreshState();
  }

  return (
    <main className="debate-shell">
      <section className="debate-panel">
        <button className="secondary-button compact-button" type="button" onClick={onBack}>Home</button>
        <p className="eyebrow">{topic.category || "Topic"}</p>
        <h1>{topic.title}</h1>
        <p className="profile-summary">{prompt || "Choose a side and set the debate rules before entering matchmaking."}</p>
        <div className="stance-grid">
          {["Affirm", "Oppose"].map((item) => (
            <button key={item} className={`stance-card ${stance === item ? "selected" : ""}`} type="button" onClick={() => setStance(item)}>
              <strong>{item}</strong>
              <span>{item === "Affirm" ? "Argue for the resolution." : "Argue against the resolution."}</span>
            </button>
          ))}
        </div>
        <button className="primary-button" type="button" disabled={!stance} onClick={findOpponent}>Find opponent</button>
        {requestId ? <button className="secondary-button compact-button" type="button" onClick={cancel}>Cancel queue</button> : null}
        <p className="form-message">{status}</p>
      </section>
    </main>
  );
}

function DebateRoom({ debateId, user, onHome }) {
  const [state, setState] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [factCheck, setFactCheck] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const endRef = useRef(null);

  async function loadRoom() {
    const [{ debateState }, messageData] = await Promise.all([
      apiRequest(`/api/debates/${encodeURIComponent(debateId)}/state`),
      apiRequest(`/api/debates/${encodeURIComponent(debateId)}/messages`),
    ]);
    setState(debateState);
    setMessages(messageData.messages || []);
  }

  useEffect(() => {
    loadRoom().catch(() => {});
  }, [debateId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function sendMessage() {
    const clean = text.trim();
    if (!clean) return;
    setText("");
    const data = await apiRequest(`/api/debates/${encodeURIComponent(debateId)}/messages`, {
      method: "POST",
      body: JSON.stringify({ text: clean }),
    });
    setMessages(data.messages || []);
    setState(data.debateState);
  }

  async function refreshCopilot() {
    setLoadingAi(true);
    try {
      const { analysis: next } = await apiRequest(`/api/debates/${encodeURIComponent(debateId)}/copilot`, { method: "POST", body: "{}" });
      setAnalysis(next);
    } finally {
      setLoadingAi(false);
    }
  }

  async function runFactCheck(claim) {
    setLoadingAi(true);
    try {
      const { factCheck: next } = await apiRequest(`/api/debates/${encodeURIComponent(debateId)}/fact-check-claim`, {
        method: "POST",
        body: JSON.stringify({ claim }),
      });
      setFactCheck(next);
    } finally {
      setLoadingAi(false);
    }
  }

  const isTurn = state?.turnUserId === user.id && !state?.isFinished;
  const latestClaim = messages.filter((message) => message.speaker !== "system").at(-1)?.text || "";

  return (
    <main className="room-shell">
      <section className="room-panel">
        <button className="secondary-button compact-button" type="button" onClick={onHome}>Home</button>
        <p className="eyebrow">Active debate</p>
        <h1>{state?.topicTitle || "Debate"}</h1>
        <p className="profile-summary">{state?.status === "closed" || state?.isFinished ? "Debate finished" : `${state?.phaseLabel || "Opening"}: ${state?.turnUserName || "Debater"} is up.`}</p>
        <div className="debate-room-grid">
          <section className="chat-stack">
            <div className="chat-thread">
              {messages.map((message) => {
                const mine = message.userId === user.id;
                return (
                  <article key={message.id} className={`chat-message ${message.speaker === "system" ? "system" : mine ? "me" : "opponent"}`}>
                    <div className="message-meta"><strong>{message.speaker === "system" ? "System" : mine ? "You" : message.authorName || "Opponent"}</strong><span>{new Date(message.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span></div>
                    <p>{message.text}</p>
                  </article>
                );
              })}
              <div ref={endRef} />
            </div>
            <div className="chat-composer">
              <span className="turn-status">{isTurn ? "Your turn" : "Waiting for your turn..."}</span>
              <div className="composer-row">
                <span />
                <textarea id="chat-input" value={text} disabled={!isTurn} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage().catch(() => {});
                  }
                }} placeholder={isTurn ? "Write your argument..." : "Waiting for your turn..."} />
                <button className="primary-button send-button" type="button" disabled={!isTurn || !text.trim()} onClick={() => sendMessage().catch(() => {})}>Send</button>
              </div>
              <small className="composer-hint">Enter to send. Shift+Enter for a new line.</small>
            </div>
          </section>
          <aside className="copilot-panel">
            <div className="copilot-head"><div><p className="eyebrow">AI Co-Pilot</p><h2>Debate support</h2></div><span className="source-badge">DeepSeek</span></div>
            <button className="secondary-button compact-button" type="button" disabled={loadingAi} onClick={refreshCopilot}>Refresh recap</button>
            {analysis ? (
              <div className="support-section">
                <h3>Focus</h3>
                <p>{analysis.focus?.priority}</p>
                <h3>Key claims</h3>
                {(analysis.phaseSummary?.keyClaims || []).map((claim) => <p key={claim}>{claim}</p>)}
              </div>
            ) : <p className="profile-summary">Use refresh after a few messages to generate focus notes.</p>}
            <button className="secondary-button compact-button" type="button" disabled={loadingAi || !latestClaim} onClick={() => runFactCheck(latestClaim)}>Fact-check latest claim</button>
            {factCheck ? (
              <div className="trusted-fact-check">
                <h3>{factCheck.presentation?.headline || factCheck.verdict}</h3>
                <p>{factCheck.presentation?.summary || factCheck.interpretation}</p>
                {(factCheck.evidence || []).slice(0, 3).map((source) => (
                  <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.provider}: {source.title}</a>
                ))}
              </div>
            ) : null}
          </aside>
        </div>
      </section>
    </main>
  );
}

function ProfileEdit({ user, onUser, onHome }) {
  const countries = useMemo(() => getCountries(), []);
  const profile = user.debateProfile || {};
  const [message, setMessage] = useState("");

  async function save(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const interests = String(form.get("interests") || "").split(",").map((item) => item.trim()).filter(Boolean);
    const nextProfile = {
      ...profile,
      debateStyle: form.get("debateStyle"),
      skillLevel: form.get("skillLevel"),
      preferredPace: form.get("preferredPace"),
      evidencePreference: form.get("evidencePreference"),
      civilityPreference: form.get("civilityPreference"),
      topics: interests,
    };
    try {
      const { user: updated } = await apiRequest(`/api/users/${encodeURIComponent(user.id)}/profile`, {
        method: "PUT",
        body: JSON.stringify({
          name: form.get("name"),
          country: form.get("country"),
          interests,
          debateBio: form.get("debateBio"),
          debateProfile: nextProfile,
          surveyCompleted: true,
        }),
      });
      setMessage("Profile saved.");
      onUser(updated);
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <main className="profile-shell">
      <section className="profile-page-panel">
        <button className="secondary-button compact-button" type="button" onClick={onHome}>Home</button>
        <div className="profile-head"><div><p className="eyebrow">Profile</p><h1>Edit profile</h1></div></div>
        <form className="profile-edit-grid" onSubmit={save}>
          <label className="field"><span>Name</span><input name="name" defaultValue={user.name || ""} /></label>
          <label className="field"><span>Country</span><select name="country" defaultValue={user.country || ""}><option value="">Select country</option>{countries.map((country) => <option key={country.code} value={country.name}>{country.flag} {country.name}</option>)}</select></label>
          <label className="field"><span>Debate style</span><select name="debateStyle" defaultValue={profile.debateStyle || "Exploratory"}><option>Exploratory</option><option>Policy-focused</option><option>Principle-driven</option><option>Evidence-first</option></select></label>
          <label className="field"><span>Skill level</span><select name="skillLevel" defaultValue={profile.skillLevel || "Casual"}><option>Casual</option><option>Intermediate</option><option>Advanced</option></select></label>
          <label className="field"><span>Pace</span><select name="preferredPace" defaultValue={profile.preferredPace || "Standard"}><option>Slow</option><option>Standard</option><option>Fast</option></select></label>
          <label className="field"><span>Evidence</span><select name="evidencePreference" defaultValue={profile.evidencePreference || "Balanced"}><option>Casual</option><option>Balanced</option><option>Source-heavy</option></select></label>
          <label className="field"><span>Civility</span><select name="civilityPreference" defaultValue={profile.civilityPreference || "Strict civility"}><option>Strict civility</option><option>Normal</option><option>High heat</option></select></label>
          <label className="field"><span>Interests</span><input name="interests" defaultValue={(profile.topics?.length ? profile.topics : user.interests || []).join(", ")} /></label>
          <label className="field wide-field"><span>Bio</span><textarea name="debateBio" rows={5} defaultValue={user.debateBio || ""} /></label>
          <div className="profile-edit-actions"><button className="primary-button" type="submit">Save profile</button><p className="form-message">{message}</p></div>
        </form>
      </section>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("loading");
  const [topics, setTopics] = useState([]);
  const [matches, setMatches] = useState([]);
  const [matchSource, setMatchSource] = useState("Loading");
  const [debates, setDebates] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [panel, setPanelState] = useState({ open: "", proposals: [] });
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [topicPrompt, setTopicPrompt] = useState("");
  const [createTopic, setCreateTopic] = useState(null);
  const [activeDebateId, setActiveDebateId] = useState("");

  const panelData = { ...panel, proposals };

  function setPanel(open) {
    setPanelState({ open, proposals });
  }

  async function refreshState(nextUser = user) {
    if (!nextUser) return;
    const [debateData, proposalData] = await Promise.all([
      apiRequest(`/api/users/${encodeURIComponent(nextUser.id)}/debates`),
      apiRequest(`/api/users/${encodeURIComponent(nextUser.id)}/proposals`),
    ]);
    setDebates(debateData.debates || []);
    setProposals(proposalData.proposals || []);
  }

  async function loadMatches(nextUser) {
    const result = await apiRequest("/api/matches", {
      method: "POST",
      body: JSON.stringify({ debateProfile: nextUser.debateProfile || {}, limit: 5 }),
    });
    setMatches(result.matches || []);
    setMatchSource(result.source || "local");
  }

  async function enterApp(nextUser) {
    setUser(nextUser);
    if (!nextUser.surveyCompleted) {
      setView("survey");
      return;
    }
    setView("home");
    await Promise.all([
      apiRequest("/api/topics").then((data) => setTopics(data.topics || [])),
      refreshState(nextUser),
      loadMatches(nextUser).catch(() => setMatchSource("local")),
    ]);
  }

  useEffect(() => {
    apiRequest("/api/auth/session")
      .then(({ user: sessionUser }) => enterApp(sessionUser))
      .catch(() => setView("auth"));
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

    socket.addEventListener("open", () => socket.send(JSON.stringify({ type: "subscribe" })));
    socket.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (["proposal_found", "proposal_updated", "proposal_rejected", "debate_started", "chat_message", "debate_state"].includes(payload.type)) {
          refreshState().catch(() => {});
        }
      } catch {
        // Ignore malformed realtime messages.
      }
    });

    return () => socket.close();
  }, [user?.id]);

  async function logout() {
    await apiRequest("/api/auth/logout", { method: "POST" });
    setUser(null);
    setView("auth");
  }

  function chooseTopic(topic, prompt = "Choose a side and set the debate rules before entering matchmaking.") {
    setSelectedTopic(topic);
    setTopicPrompt(prompt);
    setCreateTopic(null);
    setView("topic");
  }

  async function acceptProposal(id) {
    const result = await apiRequest(`/api/proposals/${encodeURIComponent(id)}/accept`, { method: "POST", body: "{}" });
    await refreshState();
    if (result.debateId) {
      setActiveDebateId(result.debateId);
      setView("room");
    }
  }

  async function rejectProposal(id) {
    await apiRequest(`/api/proposals/${encodeURIComponent(id)}/reject`, { method: "POST", body: "{}" });
    await refreshState();
  }

  if (view === "loading") {
    return <main className="auth-shell"><section className="auth-panel"><Brand onHome={() => {}} /><p className="profile-summary">Loading Debate.it...</p></section></main>;
  }

  if (view === "auth") {
    return <AuthView onUser={enterApp} />;
  }

  if (view === "survey") {
    return <SurveyView user={user} onUser={enterApp} />;
  }

  if (view === "profile") {
    return <ProfileEdit user={user} onUser={setUser} onHome={() => setView("home")} />;
  }

  if (view === "topic" && selectedTopic) {
    return <TopicView topic={selectedTopic} prompt={topicPrompt} user={user} onBack={() => setView("home")} onOpenDebate={(id) => { setActiveDebateId(id); setView("room"); }} onRefreshState={() => refreshState()} />;
  }

  if (view === "room" && activeDebateId) {
    return <DebateRoom debateId={activeDebateId} user={user} onHome={() => setView("home")} />;
  }

  return (
    <main className="app-shell">
      <Header
        user={user}
        panel={panelData}
        setPanel={setPanel}
        onHome={() => setView("home")}
        onLogout={logout}
        onProfile={() => { setPanel(""); setView("profile"); }}
      />
      <HomeView
        user={user}
        topics={topics}
        matches={matches}
        matchSource={matchSource}
        debates={debates}
        onTopic={chooseTopic}
        onOpenDebate={(id) => { setActiveDebateId(id); setView("room"); }}
        onCreate={(query) => setCreateTopic(query || "")}
      />
      <PanelOverlay
        panel={panelData}
        user={user}
        debates={debates}
        proposals={proposals}
        onClose={() => setPanel("")}
        onAccept={acceptProposal}
        onReject={rejectProposal}
        onOpenDebate={(id) => { setPanel(""); setActiveDebateId(id); setView("room"); }}
      />
      {createTopic !== null ? <CreateDebateModal initialTopic={createTopic} topics={topics} onClose={() => setCreateTopic(null)} onSelectTopic={chooseTopic} /> : null}
    </main>
  );
}
