import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase-config";
import Swal from "sweetalert2";

type UserSettings = {
  currency: string;
  weekStartsOn: "monday" | "sunday";
  defaultMonthView: "current" | "last";
};

const defaultSettings: UserSettings = {
  currency: "KES",
  weekStartsOn: "monday",
  defaultMonthView: "current",
};

export function Settings() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return unsub;
  }, []);

  // load settings
  useEffect(() => {
    if (!user) return;

    const ref = doc(db, "settings", user.uid);

    getDoc(ref).then((snap) => {
      if (snap.exists()) {
        setSettings({ ...defaultSettings, ...(snap.data() as any) });
      }
      setLoading(false);
    });
  }, [user?.uid]);

  async function saveSettings() {
    if (!user) return;

    setSaving(true);
    try {
      await setDoc(
        doc(db, "settings", user.uid),
        {
          ...settings,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      Swal.fire({
        icon: "success",
        title: "Saved",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await signOut(auth);
  }

  async function handleDangerDelete() {
    const result = await Swal.fire({
      title: "Delete all data?",
      text: "This will permanently remove your expenses and settings.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      confirmButtonText: "Yes, delete everything",
    });

    if (!result.isConfirmed || !user) return;

    Swal.fire("Not implemented", "Hook this to a Cloud Function later", "info");
  }

  if (loading) return <div>Loading settings…</div>;

  return (
    <div>
      <h4 className="mb-4">Settings</h4>

      {/* Account */}
      <div className="card shadow-sm mb-4">
        <div className="card-body d-flex align-items-center gap-3">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt="avatar"
              width={48}
              height={48}
              className="rounded-circle"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center"
              style={{ width: 48, height: 48 }}
            >
              {(user?.email ?? "?").charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <div className="fw-semibold">{user?.displayName || "User"}</div>
            <div className="text-muted small">{user?.email}</div>
          </div>

          <div className="ms-auto">
            <button
              className="btn btn-outline-danger btn-sm"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h6 className="mb-3">Preferences</h6>

          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Currency</label>
              <select
                className="form-select"
                value={settings.currency}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, currency: e.target.value }))
                }
              >
                <option value="KES">KES</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label">Week starts on</label>
              <select
                className="form-select"
                value={settings.weekStartsOn}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    weekStartsOn: e.target.value as any,
                  }))
                }
              >
                <option value="monday">Monday</option>
                <option value="sunday">Sunday</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label">Default month view</label>
              <select
                className="form-select"
                value={settings.defaultMonthView}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    defaultMonthView: e.target.value as any,
                  }))
                }
              >
                <option value="current">Current month</option>
                <option value="last">Last viewed</option>
              </select>
            </div>
          </div>

          <div className="mt-3 text-end">
            <button
              className="btn btn-primary"
              onClick={saveSettings}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="card border-danger">
        <div className="card-body">
          <h6 className="text-danger">Danger zone</h6>
          <button
            className="btn btn-outline-danger"
            onClick={handleDangerDelete}
          >
            Delete all my data
          </button>
        </div>
      </div>
    </div>
  );
}
