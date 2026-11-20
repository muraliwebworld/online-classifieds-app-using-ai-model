"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

function resolveLogoUrl(url?: string | null): string {
  if (!url) return "";
  return url.startsWith("/") ? `${API_URL}${url}` : url;
}

export default function BrandLogo() {
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    const load = () => {
      fetch(`${API_URL}/api/catalog/theme`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          const raw =
            typeof d?.theme?.logo_url === "string" ? d.theme.logo_url : "";
          setLogoUrl(resolveLogoUrl(raw));
        })
        .catch(() => undefined);
    };
    load();
    window.addEventListener("theme-updated", load);
    return () => window.removeEventListener("theme-updated", load);
  }, []);

  return (
    <Link href="/" className="brand">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt="VidexPulse"
          style={{ height: 34, width: "auto", objectFit: "contain" }}
        />
      ) : (
        <>
          <span className="brand-mark">✦</span>videxpulse
          <span style={{ color: "var(--brand)" }}>.</span>
        </>
      )}
    </Link>
  );
}
