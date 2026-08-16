import { useMemo, useState } from "react";
import { apiRequest } from "../lib/api.js";
import { getCountries } from "../utils/profile.js";

export default function ProfileEdit({ user, onUser, onHome }) {
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
