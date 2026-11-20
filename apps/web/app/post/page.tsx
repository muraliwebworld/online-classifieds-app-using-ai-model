"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "../../components/BrandLogo";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
type Option = {
  id: string;
  name?: string;
  slug?: string;
  city?: string;
  state?: string | null;
};

export default function PostPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Option[]>([]);
  const [locations, setLocations] = useState<Option[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [selectedImages, setSelectedImages] = useState<
    { file: File; preview: string }[]
  >([]);
  useEffect(() => {
    if (!localStorage.getItem("accessToken")) {
      router.replace("/login?next=/post");
      return;
    }
    setCheckingAuth(false);
    void Promise.all([
      fetch(`${API_URL}/api/catalog/categories`).then((r) => r.json()),
      fetch(`${API_URL}/api/catalog/locations`).then((r) => r.json()),
    ]).then(([c, l]) => {
      setCategories(c.categories ?? []);
      setLocations(l.locations ?? []);
    });
  }, [router]);
  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    if (!picked.length) return;
    const next = [...selectedImages];
    for (const file of picked) {
      if (next.length >= 8) break;
      if (file.size > 5 * 1024 * 1024) {
        setMessage(`"${file.name}" exceeds the 5 MB limit.`);
        continue;
      }
      next.push({ file, preview: URL.createObjectURL(file) });
    }
    setSelectedImages(next);
    event.target.value = "";
  }

  function removeImage(index: number) {
    setSelectedImages((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setMessage("Please sign in before posting an ad.");
      setBusy(false);
      return;
    }

    let imageUrls: string[] = [];
    if (selectedImages.length > 0) {
      const uploadForm = new FormData();
      for (const item of selectedImages) {
        uploadForm.append("images", item.file);
      }
      const uploadRes = await fetch(`${API_URL}/api/uploads`, {
        method: "POST",
        credentials: "include",
        headers: { authorization: `Bearer ${token}` },
        body: uploadForm,
      });
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) {
        setMessage(uploadData.error ?? "Unable to upload images.");
        setBusy(false);
        return;
      }
      imageUrls = (uploadData.files ?? []).map((f: { url: string }) =>
        f.url.startsWith("http") ? f.url : `${API_URL}${f.url}`,
      );
    }

    let recaptchaToken: string | undefined;
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (siteKey && window.grecaptcha)
      recaptchaToken = await new Promise<string>((resolve, reject) =>
        window.grecaptcha!.ready(() =>
          window
            .grecaptcha!.execute(siteKey, { action: "create_listing" })
            .then(resolve)
            .catch(reject),
        ),
      );
    const response = await fetch(`${API_URL}/api/listings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description"),
        price: form.get("price"),
        currency: "INR",
        categoryId: form.get("categoryId"),
        locationId: form.get("locationId"),
        imageUrls,
        recaptchaToken,
      }),
    });
    const data = await response.json();
    setMessage(
      response.ok
        ? "Your ad is being reviewed by AI and will go live shortly."
        : (data.error ?? "Unable to submit listing."),
    );
    setBusy(false);
    if (response.ok) {
      (event.target as HTMLFormElement).reset();
      selectedImages.forEach((item) => URL.revokeObjectURL(item.preview));
      setSelectedImages([]);
    }
  }
  if (checkingAuth)
    return (
      <main className="site-shell">
        <div className="container">
          <section
            className="section"
            style={{ maxWidth: 700, paddingTop: 80 }}
          >
            <p className="hero-copy">Checking your account…</p>
          </section>
        </div>
      </main>
    );
  return (
    <main className="site-shell">
      <div className="container">
        <header className="header">
          <BrandLogo />
          <Link href="/" className="text-link">
            Cancel
          </Link>
        </header>
        <section className="section" style={{ maxWidth: 700, paddingTop: 35 }}>
          <div className="eyebrow">Share with your community</div>
          <h1
            style={{
              fontFamily: "Plus Jakarta Sans",
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              letterSpacing: "-.06em",
              margin: "10px 0",
            }}
          >
            Post an ad
          </h1>
          <p className="hero-copy">
            Write naturally. Our AI will clean up your description, suggest
            tags, and help buyers find it.
          </p>
          <form
            onSubmit={submit}
            style={{ display: "grid", gap: 16, marginTop: 30 }}
          >
            <label>
              Title
              <input
                className="search-input"
                name="title"
                required
                minLength={5}
                maxLength={160}
                placeholder="e.g. Solid wood dining table"
              />
            </label>
            <label>
              Description
              <textarea
                className="search-input"
                name="description"
                required
                minLength={20}
                rows={6}
                placeholder="Tell buyers about condition, details, and what makes it useful."
                style={{
                  width: "100%",
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  marginTop: 7,
                }}
              />
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <label>
                Price (₹)
                <input
                  className="search-input"
                  name="price"
                  type="number"
                  min="0"
                  required
                  placeholder="15000"
                  style={{
                    width: "100%",
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                    marginTop: 7,
                  }}
                />
              </label>
              <label>
                Category
                <select
                  className="search-input"
                  name="categoryId"
                  required
                  style={{
                    width: "100%",
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                    marginTop: 7,
                  }}
                >
                  {categories.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Location
              <select
                className="search-input"
                name="locationId"
                required
                style={{
                  width: "100%",
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  marginTop: 7,
                }}
              >
                {locations.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.city}, {item.state}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Photos (up to 8 images, max 5 MB each · scanned with ClamAV)
              <input
                className="search-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={handleFileChange}
                disabled={busy || selectedImages.length >= 8}
                style={{
                  width: "100%",
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  marginTop: 7,
                  padding: 10,
                }}
              />
            </label>
            {selectedImages.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
                  gap: 10,
                }}
              >
                {selectedImages.map((item, idx) => (
                  <div
                    key={item.preview}
                    style={{
                      position: "relative",
                      borderRadius: 10,
                      overflow: "hidden",
                      border: "1px solid var(--line)",
                      aspectRatio: "1 / 1",
                    }}
                  >
                    <img
                      src={item.preview}
                      alt={item.file.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      aria-label={`Remove ${item.file.name}`}
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        border: "none",
                        background: "rgba(0,0,0,0.65)",
                        color: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              className="button button-primary"
              disabled={busy}
              type="submit"
            >
              {busy ? "Submitting…" : "Submit for review →"}
            </button>
            {message && (
              <p
                style={{
                  color: message.startsWith("Your")
                    ? "#3e7650"
                    : "var(--brand-dark)",
                }}
              >
                {message}
              </p>
            )}
          </form>
        </section>
      </div>
    </main>
  );
}
