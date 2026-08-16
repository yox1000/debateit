import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../lib/api.js";

const phaseLabels = [
  ["opening", "Opening"],
  ["rebuttal", "Rebuttal"],
  ["cross-question", "Cross-question"],
  ["closing", "Closing"],
];

function splitWithAnnotations(message, annotations, onAnnotationClick) {
  const noteRanges = annotations
    .filter((annotation) => annotation.messageId === message.id)
    .sort((a, b) => a.startOffset - b.startOffset);
  const parts = [];
  let cursor = 0;

  noteRanges.forEach((annotation) => {
    const start = Math.max(0, Math.min(annotation.startOffset, message.text.length));
    const end = Math.max(start, Math.min(annotation.endOffset, message.text.length));

    if (start > cursor) {
      parts.push(message.text.slice(cursor, start));
    }

    parts.push(
      <mark key={annotation.id} className="annotation-highlight" onClick={() => onAnnotationClick(annotation)}>
        {message.text.slice(start, end)}
      </mark>,
    );
    cursor = end;
  });

  if (cursor < message.text.length) {
    parts.push(message.text.slice(cursor));
  }

  return parts.length ? parts : message.text;
}

function extractClaims(messages) {
  return messages
    .filter((message) => message.speaker !== "system" && message.text?.trim())
    .slice(-6)
    .map((message) => ({
      key: message.id,
      speaker: message.authorName || "Debater",
      claim: message.text,
    }));
}

function getFriendLabel(status) {
  if (status === "friends") return "Friends";
  if (status === "outgoing") return "Requested";
  if (status === "incoming") return "Incoming request";
  return "Add friend";
}

function ParticipantStrip({ participants = [], user, onSendFriendRequest, onOpenProfile }) {
  const otherParticipants = participants.filter((participant) => participant.userId !== user.id);

  if (!otherParticipants.length) {
    return null;
  }

  return (
    <div className="participant-strip">
      {otherParticipants.map((participant) => {
        const friendStatus = participant.friendStatus || "none";

        return (
          <article key={participant.userId} className="participant-chip">
            <button className="participant-avatar-button" type="button" onClick={() => onOpenProfile(participant.userId)}>
              {(participant.name || "D").charAt(0).toUpperCase()}
            </button>
            <button className="participant-name-button" type="button" onClick={() => onOpenProfile(participant.userId)}>
              <strong>{participant.name || "Opponent"}</strong>
              <small>{participant.stats?.level || "Newcomer"} - {participant.stats?.country || "Country unset"}</small>
            </button>
            <button className="secondary-button compact-button" type="button" disabled={friendStatus !== "none"} onClick={() => onSendFriendRequest(participant.userId)}>
              {getFriendLabel(friendStatus)}
            </button>
          </article>
        );
      })}
    </div>
  );
}

function CopilotPanel({ analysis, factCheck, annotations, messages, loadingAi, onTabFactCheck, onRefreshCopilot, onRunFactCheck, onOpenResearch, activeTab, setActiveTab }) {
  const claims = extractClaims(messages);
  const latestClaim = claims.at(-1)?.claim || "";

  return (
    <aside className="copilot-panel">
      <div className="copilot-head">
        <div><p className="eyebrow">AI Co-Pilot</p><h2>Debate support</h2></div>
        <span className="source-badge">DeepSeek</span>
      </div>
      <div className="copilot-tabs">
        {["recap", "notes", "facts", "focus"].map((tab) => (
          <button key={tab} className={`copilot-tab ${activeTab === tab ? "active" : ""}`} type="button" onClick={() => setActiveTab(tab)}>
            {tab[0].toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "recap" ? (
        <div className="support-section">
          <button className="secondary-button compact-button" type="button" disabled={loadingAi} onClick={onRefreshCopilot}>Refresh recap</button>
          {analysis ? (
            <>
              <h3>Phase notes</h3>
              <p>{analysis.phaseSummary?.summary}</p>
              <h3>Key claims</h3>
              {(analysis.phaseSummary?.keyClaims || []).map((claim) => <p key={claim}>{claim}</p>)}
            </>
          ) : <p className="profile-summary">Use refresh after a few messages to generate focus notes.</p>}
        </div>
      ) : null}

      {activeTab === "notes" ? (
        <div className="annotation-list">
          {annotations.length ? annotations.map((annotation) => (
            <button key={annotation.id} className="annotation-note" type="button">
              <strong>{annotation.quote}</strong>
              <span>{annotation.note}</span>
            </button>
          )) : <p className="profile-summary">Highlight text in a non-system message to create a note.</p>}
        </div>
      ) : null}

      {activeTab === "facts" ? (
        <div className="fact-list">
          {claims.length ? claims.map((item) => (
            <article key={item.key} className="fact-card">
              <strong>{item.claim}</strong>
              <span>Needs source</span>
              <button className="secondary-button compact-button" type="button" disabled={loadingAi} onClick={() => onRunFactCheck(item.claim)}>Fact-check</button>
            </article>
          )) : <p className="profile-summary">Factual claims will show here after debate messages exist.</p>}
          <button className="secondary-button compact-button" type="button" disabled={loadingAi || !latestClaim} onClick={() => onTabFactCheck(latestClaim)}>Fact-check latest claim</button>
          {factCheck ? (
            <div className="trusted-fact-check">
              <h3>{factCheck.presentation?.headline || factCheck.verdict}</h3>
              <p>{factCheck.presentation?.summary || factCheck.interpretation}</p>
              <button className="secondary-button compact-button" type="button" onClick={onOpenResearch}>Open research page</button>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "focus" ? (
        <div className="support-section">
          {analysis ? (
            <article className="focus-card">
              <strong>{analysis.focus?.priority}</strong>
              <p>{analysis.focus?.nextMove}</p>
              <span>{analysis.focus?.driftWarning}</span>
            </article>
          ) : <p className="profile-summary">Refresh recap to generate focus guidance.</p>}
        </div>
      ) : null}
    </aside>
  );
}

export default function DebateRoom({ debateId, user, onHome, onResearch, onSendFriendRequest, onOpenProfile }) {
  const [state, setState] = useState(null);
  const [messages, setMessages] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [text, setText] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [factCheck, setFactCheck] = useState(null);
  const [activeTab, setActiveTab] = useState("recap");
  const [loadingAi, setLoadingAi] = useState(false);
  const [speechActive, setSpeechActive] = useState(false);
  const endRef = useRef(null);
  const speechRef = useRef(null);

  async function loadRoom() {
    const [{ debateState }, messageData, annotationData] = await Promise.all([
      apiRequest(`/api/debates/${encodeURIComponent(debateId)}/state`),
      apiRequest(`/api/debates/${encodeURIComponent(debateId)}/messages`),
      apiRequest(`/api/debates/${encodeURIComponent(debateId)}/annotations`),
    ]);
    setState(debateState);
    setMessages(messageData.messages || []);
    setAnnotations(annotationData.annotations || []);
  }

  useEffect(() => {
    loadRoom().catch(() => {});
    // Room data is reloaded when the debate id changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debateId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const isTurn = state?.turnUserId === user.id && !state?.isFinished;
  const minutes = Math.floor((state?.secondsRemaining || 0) / 60);
  const seconds = String((state?.secondsRemaining || 0) % 60).padStart(2, "0");

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
      setActiveTab("facts");
    } finally {
      setLoadingAi(false);
    }
  }

  function captureSelection() {
    const selection = window.getSelection();
    const quote = selection?.toString().trim();
    const node = selection?.anchorNode?.parentElement?.closest?.("[data-message-id]");

    if (!quote || !node || node.dataset.speaker === "system") return;

    const message = messages.find((item) => item.id === node.dataset.messageId);
    const start = message?.text.indexOf(quote) ?? -1;

    if (!message || start < 0) return;

    setSelectedQuote({
      messageId: message.id,
      speaker: message.authorName || "Debater",
      quote,
      start,
      end: start + quote.length,
    });
    setActiveTab("notes");
  }

  async function saveAnnotation(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const note = String(form.get("note") || "").trim();

    if (!selectedQuote || !note) return;

    const { annotation } = await apiRequest(`/api/debates/${encodeURIComponent(debateId)}/annotations`, {
      method: "POST",
      body: JSON.stringify({ ...selectedQuote, note }),
    });
    setAnnotations((current) => [...current, annotation]);
    setSelectedQuote(null);
    window.getSelection()?.removeAllRanges();
  }

  function toggleSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition || !isTurn) return;

    if (speechRef.current) {
      speechRef.current.stop();
      speechRef.current = null;
      setSpeechActive(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0].transcript).join(" ");
      setText((current) => `${current}${current ? " " : ""}${transcript}`.trim());
    };
    recognition.onend = () => {
      speechRef.current = null;
      setSpeechActive(false);
    };
    speechRef.current = recognition;
    setSpeechActive(true);
    recognition.start();
  }

  return (
    <main className="room-shell">
      <section className="room-panel">
        <button className="secondary-button compact-button" type="button" onClick={onHome}>Home</button>
        <h1>{state?.topicTitle || "Debate"}</h1>
        <ParticipantStrip participants={state?.participants || []} user={user} onSendFriendRequest={onSendFriendRequest} onOpenProfile={onOpenProfile} />
        <div className="debate-room-grid">
          <section className="chat-stack">
            <div className="debate-format">
              <div>
                <span>{state?.isFinished ? "Finished" : state?.phaseLabel || "Opening statement"}</span>
                <strong>{state?.isFinished ? "Debate finished" : `${state?.turnUserName || "Debater"} is up`}</strong>
              </div>
              <div className="turn-timer">{state?.isFinished ? "Done" : `${minutes}:${seconds}`}</div>
            </div>
            <div className="phase-track" aria-label="Debate phases">
              {phaseLabels.map(([key, label]) => (
                <span key={key} className={`phase-pill ${state?.phaseKey === key ? "active" : ""}`}>
                  {label}
                </span>
              ))}
              <span className={`phase-pill ${state?.isFinished ? "active" : ""}`}>Finished</span>
            </div>
            <div className="chat-thread" onMouseUp={captureSelection}>
              {messages.map((message) => {
                const mine = message.userId === user.id;
                return (
                  <article key={message.id} className={`chat-message ${message.speaker === "system" ? "system" : mine ? "me" : "opponent"}`} data-message-id={message.id} data-speaker={message.speaker}>
                    <div className="message-meta"><strong>{message.speaker === "system" ? "System" : mine ? "You" : message.authorName || "Opponent"}</strong><span>{new Date(message.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span></div>
                    <p className="message-text">{splitWithAnnotations(message, annotations, () => setActiveTab("notes"))}</p>
                  </article>
                );
              })}
              <div ref={endRef} />
            </div>
            {selectedQuote ? (
              <form className="annotation-editor active" onSubmit={saveAnnotation}>
                <blockquote>{selectedQuote.quote}</blockquote>
                <textarea name="note" rows={3} placeholder="Write a note about this highlight..." />
                <div className="annotation-actions">
                  <button className="primary-button compact-button" type="submit">Save note</button>
                  <button className="secondary-button compact-button" type="button" onClick={() => setSelectedQuote(null)}>Cancel</button>
                </div>
              </form>
            ) : null}
            <div className="chat-composer">
              <span className="turn-status">{isTurn ? "Your turn" : "Waiting for your turn..."}</span>
              <div className="composer-row">
                <button className={`icon-button mic-button ${speechActive ? "active" : ""}`} type="button" disabled={!isTurn} onClick={toggleSpeech} aria-label="Speech to text">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1a7 7 0 0 0 6-6.9h-2Z" />
                  </svg>
                </button>
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
          <CopilotPanel
            analysis={analysis}
            factCheck={factCheck}
            annotations={annotations}
            messages={messages}
            loadingAi={loadingAi}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onRefreshCopilot={refreshCopilot}
            onRunFactCheck={runFactCheck}
            onTabFactCheck={runFactCheck}
            onOpenResearch={() => onResearch(factCheck)}
          />
        </div>
      </section>
    </main>
  );
}
