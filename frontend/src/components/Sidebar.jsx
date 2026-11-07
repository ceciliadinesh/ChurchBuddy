import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  UsersRound,
  CalendarDays,
  ClipboardList,
  LogOut,
  Flower2,
  X,
} from "lucide-react";

const links = [
  {
    title: "Dashboard",
    path: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Lector Management",
    path: "/admin/lectors",
    icon: UsersRound,
  },
  {
    title: "Monthly Scheduling",
    path: "/admin/scheduling",
    icon: CalendarDays,
  },
 
];

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate();

  function logout() {
    sessionStorage.removeItem("admin_token");
    navigate("/admin/login");
  }

  return (
    <>
      {open && (
        <button
          type="button"
          className="sidebar-overlay"
          onClick={onClose}
          aria-label="Close menu"
        />
      )}

      <aside
        className={`admin-sidebar ${open ? "sidebar-open" : ""}`}
      >
        <div className="sidebar-brand">
          <img src="/images/chruchlogo.png" alt="ChurchBuddy logo" />

          <div>
            <h2>ChurchBuddy</h2>
            <span>ADMINISTRATION</span>
          </div>

          <button
            type="button"
            className="sidebar-close"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-section-label">WORKSPACE</div>

        <nav className="sidebar-links">
          {links.map((link) => {
            const Icon = link.icon;

            return (
              <NavLink
                key={link.path}
                to={link.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `sidebar-link ${
                    isActive ? "sidebar-link-active" : ""
                  }`
                }
              >
                <Icon size={19} />
                <span>{link.title}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-verse">
            <Flower2 size={21} />
            <p>Serve with love. Lead with faith.</p>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={logout}
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}