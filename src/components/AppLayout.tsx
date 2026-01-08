import { Outlet, NavLink } from "react-router-dom";
import { signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "../config/firebase-config";

const AppLayout = ({ user }: { user: User }) => {
  const handleLogout = async () => {
    await signOut(auth);
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `list-group-item list-group-item-action d-flex align-items-center gap-2 ${
      isActive ? "active" : ""
    }`;

  const SidebarLinks = () => (
    <div className="list-group">
      <NavLink to="/dashboard" end className={linkClass}>
        <i className="bi bi-speedometer2" />
        Dashboard
      </NavLink>

      <NavLink to="/dashboard/expenses" className={linkClass}>
        <i className="bi bi-receipt" />
        Expenses
      </NavLink>

      <NavLink to="/dashboard/recurring" className={linkClass}>
        <i className="bi bi-arrow-repeat" />
        Recurring
      </NavLink>

      <NavLink to="/dashboard/reports" className={linkClass}>
        <i className="bi bi-bar-chart" />
        Reports
      </NavLink>

      <NavLink to="/dashboard/categories" className={linkClass}>
        <i className="bi bi-tags" />
        Categories
      </NavLink>

      <NavLink to="/dashboard/settings" className={linkClass}>
        <i className="bi bi-gear" />
        Settings
      </NavLink>
    </div>
  );

  return (
    <>
      {/* Top Navbar */}
      <nav className="navbar navbar-light bg-light border-bottom">
        <div className="container-fluid d-flex justify-content-between align-items-center px-3">
          <div className="d-flex align-items-center gap-2">
            {/* Mobile menu button */}
            <button
              className="btn btn-outline-secondary d-md-none"
              type="button"
              data-bs-toggle="offcanvas"
              data-bs-target="#mobileSidebar"
              aria-controls="mobileSidebar"
            >
              <i className="bi bi-list" />
            </button>

            <span className="navbar-brand mb-0 h1">Budget Tracker</span>
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

            {/* Hide name on very small screens */}
            <span className="small text-muted d-none d-sm-inline">
              {user.displayName || user.email}
            </span>

            <button
              className="btn btn-outline-danger btn-sm"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Offcanvas Sidebar */}
      <div
        className="offcanvas offcanvas-start d-md-none"
        tabIndex={-1}
        id="mobileSidebar"
        aria-labelledby="mobileSidebarLabel"
      >
        <div className="offcanvas-header">
          <h5 className="offcanvas-title" id="mobileSidebarLabel">
            Menu
          </h5>
          <button
            type="button"
            className="btn-close"
            data-bs-dismiss="offcanvas"
            aria-label="Close"
          />
        </div>
        <div className="offcanvas-body">
          <SidebarLinks />
        </div>
      </div>

      {/* Desktop layout */}
      <div className="container-fluid">
        <div className="row">
          {/* Desktop Sidebar */}
          <aside
            className="col-md-3 col-lg-2 border-end bg-white p-0 d-none d-md-block"
            style={{ minHeight: "calc(100vh - 56px)" }}
          >
            <div className="p-3">
              <SidebarLinks />
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
