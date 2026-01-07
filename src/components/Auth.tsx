import React, { useMemo, useState } from "react";
import {
  auth,
  googleProvider,
  githubProvider,
} from "../config/firebase-config";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { authErrorMessage } from "../utils/authErrors";

export function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [touched, setTouched] = useState({ email: false, password: false });

  const emailValid = useMemo(() => {
    // Simple email check (good enough for client-side validation)
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }, [email]);

  const passwordValid = useMemo(() => password.length >= 8, [password]);

  const formValid = emailValid && passwordValid;

  const showEmailError = touched.email && !emailValid;
  const showPasswordError = touched.password && !passwordValid;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setTouched({ email: true, password: true });
    setFormError(null);

    if (!formValid || loading) return;

    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error: any) {
      setFormError(authErrorMessage(error?.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleProvider(provider: "google" | "github") {
    setFormError(null);
    setLoading(true);

    try {
      const p = provider === "google" ? googleProvider : githubProvider;

      await signInWithPopup(auth, p);
    } catch (error: any) {
      setFormError(authErrorMessage(error?.code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container d-flex justify-content-center align-items-center vh-100">
      <div className="card shadow-sm" style={{ width: "390px" }}>
        <div className="card-body p-4">
          <h4 className="text-center mb-1">Budget Tracker</h4>
          <p className="text-center text-muted mb-4">Sign in to continue</p>

          <form onSubmit={handleSubmit} noValidate>
            {/* Form Error */}
            {formError && (
              <div className="alert alert-danger" role="alert">
                {formError}
              </div>
            )}

            {/* Email */}
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                className={`form-control ${showEmailError ? "is-invalid" : ""}`}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              />
              {showEmailError && (
                <div className="invalid-feedback">
                  Enter a valid email address.
                </div>
              )}
            </div>

            {/* Password */}
            <div className="mb-3">
              <label className="form-label">Password</label>
              <input
                type="password"
                className={`form-control ${
                  showPasswordError ? "is-invalid" : ""
                }`}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              />
              {showPasswordError && (
                <div className="invalid-feedback">
                  Password must be at least 8 characters.
                </div>
              )}
            </div>

            {/* Login button */}
            <button
              className="btn btn-primary w-100 mb-3"
              type="submit"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>

            {/* Divider */}
            <div className="d-flex align-items-center gap-2 my-2">
              <div className="flex-grow-1 border-top" />
              <small className="text-muted">or</small>
              <div className="flex-grow-1 border-top" />
            </div>

            {/* Signin Options Buttons */}
            <div className="d-grid gap-2 mt-3">
              <button
                type="button"
                className="btn btn-outline-danger d-flex align-items-center justify-content-center gap-2"
                onClick={() => handleProvider("google")}
                disabled={loading}
              >
                <i className="bi bi-google" />
                Continue with Google
              </button>

              <button
                type="button"
                className="btn btn-outline-dark d-flex align-items-center justify-content-center gap-2"
                onClick={() => handleProvider("github")}
                disabled={loading}
              >
                <i className="bi bi-github" />
                Continue with GitHub
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
