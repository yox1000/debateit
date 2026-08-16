import { useState } from "react";
import Brand from "../components/Brand.jsx";
import { apiRequest } from "../lib/api.js";

export default function AuthView({ onUser }) {
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
