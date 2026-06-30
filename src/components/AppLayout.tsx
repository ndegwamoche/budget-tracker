import { Outlet, NavLink } from "react-router-dom";
import { signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "../config/firebase-config";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: "bi-speedometer2", end: true },
  { to: "/expenses", label: "Expenses", icon: "bi-receipt" },
  { to: "/categories", label: "Categories", icon: "bi-tags" },
  { to: "/reports", label: "Reports", icon: "bi-bar-chart" },
  { to: "/settings", label: "Settings", icon: "bi-gear" },
] as const;

const AppLayout = ({ user }: { user: User }) => {
  const handleLogout = async () => {
    await signOut(auth);
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `app-sidebar-link list-group-item list-group-item-action d-flex align-items-center gap-3 ${
      isActive ? "active" : ""
    }`;

  const SidebarLinks = () => (
    <div className="list-group app-sidebar-list">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={(l as any).end}
          className={linkClass}
        >
          <span className="app-sidebar-icon-wrap">
            <i className={`bi ${l.icon} app-sidebar-icon`} />
          </span>
          <span className="app-sidebar-label">{l.label}</span>
        </NavLink>
      ))}
    </div>
  );

  const MobileNav = () => (
    <div className="app-mobile-nav d-md-none">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={(l as any).end}
          className={({ isActive }) =>
            `app-mobile-link ${isActive ? "active" : ""}`
          }
        >
          <i className={`bi ${l.icon} app-mobile-icon`} />
          <span className="app-mobile-label">{l.label}</span>
        </NavLink>
      ))}
    </div>
  );

  return (
    <>
      <nav className="navbar navbar-dark bg-dark border-bottom py-2 app-topbar">
        <div className="container-fluid px-3">
          <div className="d-flex justify-content-between align-items-center w-100">
            <div className="d-flex align-items-center gap-2">
              <span className="navbar-brand mb-0 h1 d-flex align-items-center gap-2 app-logo">
                <i className="bi bi-plus-slash-minus" />
                <span className="app-title d-none d-sm-inline">Budget Tracker</span>
              </span>
            </div>

            <div className="d-flex align-items-center gap-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="User avatar"
                  width={32}
                  height={32}
                  className="rounded-circle"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center"
                  style={{ width: 32, height: 32, fontSize: 14 }}
                >
                  {(user.email ?? "?").charAt(0).toUpperCase()}
                </div>
              )}

              <span className="small text-muted d-none d-sm-inline">
                {user.displayName || user.email}
              </span>

              <button
                className="btn btn-outline-danger btn-sm d-flex align-items-center justify-content-center gap-1"
                onClick={handleLogout}
              >
                <i className="bi bi-lock-fill" />
                <span className="d-none d-sm-inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container-fluid app-shell">
        <div className="row">
          <aside
            className="col-md-3 col-lg-2 border-end bg-body p-0 d-none d-md-block app-sidebar-column"
            style={{ minHeight: "calc(100vh - 56px)" }}
          >
            <div className="p-3 app-sidebar-sticky">
              <div className="card shadow-sm app-sidebar-card">
                <SidebarLinks />
              </div>
            </div>
          </aside>

          <main className="col-12 col-md-9 col-lg-10 p-3 p-md-4 app-main-content">
            <Outlet />
          </main>
        </div>
      </div>

      <MobileNav />
    </>
  );
};

export default AppLayout;
