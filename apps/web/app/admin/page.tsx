"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import AccountMenu from "../../components/AccountMenu";
import BrandLogo from "../../components/BrandLogo";
import ConfirmDialog from "../../components/ConfirmDialog";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
type Tab = "users" | "listings" | "categories" | "plans" | "general" | "theme";
const Switch = ({ on, onChange }: { on: boolean; onChange: () => void }) => (
  <button
    type="button"
    aria-pressed={on}
    onClick={onChange}
    style={{
      width: 52,
      height: 30,
      border: 0,
      borderRadius: 20,
      padding: 3,
      background: on ? "#24a148" : "#9da5ad",
      cursor: "pointer",
      transition: "background .2s",
    }}
  >
    <span
      style={{
        display: "block",
        width: 24,
        height: 24,
        borderRadius: "50%",
        background: "white",
        transform: on ? "translateX(22px)" : "translateX(0)",
        transition: "transform .2s",
        boxShadow: "0 1px 3px #555",
      }}
    />
  </button>
);
export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("users"),
    [rows, setRows] = useState<any[]>([]),
    [editing, setEditing] = useState<string | null>(null),
    [form, setForm] = useState<any>({}),
    [settings, setSettings] = useState<any>({}),
    [error, setError] = useState(""),
    [uploadingLogo, setUploadingLogo] = useState(false),
    [confirmState, setConfirmState] = useState<{
      type: "delete-listing" | "update-listing";
      id: string;
      label: string;
    } | null>(null),
    [confirmBusy, setConfirmBusy] = useState(false);
  const auth = () => ({
    authorization: `Bearer ${localStorage.getItem("accessToken") ?? ""}`,
  });
  async function load() {
    const e = tab === "general" || tab === "theme" ? "theme" : tab;
    const r = await fetch(`${API}/api/admin/${e}`, { headers: auth() });
    const d = await r.json();
    if (!r.ok) throw Error(d.error ?? "Access denied");
    if (e === "theme") {
      const m: any = {};
      (d.theme ?? []).forEach((x: any) => (m[x.key] = x.value));
      setSettings(m);
    } else setRows(d[e] ?? []);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [tab]);
  const change = (e: any) =>
    setForm({ ...form, [e.target.name]: e.target.value });
  const input = (n: string, l: string, t = "text") => (
    <label>
      {l}
      <input
        name={n}
        type={t}
        value={form[n] ?? ""}
        onChange={change}
        style={{
          width: "100%",
          padding: 10,
          border: "1px solid var(--line)",
          borderRadius: 10,
        }}
      />
    </label>
  );
  const select = (n: string, l: string, o: string[]) => (
    <label>
      {l}
      <select
        name={n}
        value={form[n] ?? o[0]}
        onChange={change}
        style={{
          width: "100%",
          padding: 10,
          border: "1px solid var(--line)",
          borderRadius: 10,
        }}
      >
        {o.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
    </label>
  );
  function close() {
    setEditing(null);
    setForm({});
  }
  function open(row: any = null) {
    setEditing(row?.id ?? "new");
    setForm(
      row
        ? { ...row }
        : tab === "plans"
          ? {
              name: "",
              slug: "",
              description: "",
              price: 0,
              interval: "monthly",
              active: "true",
            }
          : {},
    );
  }
  async function persistSave() {
    let endpoint = `${API}/api/admin/${tab}${editing === "new" ? "" : `/${editing}`}`,
      body: any = { ...form };
    if (tab === "plans")
      body = {
        name: form.name,
        slug: form.slug,
        description: form.description,
        price: Number(form.price),
        interval: form.interval,
        active: form.active === "true",
      };
    if (tab === "listings")
      body = {
        title: form.title,
        description: form.description,
        price: Number(form.price),
        currency: form.currency,
        status: form.status,
        moderationStatus: form.moderationStatus,
        rejectionReason: form.rejectionReason || null,
      };
    if (tab === "users" && editing !== "new") {
      await fetch(`${API}/api/admin/users/${editing}/profile`, {
        method: "PATCH",
        headers: { ...auth(), "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      body = {
        role: form.role,
        subscriptionTier: form.subscriptionTier,
        twoFactorEnabled: form.twoFactorEnabled === "true",
      };
      endpoint = `${API}/api/admin/users/${editing}`;
    }
    const r = await fetch(endpoint, {
      method: editing === "new" ? "POST" : "PATCH",
      headers: { ...auth(), "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const d = await r.json();
      return setError(d.error ?? "Save failed");
    }
    close();
    load();
  }
  async function save(e: any) {
    e.preventDefault();
    if (tab === "listings" && editing && editing !== "new") {
      setConfirmState({
        type: "update-listing",
        id: editing,
        label: form.title ?? "this listing",
      });
      return;
    }
    await persistSave();
  }
  async function handleConfirm() {
    if (!confirmState) return;
    setConfirmBusy(true);
    try {
      if (confirmState.type === "delete-listing") {
        const r = await fetch(`${API}/api/admin/listings/${confirmState.id}`, {
          method: "DELETE",
          headers: auth(),
        });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          setError(d.error ?? "Delete failed");
          return;
        }
        if (editing === confirmState.id) close();
        load();
      } else {
        await persistSave();
      }
    } finally {
      setConfirmBusy(false);
      setConfirmState(null);
    }
  }
  const formFields = () => (
    <form
      onSubmit={save}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
        gap: 14,
        padding: 20,
        marginTop: 18,
        background: "white",
        border: "1px solid var(--line)",
        borderRadius: 16,
      }}
    >
      {tab === "plans" && (
        <>
          {input("name", "Plan name")}
          {input("slug", "Slug")}
          {input("description", "Description")}
          {input("price", "Price", "number")}
          {input("interval", "Interval")}
          {select("active", "Active", ["true", "false"])}
        </>
      )}
      {tab === "users" && (
        <>
          {input("firstName", "First name")}
          {input("lastName", "Last name")}
          {input("email", "Email", "email")}
          {input("postalCode", "Postal code", "number")}
          {select("role", "Role", ["USER", "ADMIN"])}
          {select("subscriptionTier", "Tier", ["FREE", "PAID"])}
          {select("twoFactorEnabled", "2FA", ["true", "false"])}
        </>
      )}
      {tab === "listings" && (
        <>
          {input("title", "Title")}
          {input("description", "Description")}
          {input("price", "Price", "number")}
          {input("currency", "Currency")}
          {select("status", "Status", [
            "PUBLISHED",
            "PROCESSING",
            "DRAFT",
            "REJECTED",
            "EXPIRED",
            "ARCHIVED",
          ])}
          {select("moderationStatus", "Moderation status", [
            "APPROVED",
            "PENDING",
            "REJECTED",
            "REVIEW",
          ])}
          {input("rejectionReason", "Rejection reason")}
        </>
      )}
      {tab === "categories" && (
        <>
          {input("name", "Name")}
          {input("slug", "Slug")}
        </>
      )}
      <div style={{ gridColumn: "1/-1" }}>
        <button className="button button-primary">Save</button>
        <button
          type="button"
          className="button button-light"
          onClick={close}
          style={{ marginLeft: 8 }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
  const setting = async (key: string, value: any) => {
    await fetch(`${API}/api/admin/theme/${key}`, {
      method: "PUT",
      headers: { ...auth(), "content-type": "application/json" },
      body: JSON.stringify({ value }),
    });
    setSettings((s: any) => ({ ...s, [key]: value }));
    if (key === "logo_url" && typeof window !== "undefined") {
      window.dispatchEvent(new Event("theme-updated"));
    }
  };
  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingLogo(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("images", file);
      const r = await fetch(`${API}/api/uploads`, {
        method: "POST",
        credentials: "include",
        headers: auth(),
        body: fd,
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error ?? "Unable to upload logo");
        return;
      }
      const rawUrl = d.files?.[0]?.url;
      if (rawUrl) {
        const fullUrl = rawUrl.startsWith("http") ? rawUrl : `${API}${rawUrl}`;
        await setting("logo_url", fullUrl);
      }
    } finally {
      setUploadingLogo(false);
    }
  }
  const themeField = (key: string, label: string, type = "text") => (
    <label style={{ display: "grid", gap: 6 }}>
      {label}
      <input
        type={type}
        value={settings[key] ?? ""}
        onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
        onBlur={(e) => setting(key, e.target.value)}
        style={{
          padding: 10,
          border: "1px solid var(--line)",
          borderRadius: 10,
        }}
      />
    </label>
  );
  const boolSetting = (key: string, label: string) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 0",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <span>{label}</span>
      <Switch
        on={settings[key] === true || settings[key] === "true"}
        onChange={() =>
          setting(key, !(settings[key] === true || settings[key] === "true"))
        }
      />
    </div>
  );
  const tabs: Tab[] = [
    "users",
    "listings",
    "categories",
    "plans",
    "general",
    "theme",
  ];
  return (
    <main className="site-shell">
      <div className="container">
        <header className="header">
          <BrandLogo />
          <AccountMenu />
        </header>
        <section className="section">
          <h1>Marketplace control</h1>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              margin: "24px 0",
            }}
          >
            {tabs.map((t) => (
              <button
                key={t}
                className={`button ${tab === t ? "button-primary" : "button-light"}`}
                onClick={() => {
                  setTab(t);
                  close();
                  setError("");
                }}
              >
                {t}
              </button>
            ))}
          </div>
          {error && <div className="empty-state">{error}</div>}
          {tab === "general" && (
            <div
              style={{
                background: "white",
                padding: 24,
                border: "1px solid var(--line)",
                borderRadius: 16,
              }}
            >
              <h2>General settings</h2>
              {boolSetting(
                "registration_enabled",
                "Allow new user registration",
              )}
              {boolSetting(
                "two_factor_required_for_users",
                "Require 2FA for all non-admin users",
              )}
              <p style={{ color: "var(--muted)", fontSize: ".9rem" }}>
                Changes save automatically.
              </p>
            </div>
          )}
          {tab === "theme" && (
            <div
              style={{
                background: "white",
                padding: 24,
                border: "1px solid var(--line)",
                borderRadius: 16,
              }}
            >
              <h2>Theme customization</h2>
              <div
                style={{
                  display: "grid",
                  gap: 16,
                  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
                }}
              >
                {themeField("logo_url", "Header logo URL", "url")}
                <div style={{ display: "grid", gap: 6 }}>
                  <span>Upload header logo</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    disabled={uploadingLogo}
                    onChange={uploadLogo}
                    style={{
                      padding: 8,
                      border: "1px solid var(--line)",
                      borderRadius: 10,
                    }}
                  />
                  {settings.logo_url && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <img
                        src={
                          String(settings.logo_url).startsWith("/")
                            ? `${API}${settings.logo_url}`
                            : String(settings.logo_url)
                        }
                        alt="Current logo"
                        style={{ height: 32, width: "auto", objectFit: "contain" }}
                      />
                      <button
                        type="button"
                        className="button button-light"
                        onClick={() => setting("logo_url", "")}
                      >
                        Remove logo
                      </button>
                    </div>
                  )}
                </div>
                {themeField("header_color", "Header color", "color")}
                {themeField(
                  "site_background_color",
                  "Site background color",
                  "color",
                )}
                {themeField(
                  "primary_button_color",
                  "Primary button color",
                  "color",
                )}
                {themeField(
                  "secondary_button_color",
                  "Secondary button color",
                  "color",
                )}
                {themeField(
                  "footer_background_color",
                  "Footer background color",
                  "color",
                )}
                {themeField("header_typography_size", "Header typography size")}
                {themeField(
                  "header_typography_color",
                  "Header typography color",
                  "color",
                )}
                {themeField("body_typography_size", "Body typography size")}
                {themeField(
                  "body_typography_color",
                  "Body typography color",
                  "color",
                )}
                {themeField("footer_typography_size", "Footer typography size")}
                {themeField(
                  "footer_typography_color",
                  "Footer typography color",
                  "color",
                )}
              </div>
              <p style={{ color: "var(--muted)", fontSize: ".9rem" }}>
                Each value saves when you leave the field.
              </p>
            </div>
          )}
          {!["general", "theme"].includes(tab) && (
            <>
              {editing === "new" && formFields()}
              <div
                style={{
                  marginTop: 20,
                  background: "white",
                  border: "1px solid var(--line)",
                  borderRadius: 16,
                }}
              >
                {rows.map((row) => (
                  <div
                    key={row.id}
                    style={{
                      padding: 16,
                      borderBottom: "1px solid var(--line)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>
                        <b>
                          {tab === "plans"
                            ? row.name
                            : row.name || row.title || row.email}
                        </b>
                        <br />
                        {tab === "plans"
                          ? `₹${row.price} / ${row.interval} · ${row.active ? "Active" : "Inactive"}`
                          : row.email || row.description}
                      </span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          className="button button-light"
                          onClick={() =>
                            editing === row.id ? close() : open(row)
                          }
                        >
                          {editing === row.id ? "Close" : "Edit"}
                        </button>
                        {tab === "listings" && (
                          <button
                            type="button"
                            className="button button-light"
                            style={{ color: "#c93b2b" }}
                            onClick={() =>
                              setConfirmState({
                                type: "delete-listing",
                                id: row.id,
                                label: row.title || "this listing",
                              })
                            }
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                    {editing === row.id && formFields()}
                  </div>
                ))}
                {!rows.length && (
                  <div className="empty-state">No {tab} found.</div>
                )}
              </div>
              {tab === "plans" && (
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => open()}
                  style={{ marginTop: 18 }}
                >
                  ＋ Add plan
                </button>
              )}
            </>
          )}
        </section>
      </div>
      <ConfirmDialog
        open={Boolean(confirmState)}
        title={
          confirmState?.type === "delete-listing"
            ? "Delete listing?"
            : "Update listing?"
        }
        message={
          confirmState?.type === "delete-listing"
            ? `Are you sure you want to delete "${confirmState.label}"? This action cannot be undone.`
            : `Are you sure you want to save changes to "${confirmState?.label}"?`
        }
        confirmLabel={
          confirmState?.type === "delete-listing" ? "Delete" : "Update"
        }
        danger={confirmState?.type === "delete-listing"}
        busy={confirmBusy}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmState(null)}
      />
    </main>
  );
}
