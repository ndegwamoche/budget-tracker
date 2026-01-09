import { useEffect, useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu whenever route changes (works for link clicks + programmatic nav)
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await signOut(auth);
    setMobileOpen(false);
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `list-group-item list-group-item-action d-flex align-items-center gap-2 ${
      isActive ? "active" : ""
    }`;

  const SidebarLinks = () => (
    <div className="list-group">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={(l as any).end}
          className={linkClass}
        >
          <i className={`bi ${l.icon}`} />
          {l.label}
        </NavLink>
      ))}
    </div>
  );

  return (
    <>
      {/* Top Navbar */}
      <nav className="navbar navbar-light bg-light border-bottom py-0">
        <div className="container-fluid px-3 position-relative">
          <div className="d-flex justify-content-between align-items-center w-100">
            <div className="d-flex align-items-center gap-2">
              {/* Mobile menu toggle */}
              <button
                className="btn btn-outline-secondary d-md-none"
                type="button"
                aria-expanded={mobileOpen}
                aria-controls="mobileMenu"
                onClick={() => setMobileOpen((v) => !v)}
              >
                <i className="bi bi-list" />
              </button>

              <span className="navbar-brand mb-0 h1 d-flex align-items-center gap-1 app-logo">
                <i className="bi bi-plus-slash-minus" />
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

          {/* Mobile menu (pure React, no offcanvas) */}
          <div
            id="mobileMenu"
            className={`d-md-none ${
              mobileOpen ? "d-block" : "d-none"
            } position-absolute start-0 end-0`}
            style={{ top: "100%", zIndex: 1050 }}
          >
            <div className="mt-3 mb-2">
              <div className="card shadow-sm">
                <div className="card-body p-2">
                  {/* Make links bigger and tap-friendly */}
                  <div className="list-group">
                    {links.map((l) => (
                      <NavLink
                        key={l.to}
                        to={l.to}
                        end={(l as any).end}
                        className={({ isActive }) =>
                          `list-group-item list-group-item-action d-flex align-items-center gap-2 ${
                            isActive ? "active" : ""
                          }`
                        }
                        onClick={() => setMobileOpen(false)}
                      >
                        <i className={`bi ${l.icon}`} />
                        {l.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>

              {/* Optional: tap outside to close (simple button) */}
              <button
                className="btn btn-light w-100 mt-2"
                onClick={() => setMobileOpen(false)}
              >
                Close menu
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Desktop layout */}
      <div className="container-fluid">
        <div className="row">
          {/* Desktop Sidebar */}
          <aside
            className="col-md-3 col-lg-2 border-end bg-white p-0 d-none d-md-block"
            style={{ minHeight: "calc(100vh - 56px)" }}
          >
            <div className="p-3">
              <div className="card shadow-sm">
                <SidebarLinks />
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="col-12 col-md-9 col-lg-10 p-3 p-md-4">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
};

export default AppLayout;
