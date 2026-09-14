"use client";
import { useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import { GoogleAuthProvider, getAuth, signInWithPopup } from "firebase/auth";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (key: string, o: { action: string }) => Promise<string>;
    };
  }
}
type Props = {
  onError: (message: string) => void;
  onChallenge?: (token: string) => void;
};
export default function GoogleLoginButton({ onError, onChallenge }: Props) {
  const [challenge, setChallenge] = useState(""),
    [code, setCode] = useState("");
  async function verify() {
    const r = await fetch(`${API}/api/auth/2fa/verify`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ challengeToken: challenge, code }),
    });
    const d = await r.json();
    if (!r.ok) return onError(d.error ?? "Invalid authenticator code");
    localStorage.setItem("accessToken", d.accessToken);
    location.href = "/";
  }
  async function login() {
    try {
      const app =
        getApps()[0] ??
        initializeApp({
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        });
      const result = await signInWithPopup(
        getAuth(app),
        new GoogleAuthProvider(),
      );
      const idToken = await result.user.getIdToken();
      const key = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
      let recaptchaToken: string | undefined;
      if (key && window.grecaptcha)
        recaptchaToken = await new Promise<string>((resolve, reject) =>
          window.grecaptcha!.ready(() =>
            window
              .grecaptcha!.execute(key, { action: "auth_google" })
              .then(resolve)
              .catch(reject),
          ),
        );
      const r = await fetch(`${API}/api/auth/firebase`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken, recaptchaToken }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error ?? "Google sign-in failed");
      if (data.twoFactorRequired) {
        setChallenge(data.challengeToken);
        onChallenge?.(data.challengeToken);
        return;
      }
      localStorage.setItem("accessToken", data.accessToken);
      location.href = "/";
    } catch (e) {
      onError(e instanceof Error ? e.message : "Google sign-in failed");
    }
  }
  if (challenge)
    return (
      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <input
          className="search-input"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          maxLength={6}
          placeholder="6-digit authenticator code"
        />
        <button
          type="button"
          className="button button-primary"
          onClick={verify}
        >
          Verify Google login
        </button>
      </div>
    );
  return (
    <button type="button" className="button button-light" onClick={login}>
      Continue with Google
    </button>
  );
}
