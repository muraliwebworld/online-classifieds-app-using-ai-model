"use client";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    if (!token) {
      setMessage("Missing password reset token.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch(`${API}/api/auth/reset-password`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const d = await r.json();
      if (r.ok) {
        setSuccess(true);
        setMessage(
          d.message ?? "Password updated successfully. You can now sign in.",
        );
      } else {
        setMessage(d.error ?? "Unable to reset password");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      className="section"
      style={{ maxWidth: 460, margin: "50px auto" }}
    >
      <div className="eyebrow">Account recovery</div>
      <h1>Set a new password</h1>
      {success ? (
        <div style={{ display: "grid", gap: 15 }}>
          <p>{message}</p>
          <Link href="/login" className="button button-primary">
            Sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: "grid", gap: 15 }}>
          <input
            className="search-input"
            type="password"
            minLength={8}
            maxLength={128}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password (min 8 characters)"
          />
          <input
            className="search-input"
            type="password"
            minLength={8}
            maxLength={128}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
          />
          <button className="button button-primary" disabled={submitting}>
            {submitting ? "Updating..." : "Update password"}
          </button>
          <Link href="/login" className="button button-light">
            Back to sign in
          </Link>
          {message && <p>{message}</p>}
        </form>
      )}
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="site-shell">
      <div className="container">
        <header className="header">
          <Link href="/" className="brand">
            ✦ videxpulse.
          </Link>
        </header>
        <Suspense
          fallback={
            <section
              className="section"
              style={{ maxWidth: 460, margin: "50px auto" }}
            >
              <p>Loading...</p>
            </section>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
