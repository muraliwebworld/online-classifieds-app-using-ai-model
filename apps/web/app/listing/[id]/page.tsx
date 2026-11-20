import Link from "next/link";
import { notFound } from "next/navigation";
import { getListing } from "../../../lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

function resolveImageUrl(url?: string) {
  if (!url) return undefined;
  return url.startsWith("/") ? `${API_URL}${url}` : url;
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const listing = await getListing((await params).id);
  if (!listing) notFound();
  const primaryImage = resolveImageUrl(listing.images?.[0]?.url);
  return (
    <main className="site-shell">
      <div className="container">
        <header className="header">
          <Link href="/" className="brand">
            <span className="brand-mark">✦</span>videxpulse
            <span style={{ color: "var(--brand)" }}>.</span>
          </Link>
          <Link href="/search" className="text-link">
            ← Back to search
          </Link>
        </header>
        <section className="section" style={{ paddingTop: 30, maxWidth: 900 }}>
          <div
            className="listing-image orange"
            style={{
              height: 390,
              borderRadius: 18,
              backgroundImage: primaryImage ? `url(${primaryImage})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {!primaryImage && <span>✦</span>}
          </div>
          {listing.images && listing.images.length > 1 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                gap: 10,
                marginTop: 12,
              }}
            >
              {listing.images.slice(1).map((img) => {
                const src = resolveImageUrl(img.url);
                return (
                  <img
                    key={img.url}
                    src={src}
                    alt={listing.title}
                    style={{
                      width: "100%",
                      height: 90,
                      objectFit: "cover",
                      borderRadius: 10,
                      border: "1px solid var(--line)",
                    }}
                  />
                );
              })}
            </div>
          )}
          <div style={{ padding: "28px 0" }}>
            <div className="eyebrow">
              {listing.category?.name ?? "Classified listing"}
            </div>
            <h1
              style={{
                fontFamily: "Plus Jakarta Sans",
                fontSize: "clamp(2rem, 5vw, 3.3rem)",
                letterSpacing: "-.06em",
                margin: "10px 0",
              }}
            >
              {listing.title}
            </h1>
            <p className="price" style={{ fontSize: "1.5rem" }}>
              ₹ {Number(listing.price).toLocaleString("en-IN")}
            </p>
            <p
              className="hero-copy"
              style={{ marginTop: 22, whiteSpace: "pre-wrap" }}
            >
              {listing.description}
            </p>
            <div
              className="listing-meta"
              style={{ justifyContent: "start", gap: 28, marginTop: 25 }}
            >
              <span>⌖ {listing.location?.city ?? "Nearby"}</span>
              <span>Seller: {listing.seller?.name ?? "Community seller"}</span>
            </div>
            <button className="button button-primary" style={{ marginTop: 28 }}>
              Contact seller
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
