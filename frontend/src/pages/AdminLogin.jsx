import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LockKeyhole, UserRound, Flower2, ArrowLeft } from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Login failed.");
      }

      sessionStorage.setItem("admin_token", data.access_token);

      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the server. Check that your backend is running."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-decoration login-decoration-one" />
      <div className="login-decoration login-decoration-two" />

      <Link to="/" className="login-back">
        <ArrowLeft size={16} />
        Back to homepage
      </Link>

      <section className="login-card">
        <img
          src="/images/chruchlogo.png"
          alt="ChurchBuddy logo"
          className="login-logo"
        />

        <Flower2 size={25} className="login-flower" />

        <h1 className="serif-heading">Welcome back</h1>

        <p className="login-description">
          Sign in to manage your church lector community and monthly schedules.
        </p>

        <form className="login-form" onSubmit={handleLogin}>
          <label htmlFor="username">Admin ID</label>

          <div className="login-input-wrap">
            <UserRound size={17} />

            <input
              id="username"
              type="text"
              placeholder="Enter your admin ID"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <label htmlFor="password">Password</label>

          <div className="login-input-wrap">
            <LockKeyhole size={17} />

            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button
            type="submit"
            className="primary-button login-submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="login-footer">
          <Flower2 size={13} />
          Serving together, blooming in faith.
        </p>
      </section>
    </main>
  );
}