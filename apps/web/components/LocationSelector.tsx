"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
const COOKIE_NAME = "preferred_location_id";

type LocationOption = {
  id: string;
  city: string;
  state?: string | null;
};

function readLocationCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : "";
}

function writeLocationCookie(locationId: string) {
  if (typeof document === "undefined") return;
  if (locationId) {
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(locationId)}; path=/; max-age=31536000; samesite=lax`;
  } else {
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
  }
}

export default function LocationSelector() {
  const router = useRouter();
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    setSelectedId(readLocationCookie());
    fetch(`${API_URL}/api/catalog/locations`)
      .then((r) => (r.ok ? r.json() : { locations: [] }))
      .then((d) => setLocations(d.locations ?? []))
      .catch(() => setLocations([]));
  }, []);

  function updateSelection(nextId: string) {
    setSelectedId(nextId);
    writeLocationCookie(nextId);
    router.refresh();
  }

  function detectLocation() {
    if (!navigator.geolocation || !locations.length) return;
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data?.address ?? {};
            const candidates = [
              addr.city,
              addr.town,
              addr.village,
              addr.state_district,
              addr.county,
              addr.state,
            ]
              .filter(Boolean)
              .map((v: string) => v.toLowerCase());

            const match = locations.find(
              (loc) =>
                candidates.some(
                  (c) =>
                    c.includes(loc.city.toLowerCase()) ||
                    loc.city.toLowerCase().includes(c),
                ) ||
                (loc.state &&
                  candidates.some((c) => c === loc.state!.toLowerCase())),
            );
            if (match) updateSelection(match.id);
          }
        } finally {
          setDetecting(false);
        }
      },
      () => setDetecting(false),
      { timeout: 8000 },
    );
  }

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <select
        aria-label="Preferred location"
        value={selectedId}
        onChange={(e) => updateSelection(e.target.value)}
        className="button button-light"
        style={{ padding: "8px 12px", fontSize: "0.9rem" }}
      >
        <option value="">All locations</option>
        {locations.map((loc) => (
          <option key={loc.id} value={loc.id}>
            ⌖ {loc.city}
            {loc.state ? `, ${loc.state}` : ""}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={detectLocation}
        disabled={detecting}
        title="Use my current location"
        aria-label="Detect my location"
        className="button button-light"
        style={{ padding: "8px 10px", fontSize: "0.9rem" }}
      >
        {detecting ? "…" : "⌖"}
      </button>
    </div>
  );
}
