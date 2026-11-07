
import { useState } from "react";
import { Outlet } from "react-router-dom";
import {
  Menu,
  Sparkles,
  Flower2,
} from "lucide-react";

import "./AdminLayout.css";
import Sidebar from "./Sidebar";

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <div className="admin-shell">

      {/* Floating cherry blossom petals */}
      <div className="sakura-layer" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className={`sakura-petal petal-${(i % 6) + 1}`}
            style={{
              left: `${(i * 17 + 7) % 100}%`,
              animationDelay: `${(i % 9) * -2.3}s`,
              animationDuration: `${12 + (i % 7) * 2}s`,
            }}
          />
        ))}
      </div>

      <Sidebar
        open={sidebarOpen}
        onClose={closeSidebar}
      />

      <div className="admin-main">

        {/* Top navigation */}
        <header className="admin-topbar">

          <div className="topbar-left">
            <button
              className="mobile-menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={23} />
            </button>

            <div className="welcome-icon">
              <Flower2 size={23} />
            </div>

            <div className="welcome-text">
              <p className="topbar-welcome">
                Welcome back, <span>Admin</span> 🌸
              </p>

              <p className="topbar-subtitle">
                Manage your church community with care.
              </p>
            </div>
          </div>

          <div className="topbar-right">

            {/* Admin Profile */}
            <div className="admin-profile">
              <div className="admin-avatar">
                A
                <span className="avatar-status" />
              </div>

              <div className="profile-info">
                <span className="profile-name">
                  Administrator
                </span>

                <span className="profile-role">
                  Super Admin
                </span>
              </div>
            </div>

          </div>
        </header>

        {/* Page content */}
        <main className="admin-content">

          <div className="content-decoration">
            <Sparkles size={17} />
            <span>A little kindness goes a long way</span>
            <Flower2 size={17} />
          </div>

          <div className="content-inner">
            <Outlet />
          </div>

          <footer className="admin-footer">
            <span>Made with ♡ and a little sakura magic</span>
            <span>
              © {new Date().getFullYear()} Church Administration
            </span>
          </footer>

        </main>
      </div>
    </div>
  );
}
