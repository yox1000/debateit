import { useState } from "react";
import { apiRequest } from "../lib/api.js";

export default function TopicView({ topic, prompt, onBack, onRefreshState }) {
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
