import { Outlet } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase-config";

export function AppLayout() {
  const user = auth?.currentUser;
  console.log(auth.currentUser);
  async function handleLogout() {
    await signOut(auth);
  }

  return (
    <>
      {/* Top Navbar */}
      <nav className="navbar navbar-light bg-light border-bottom">
        <div className="container d-flex justify-content-between align-items-center">
          <span className="navbar-brand mb-0 h1">Budget Tracker</span>

          {/* Right side: user info + logout */}
          <div className="d-flex align-items-center gap-3">
            {user && (
              <>
                {/* Avatar */}
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="User avatar"
                    width={32}
                    height={32}
                    className="rounded-circle"
                  />
                ) : (
                  <div
                    className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center"
                    style={{ width: 32, height: 32, fontSize: 14 }}
                  >
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Name / Email */}
                <span className="small text-muted">
                  {user.displayName || user.email}
                </span>
              </>
            )}

            <button
              className="btn btn-outline-danger btn-sm"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main className="container mt-4">
        <Outlet />
      </main>
    </>
  );
}
