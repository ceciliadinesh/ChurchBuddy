
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LockKeyhole,
  UserRound,
  Flower2,
  ArrowLeft,
} from "lucide-react";

import SpotlightCard from "@/components/SpotlightCard";
import GhostFibers from "@/components/GhostFibers";
import "./AdminLogin.css";

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
        body: JSON.stringify({ username, password }),
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
      <div className="login-background">
        <GhostFibers
          glowColor="#e9a2bd"
          layers={3}
          twist={1.2}
          threads={72}
          fiberStyle="dots"
          depthOfField={0.85}
          hoverEffect="focus"
          intro
          mouseInteraction
          lineColor="#f5c8d9"
          secondaryColor="#b76e8a"
          gradient="depth"
          waves={1}
          volume={0.7}
          spread={1}
          scale={1}
          rotation={18}
          perspective={0.65}
          density={1}
          thickness={1}
          tips={0}
          foldGlow={1}
          speed={0.5}
          flow={0.4}
          rollSpeed={0.15}
          focusDepth={0}
          particles={0.5}
          sparkle={0.5}
          glow={0.8}
          brightness={1}
          vignette={0.3}
          grain={0.035}
          mouseStrength={1}
          pulseOnClick
          lightMode={false}
        />
      </div>

      <Link to="/" className="login-back">
        <ArrowLeft size={16} />
        Back to homepage
      </Link>

      <div className="login-content">
        <SpotlightCard
          theme="light"
          spotlightColor="#f5b6cc"
          intensity={0.55}
          spotlightSize={240}
          softness={0.7}
          shape="circle"
          borderGlow={0.6}
          proximity={80}
          smoothing={0.3}
          grain={0}
          ambient={false}
          flare
        >
          <section className="login-card-content">
            <img
              src="/images/chruchlogo.png"
              alt="ChurchBuddy logo"
              className="login-logo"
            />

            <h1 className="serif-heading">Welcome back</h1>

            <p className="login-description">
              Welcome to your ChurchBuddy admin space.
              Sign in to continue.
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
                  onChange={(e) => setUsername(e.target.value)}
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
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              {error && (
                <p className="login-error">{error}</p>
              )}

              <button
                type="submit"
                className="primary-button login-submit"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <p className="login-footer">
              <Flower2 size={14} />
              Serving together, blooming in faith.
            </p>
          </section>
        </SpotlightCard>
      </div>
    </main>
  );
}
