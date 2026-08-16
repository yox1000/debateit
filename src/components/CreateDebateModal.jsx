import { useMemo, useState } from "react";
import CategoryIcon from "./CategoryIcon.jsx";
import useModalControls from "../hooks/useModalControls.js";

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

function getEffectiveConfig(config) {
  return {
    ...config,
    format: config.format === "Custom" ? config.customFormat.trim() || "Custom format" : config.format,
    pace: config.pace === "Custom" ? config.customPace.trim() || "Custom pace" : config.pace,
  };
}

export default function CreateDebateModal({ initialTopic, topics, openRooms, onClose, onSelectTopic, onCreateRoom }) {
  const modalRef = useModalControls(onClose);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState({
    topic: initialTopic || "",
    visibility: "Public",
    format: "1v1",
    customFormat: "",
    sideSize: "1",
    pace: "Timed rounds",
    customPace: "",
    evidence: "Evidence encouraged",
  });
  const effectiveConfig = useMemo(() => getEffectiveConfig(config), [config]);
  const matches = useMemo(() => openRooms
    .map((room) => ({ ...room, score: scoreOpenRoom(room, effectiveConfig) }))
    .filter((room) => room.score >= 35)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3), [effectiveConfig, openRooms]);

  function update(name, value) {
    setConfig((current) => ({ ...current, [name]: value }));
  }

  async function createRoom() {
    setError("");
    const topicTitle = effectiveConfig.topic.trim();

    if (!topicTitle) {
      setError("Add a topic before creating the room.");
      return;
    }

    const topic = topics.find((item) => item.title.toLowerCase() === config.topic.toLowerCase()) || {
      id: `custom-${topicTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "topic"}`,
      title: topicTitle,
      category: "General",
      tags: [],
    };

    try {
      setIsSaving(true);
      await onCreateRoom({
        topic,
        visibility: effectiveConfig.visibility,
        format: effectiveConfig.format,
        sideSize: effectiveConfig.sideSize,
        pace: effectiveConfig.pace,
        evidence: effectiveConfig.evidence,
      });
    } catch (createError) {
      setError(createError.message || "Could not create room.");
      setIsSaving(false);
      return;
    }

    onSelectTopic(topic, `${effectiveConfig.visibility} ${effectiveConfig.format}. ${effectiveConfig.sideSize} per side. ${effectiveConfig.pace}. ${effectiveConfig.evidence}. Room is now discoverable. Choose a side to continue.`);
  }

  return (
    <section className="create-debate-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="create-debate-modal" role="dialog" aria-modal="true" aria-labelledby="create-debate-title" ref={modalRef}>
        <header className="create-modal-head">
          <div>
            <p className="eyebrow">Create debate</p>
            <h2 id="create-debate-title">Set the room</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close create debate">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z" />
            </svg>
          </button>
        </header>
        <div className="create-modal-grid">
          <label className="field"><span>Topic</span><input value={config.topic} onChange={(event) => update("topic", event.target.value)} placeholder="Facial recognition, college sports, AI art..." /></label>
          <label className="field"><span>Who can see it</span><select value={config.visibility} onChange={(event) => update("visibility", event.target.value)}><option>Public</option><option>Followers</option><option>Friends</option></select></label>
          <label className="field"><span>Format</span><select value={config.format} onChange={(event) => update("format", event.target.value)}><option>1v1</option><option>2v2</option><option>Panel</option><option>Free-for-all</option><option>Custom</option></select></label>
          <label className="field"><span>People per side</span><select value={config.sideSize} onChange={(event) => update("sideSize", event.target.value)}><option>1</option><option>2</option><option>3</option></select></label>
          {config.format === "Custom" ? <label className="field custom-option-field"><span>Custom format</span><input value={config.customFormat} onChange={(event) => update("customFormat", event.target.value)} placeholder="Example: Oxford style, judge decides, 3 claims each..." /></label> : null}
          <label className="field"><span>Pace</span><select value={config.pace} onChange={(event) => update("pace", event.target.value)}><option>Timed rounds</option><option>Slow evidence review</option><option>Rapid fire</option><option>Custom</option></select></label>
          <label className="field"><span>Evidence rule</span><select value={config.evidence} onChange={(event) => update("evidence", event.target.value)}><option>Evidence encouraged</option><option>Source required</option><option>Casual</option></select></label>
          {config.pace === "Custom" ? <label className="field custom-option-field"><span>Custom pace</span><input value={config.customPace} onChange={(event) => update("customPace", event.target.value)} placeholder="Example: 5 minute openings, 90 second rebuttals..." /></label> : null}
        </div>
        <section className="create-match-preview">
          <div className="matches-head">
            <div><p className="eyebrow">Possible matches</p><h3>Open rooms like this</h3></div>
            <span className="source-badge">{matches.length ? `${matches.length} found` : "No match"}</span>
          </div>
          <div className="create-match-list">
            {matches.length ? matches.map((room) => (
              <button key={room.id || room.topic} className="create-match-card" type="button" onClick={() => onSelectTopic(topics.find((topic) => topic.title === room.topic) || { title: room.topic, category: room.category, id: room.topicId || room.topic })}>
                <CategoryIcon category={room.category} />
                <span>{room.score}% match - Needs {room.need}</span>
                <strong>{room.topic}</strong>
                <small>{room.host} - {room.format} - {room.visibility} - {room.evidence}</small>
              </button>
            )) : <p className="profile-summary">No open rooms match this setup yet. Create a new room and wait for opponents.</p>}
          </div>
        </section>
        {error ? <p className="form-error">{error}</p> : null}
        <footer className="create-modal-actions">
          <button className="secondary-button compact-button" type="button" onClick={onClose}>Cancel</button>
          <button className="primary-button compact-button" type="button" onClick={createRoom} disabled={isSaving}>{isSaving ? "Creating..." : "Create new room"}</button>
        </footer>
      </div>
    </section>
  );
}
