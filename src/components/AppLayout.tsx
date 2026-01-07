import { Outlet } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase-config";

export function AppLayout() {
  async function handleLogout() {
    await signOut(auth);
  }

  return (
    <>
      {/* Top Navbar */}
      <nav className="navbar navbar-light bg-light border-bottom">
        <div className="container">
          <span className="navbar-brand mb-0 h1">Budget Tracker</span>

          <button
            className="btn btn-outline-danger btn-sm"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Page Content */}
      <main className="container mt-4">
        <Outlet />
      </main>
    </>
  );
}
