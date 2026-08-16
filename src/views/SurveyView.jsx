import { useState } from "react";
import Brand from "../components/Brand.jsx";
import { topicChoices } from "../data/catalog.js";
import { apiRequest } from "../lib/api.js";

export default function SurveyView({ user, onUser }) {
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
