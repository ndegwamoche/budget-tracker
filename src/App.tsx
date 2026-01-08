import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";

import { auth } from "./config/firebase-config";
import { Auth } from "./components/Auth";
import AppLayout from "./components/AppLayout";
import { Dashboard } from "./components/Dashboard";
// import { Expenses } from "./components/Expenses";
// import { Reports } from "./components/Reports";
// import { Categories } from "./components/Categories";
// import { Recurring } from "./components/Recurring";
// import { Settings } from "./components/Settings";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setCheckingAuth(false);
    });
    return unsub;
  }, []);

  if (checkingAuth) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border" role="status" aria-label="Loading" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* HOME = LOGIN */}
        <Route
          path="/"
          element={user ? <Navigate to="/dashboard" replace /> : <Auth />}
        />

        {/* PROTECTED AREA (Layout + nested pages) */}
        <Route
          path="/dashboard"
          element={
            user ? <AppLayout user={user} /> : <Navigate to="/" replace />
          }
        >
          <Route index element={<Dashboard />} />
          {/* <Route path="expenses" element={<Expenses />} />
          <Route path="recurring" element={<Recurring />} />
          <Route path="reports" element={<Reports />} />
          <Route path="categories" element={<Categories />} />
          <Route path="settings" element={<Settings />} /> */}
        </Route>

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
