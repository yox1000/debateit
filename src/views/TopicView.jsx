import { useState } from "react";
import RoomRuleChips from "../components/RoomRuleChips.jsx";
import { apiRequest } from "../lib/api.js";

function getRoomConfig(room) {
  return {
    sourceRoomId: room?.id || room?.roomConfig?.sourceRoomId || "",
    visibility: room?.roomConfig?.visibility || room?.visibility || "Public",
    format: room?.roomConfig?.format || room?.format || "1v1",
    sideSize: String(room?.roomConfig?.sideSize || room?.sideSize || "1"),
    pace: room?.roomConfig?.pace || room?.pace || "Timed rounds",
    evidence: room?.roomConfig?.evidence || room?.evidence || "Evidence encouraged",
  };
}

export default function TopicView({ topic, prompt, room, onBack, onRefreshState }) {
  const [stance, setStance] = useState("");
  const [status, setStatus] = useState("Pick a side before entering the matchmaking queue.");
  const [requestId, setRequestId] = useState("");
  const roomConfig = getRoomConfig(room);
  const directMatchingSupported = roomConfig.sideSize === "1";
  const summary = room
    ? "Choose your side to enter this room's matching queue."
    : prompt || "Choose a side and set the debate rules before entering matchmaking.";

  async function findOpponent() {
    if (!stance || !directMatchingSupported) return;
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
          sourceRoomId: roomConfig.sourceRoomId,
          roomConfig,
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
        <p className="profile-summary">{summary}</p>
        <RoomRuleChips config={roomConfig} />
        {!directMatchingSupported ? (
          <p className="form-message">This room is discoverable, but direct chat matchmaking currently supports 1 per side. Group debate matching is the next implementation step.</p>
        ) : null}
        <div className="stance-grid">
          {["Affirm", "Oppose"].map((item) => (
            <button key={item} className={`stance-card ${stance === item ? "selected" : ""}`} type="button" onClick={() => setStance(item)}>
              <strong>{item}</strong>
              <span>{item === "Affirm" ? "Argue for the resolution." : "Argue against the resolution."}</span>
            </button>
          ))}
        </div>
        <button className="primary-button" type="button" disabled={!stance || !directMatchingSupported} onClick={findOpponent}>Find opponent</button>
        {requestId ? <button className="secondary-button compact-button" type="button" onClick={cancel}>Cancel queue</button> : null}
        <p className="form-message">{status}</p>
      </section>
    </main>
  );
}
