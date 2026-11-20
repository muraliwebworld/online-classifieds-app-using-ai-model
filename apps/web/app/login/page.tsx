"use client";
import Link from "next/link";
import { useState } from "react";
import GoogleLoginButton from "../../components/GoogleLoginButton";
import BrandLogo from "../../components/BrandLogo";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (key: string, o: { action: string }) => Promise<string>;
    };
  }
}
export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login"),
    [message, setMessage] = useState(""),
    [devResetUrl, setDevResetUrl] = useState(""),
    [challenge, setChallenge] = useState("");
  async function verify(code: string) {
    const r = await fetch(`${API}/api/auth/2fa/verify`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ challengeToken: challenge, code }),
    });
    const d = await r.json();
    if (r.ok) {
      localStorage.setItem("accessToken", d.accessToken);
      location.href = "/";
    } else setMessage(d.error ?? "Invalid authenticator code");
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setDevResetUrl("");
    const f = new FormData(e.currentTarget),
      key = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    let recaptchaToken: string | undefined;
    if (key) {
      if (!window.grecaptcha) {
        setMessage("Security verification is still loading. Please try again.");
        return;
      }
      recaptchaToken = await new Promise<string>((resolve, reject) =>
        window.grecaptcha!.ready(() =>
          window
            .grecaptcha!.execute(key, { action: mode })
            .then(resolve)
            .catch(reject),
        ),
      );
    }
    if (mode === "forgot") {
      const r = await fetch(`${API}/api/auth/forgot-password`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: f.get("email"), recaptchaToken }),
      });
      const d = await r.json();
      if (r.ok) {
        setMessage(
          d.message ??
            "If an account with that email exists, a password reset link has been sent.",
        );
        if (d.devResetUrl) setDevResetUrl(d.devResetUrl);
      } else {
        setMessage(d.error ?? "Unable to request password reset");
      }
      return;
    }
    const endpoint =
      mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body =
      mode === "login"
        ? { email: f.get("email"), password: f.get("password"), recaptchaToken }
        : {
            name: f.get("name"),
            email: f.get("email"),
            password: f.get("password"),
            recaptchaToken,
          };
    const r = await fetch(`${API}${endpoint}`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (d.twoFactorRequired) {
      setChallenge(d.challengeToken);
      return;
    }
    if (r.ok) {
      localStorage.setItem("accessToken", d.accessToken);
      location.href = mode === "register" ? "/profile" : "/";
    } else setMessage(d.error ?? "Unable to continue");
  }
  return (
    <main className="site-shell">
      <div className="container">
        <header className="header">
          <BrandLogo />
        </header>
        <section
          className="section"
          style={{ maxWidth: 460, margin: "50px auto" }}
        >
          {challenge ? (
            <>
              <div className="eyebrow">Additional verification</div>
              <h1>Enter authenticator code</h1>
              <p>Open your authenticator app and enter the six-digit code.</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  verify(String(new FormData(e.currentTarget).get("code")));
                }}
                style={{ display: "grid", gap: 15 }}
              >
                <input
                  className="search-input"
                  name="code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  placeholder="123456"
                />
                <button className="button button-primary">
                  Verify and continue
                </button>
                {message && <p>{message}</p>}
              </form>
            </>
          ) : (
            <>
              <div className="eyebrow">Your marketplace account</div>
              <h1>
                {mode === "login"
                  ? "Sign in"
                  : mode === "register"
                    ? "Create account"
                    : "Reset password"}
              </h1>
              <div style={{ display: "flex", gap: 8, margin: "22px 0" }}>
                <button
                  type="button"
                  className={`button ${mode === "login" ? "button-primary" : "button-light"}`}
                  onClick={() => {
                    setMode("login");
                    setMessage("");
                    setDevResetUrl("");
                  }}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={`button ${mode === "register" ? "button-primary" : "button-light"}`}
                  onClick={() => {
                    setMode("register");
                    setMessage("");
                    setDevResetUrl("");
                  }}
                >
                  Sign up
                </button>
              </div>
              {mode === "forgot" ? (
                <>
                  <p>
                    Enter your account email address and we will send you a link
                    to reset your password.
                  </p>
                  <form onSubmit={submit} style={{ display: "grid", gap: 15 }}>
                    <input
                      className="search-input"
                      name="email"
                      type="email"
                      required
                      placeholder="Email address"
                    />
                    <button className="button button-primary">
                      Send reset link
                    </button>
                    <button
                      type="button"
                      className="button button-light"
                      onClick={() => {
                        setMode("login");
                        setMessage("");
                        setDevResetUrl("");
                      }}
                    >
                      Back to sign in
                    </button>
                    {message && <p>{message}</p>}
                    {devResetUrl && (
                      <p>
                        Dev reset link:{" "}
                        <Link href={devResetUrl} className="text-link">
                          Reset password now
                        </Link>
                      </p>
                    )}
                  </form>
                </>
              ) : (
                <>
                  <GoogleLoginButton
                    onError={setMessage}
                    onChallenge={setChallenge}
                  />
                  <p>or continue with email</p>
                  <form onSubmit={submit} style={{ display: "grid", gap: 15 }}>
                    {mode === "register" && (
                      <input
                        className="search-input"
                        name="name"
                        required
                        placeholder="Full name"
                      />
                    )}
                    <input
                      className="search-input"
                      name="email"
                      type="email"
                      required
                      placeholder="Email address"
                    />
                    <input
                      className="search-input"
                      name="password"
                      type="password"
                      minLength={8}
                      required
                      placeholder="Password"
                    />
                    {mode === "login" && (
                      <div style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="text-link"
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            cursor: "pointer",
                          }}
                          onClick={() => {
                            setMode("forgot");
                            setMessage("");
                            setDevResetUrl("");
                          }}
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}
                    <button className="button button-primary">
                      {mode === "login" ? "Sign in" : "Create account"}
                    </button>
                    {message && <p>{message}</p>}
                  </form>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
