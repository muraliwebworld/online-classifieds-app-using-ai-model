"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AccountMenu from "../../components/AccountMenu";
import BrandLogo from "../../components/BrandLogo";
import ConfirmDialog from "../../components/ConfirmDialog";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

type Option = {
  id: string;
  name?: string;
  city?: string;
  state?: string | null;
};

type MyListing = {
  id: string;
  title: string;
  description: string;
  price: string | number;
  currency: string;
  status: string;
  moderationStatus: string;
  rejectionReason?: string | null;
  categoryId: string;
  locationId: string;
  category?: { name: string };
  location?: { city: string; state?: string | null };
  images?: { url: string }[];
};

function resolveImageUrl(url?: string) {
  if (!url) return undefined;
  return url.startsWith("/") ? `${API_URL}${url}` : url;
}

export default function MyListingsPage() {
  const router = useRouter();
  const [listings, setListings] = useState<MyListing[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [locations, setLocations] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    categoryId: "",
    locationId: "",
  });
  const [confirmState, setConfirmState] = useState<{
    type: "update" | "delete";
    id: string;
    title: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const authHeaders = () => ({
    authorization: `Bearer ${localStorage.getItem("accessToken") ?? ""}`,
  });

  async function loadAll() {
    setLoading(true);
    try {
      const [mineRes, catRes, locRes] = await Promise.all([
        fetch(`${API_URL}/api/listings/mine`, {
          credentials: "include",
          headers: authHeaders(),
        }),
        fetch(`${API_URL}/api/catalog/categories`),
        fetch(`${API_URL}/api/catalog/locations`),
      ]);
      if (mineRes.status === 401) {
        router.replace("/login?next=/my-listings");
        return;
      }
      const [mineData, catData, locData] = await Promise.all([
        mineRes.json(),
        catRes.json(),
        locRes.json(),
      ]);
      setListings(mineData.listings ?? []);
      setCategories(catData.categories ?? []);
      setLocations(locData.locations ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!localStorage.getItem("accessToken")) {
      router.replace("/login?next=/my-listings");
      return;
    }
    void loadAll();
  }, [router]);

  function startEdit(item: MyListing) {
    setEditingId(item.id);
    setMessage("");
    setForm({
      title: item.title,
      description: item.description,
      price: String(item.price),
      categoryId: item.categoryId,
      locationId: item.locationId,
    });
  }

  async function executeConfirmedAction() {
    if (!confirmState) return;
    setBusy(true);
    setMessage("");
    try {
      if (confirmState.type === "delete") {
        const r = await fetch(`${API_URL}/api/listings/${confirmState.id}`, {
          method: "DELETE",
          credentials: "include",
          headers: authHeaders(),
        });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          setMessage(d.error ?? "Unable to delete listing.");
          return;
        }
        setListings((prev) => prev.filter((l) => l.id !== confirmState.id));
        if (editingId === confirmState.id) setEditingId(null);
        setMessage("Listing deleted.");
      } else {
        const r = await fetch(`${API_URL}/api/listings/${confirmState.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { ...authHeaders(), "content-type": "application/json" },
          body: JSON.stringify({
            title: form.title,
            description: form.description,
            price: Number(form.price),
            categoryId: form.categoryId,
            locationId: form.locationId,
          }),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) {
          setMessage(d.error ?? "Unable to update listing.");
          return;
        }
        setListings((prev) =>
          prev.map((l) => (l.id === confirmState.id ? d.listing : l)),
        );
        setEditingId(null);
        setMessage("Listing updated.");
      }
    } finally {
      setBusy(false);
      setConfirmState(null);
    }
  }

  return (
    <main className="site-shell">
      <div className="container">
        <header className="header">
          <BrandLogo />
          <AccountMenu />
        </header>
        <section className="section">
          <div className="section-heading">
            <div>
              <div className="eyebrow">Your ads</div>
              <h1>My listings</h1>
            </div>
            <Link href="/post" className="button button-primary">
              Post an ad ＋
            </Link>
          </div>
          {message && (
            <p style={{ marginBottom: 16, color: "var(--brand-dark)" }}>
              {message}
            </p>
          )}
          {loading ? (
            <div className="empty-state">Loading your listings…</div>
          ) : !listings.length ? (
            <div className="empty-state">
              You haven&apos;t posted any listings yet.{" "}
              <Link href="/post" className="text-link">
                Post your first ad →
              </Link>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {listings.map((item) => {
                const thumb = resolveImageUrl(item.images?.[0]?.url);
                return (
                  <div
                    key={item.id}
                    style={{
                      background: "white",
                      border: "1px solid var(--line)",
                      borderRadius: 16,
                      padding: 18,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 16,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ display: "flex", gap: 14, flex: 1 }}>
                        {thumb && (
                          <img
                            src={thumb}
                            alt={item.title}
                            style={{
                              width: 76,
                              height: 76,
                              borderRadius: 10,
                              objectFit: "cover",
                              border: "1px solid var(--line)",
                            }}
                          />
                        )}
                        <div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <strong>{item.title}</strong>
                            <span className="tag">{item.status}</span>
                          </div>
                          <p style={{ margin: "4px 0", color: "var(--muted)" }}>
                            ₹ {Number(item.price).toLocaleString("en-IN")} ·{" "}
                            {item.category?.name ?? "Category"} ·{" "}
                            {item.location?.city ?? "Location"}
                          </p>
                          {item.rejectionReason && (
                            <p style={{ margin: "4px 0", color: "#c93b2b", fontSize: "0.9rem" }}>
                              Reason: {item.rejectionReason}
                            </p>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {item.status === "PUBLISHED" && (
                          <Link
                            href={`/listing/${item.id}`}
                            className="button button-light"
                          >
                            View
                          </Link>
                        )}
                        <button
                          type="button"
                          className="button button-light"
                          onClick={() =>
                            editingId === item.id
                              ? setEditingId(null)
                              : startEdit(item)
                          }
                        >
                          {editingId === item.id ? "Close" : "Edit"}
                        </button>
                        <button
                          type="button"
                          className="button button-light"
                          style={{ color: "#c93b2b" }}
                          onClick={() =>
                            setConfirmState({
                              type: "delete",
                              id: item.id,
                              title: item.title,
                            })
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {editingId === item.id && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          setConfirmState({
                            type: "update",
                            id: item.id,
                            title: form.title,
                          });
                        }}
                        style={{
                          display: "grid",
                          gap: 12,
                          marginTop: 16,
                          paddingTop: 16,
                          borderTop: "1px solid var(--line)",
                        }}
                      >
                        <label>
                          Title
                          <input
                            className="search-input"
                            required
                            minLength={5}
                            maxLength={160}
                            value={form.title}
                            onChange={(e) =>
                              setForm({ ...form, title: e.target.value })
                            }
                            style={{
                              width: "100%",
                              border: "1px solid var(--line)",
                              borderRadius: 10,
                              marginTop: 4,
                            }}
                          />
                        </label>
                        <label>
                          Description
                          <textarea
                            className="search-input"
                            required
                            minLength={20}
                            rows={4}
                            value={form.description}
                            onChange={(e) =>
                              setForm({ ...form, description: e.target.value })
                            }
                            style={{
                              width: "100%",
                              border: "1px solid var(--line)",
                              borderRadius: 10,
                              marginTop: 4,
                            }}
                          />
                        </label>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
                            gap: 12,
                          }}
                        >
                          <label>
                            Price (₹)
                            <input
                              className="search-input"
                              type="number"
                              min="0"
                              required
                              value={form.price}
                              onChange={(e) =>
                                setForm({ ...form, price: e.target.value })
                              }
                              style={{
                                width: "100%",
                                border: "1px solid var(--line)",
                                borderRadius: 10,
                                marginTop: 4,
                              }}
                            />
                          </label>
                          <label>
                            Category
                            <select
                              className="search-input"
                              value={form.categoryId}
                              onChange={(e) =>
                                setForm({ ...form, categoryId: e.target.value })
                              }
                              style={{
                                width: "100%",
                                border: "1px solid var(--line)",
                                borderRadius: 10,
                                marginTop: 4,
                              }}
                            >
                              {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Location
                            <select
                              className="search-input"
                              value={form.locationId}
                              onChange={(e) =>
                                setForm({ ...form, locationId: e.target.value })
                              }
                              style={{
                                width: "100%",
                                border: "1px solid var(--line)",
                                borderRadius: 10,
                                marginTop: 4,
                              }}
                            >
                              {locations.map((l) => (
                                <option key={l.id} value={l.id}>
                                  {l.city}
                                  {l.state ? `, ${l.state}` : ""}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button type="submit" className="button button-primary">
                            Save changes
                          </button>
                          <button
                            type="button"
                            className="button button-light"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
      <ConfirmDialog
        open={Boolean(confirmState)}
        title={
          confirmState?.type === "delete"
            ? "Delete listing?"
            : "Update listing?"
        }
        message={
          confirmState?.type === "delete"
            ? `Are you sure you want to delete "${confirmState.title}"? This action cannot be undone.`
            : `Are you sure you want to save changes to "${confirmState?.title}"?`
        }
        confirmLabel={confirmState?.type === "delete" ? "Delete" : "Update"}
        danger={confirmState?.type === "delete"}
        busy={busy}
        onConfirm={executeConfirmedAction}
        onCancel={() => setConfirmState(null)}
      />
    </main>
  );
}
