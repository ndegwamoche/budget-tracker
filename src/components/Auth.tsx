import React, { useMemo, useState } from "react";
import { auth } from "../config/firebase-config";
import { signInWithEmailAndPassword } from "firebase/auth";

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

      alert("✅ Form looks good (async handled).");
    } catch (error: any) {
      const code = error?.code as string | undefined;

      if (code === "auth/invalid-email") {
        setFormError("Please enter a valid email address.");
      } else if (code === "auth/user-not-found") {
        setFormError("No account found with that email.");
      } else if (
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential"
      ) {
        setFormError("Invalid email or password.");
      } else if (code === "auth/too-many-requests") {
        setFormError("Too many attempts. Please wait a bit and try again.");
      } else {
        setFormError("Login failed. Please try again.");
      }
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

            {/* Social buttons (no auth logic yet) */}
            <div className="d-grid gap-2 mt-3">
              <button
                type="button"
                className="btn btn-outline-danger d-flex align-items-center justify-content-center gap-2"
                onClick={() => alert("Google login not wired yet")}
              >
                <i className="bi bi-google" />
                Continue with Google
              </button>

              <button
                type="button"
                className="btn btn-outline-dark d-flex align-items-center justify-content-center gap-2"
                onClick={() => alert("GitHub login not wired yet")}
              >
                <i className="bi bi-github" />
                Continue with GitHub
              </button>
            </div>

            {/* Helper text */}
            <p
              className="text-center text-muted mt-3 mb-0"
              style={{ fontSize: 13 }}
            >
              Tip: Use a valid email and a 8+ character password.g
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
