import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Auth } from "./components/Auth";
import { Dashboard } from "./components/Dashboard";
import { AppLayout } from "./components/AppLayout";
import { auth } from "./config/firebase-config";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setCheckingAuth(false);
    });
    return unsub;
  }, []);

  if (checkingAuth) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* HOME = LOGIN */}
        <Route
          path="/"
          element={user ? <Navigate to="/dashboard" replace /> : <Auth />}
        />

        {/* PROTECTED APP AREA */}
        <Route
          path="/dashboard"
          element={user ? <AppLayout /> : <Navigate to="/" replace />}
        >
          <Route index element={<Dashboard />} />
          {/* later: <Route path="expenses" element={<Expenses />} /> */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
