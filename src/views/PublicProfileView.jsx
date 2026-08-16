import { useEffect, useState } from "react";
import Brand from "../components/Brand.jsx";
import { apiRequest } from "../lib/api.js";

function getFriendLabel(status) {
  if (status === "friends") return "Unfriend";
  if (status === "outgoing") return "Requested";
  if (status === "incoming") return "Respond in inbox";
  if (status === "self") return "Your profile";
  return "Add friend";
}

export default function PublicProfileView({ userId, currentUser, onHome, onSendFriendRequest, onRemoveFriend }) {
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiRequest(`/api/public-users/${encodeURIComponent(userId)}`)
      .then((data) => setProfile(data.profile))
      .catch((error) => setMessage(error.message));
  }, [userId]);

  async function handleRelationship() {
    if (!profile || profile.friendStatus === "self" || profile.friendStatus === "outgoing" || profile.friendStatus === "incoming") {
      return;
    }

    if (profile.friendStatus === "friends") {
      await onRemoveFriend(profile.id);
      setProfile((current) => ({ ...current, friendStatus: "none", friendCount: Math.max(0, (current.friendCount || 1) - 1) }));
      return;
    }

    await onSendFriendRequest(profile.id);
    setProfile((current) => ({ ...current, friendStatus: "outgoing" }));
  }

  return (
    <main className="profile-shell">
      <section className="profile-page-panel">
        <div className="profile-head">
          <Brand onHome={onHome} />
          <button className="secondary-button compact-button" type="button" onClick={onHome}>Home</button>
        </div>
        {profile ? (
          <>
            <div className="public-profile-hero">
              <span>{(profile.name || "D").charAt(0).toUpperCase()}</span>
              <div>
                <p className="eyebrow">Debater profile</p>
                <h1>{profile.name}</h1>
                <p>{profile.stats?.level || "Newcomer"} - {profile.country || "Country unset"} - {profile.friendCount || 0} friends</p>
              </div>
              {profile.id !== currentUser.id ? (
                <button className="primary-button compact-button" type="button" disabled={["outgoing", "incoming", "self"].includes(profile.friendStatus)} onClick={handleRelationship}>
                  {getFriendLabel(profile.friendStatus)}
                </button>
              ) : null}
            </div>
            <div className="profile-columns">
              <section>
                <h2>Interests</h2>
                <div className="opponent-interests">
                  {(profile.interests || []).length ? profile.interests.map((interest) => <span key={interest} className="profile-chip">{interest}</span>) : <span className="profile-chip">No interests yet</span>}
                </div>
              </section>
              <section>
                <h2>Bio</h2>
                <p className="profile-summary">{profile.debateBio || profile.stats?.summary || "No public bio yet."}</p>
              </section>
            </div>
          </>
        ) : <p className="profile-summary">{message || "Loading profile..."}</p>}
      </section>
    </main>
  );
}
