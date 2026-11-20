import Link from "next/link";
import { getCategories } from "../lib/api";

export default async function CategoryStrip({
  activeCategory,
}: {
  activeCategory?: string;
}) {
  const categories = await getCategories();
  if (!categories.length) return null;
  const activeLower = activeCategory?.trim().toLowerCase() ?? "";

  return (
    <nav
      aria-label="Browse categories"
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        padding: "10px 0 6px",
      }}
    >
      <Link
        href="/search"
        className={`button ${!activeLower ? "button-primary" : "button-light"}`}
        style={{ padding: "7px 14px", fontSize: "0.88rem" }}
      >
        All categories
      </Link>
      {categories.map((cat) => {
        const isActive =
          activeLower === cat.name.toLowerCase() ||
          activeLower === cat.slug.toLowerCase();
        return (
          <Link
            key={cat.id}
            href={`/search?q=${encodeURIComponent(cat.name)}`}
            className={`button ${isActive ? "button-primary" : "button-light"}`}
            style={{ padding: "7px 14px", fontSize: "0.88rem" }}
          >
            {cat.name}
          </Link>
        );
      })}
    </nav>
  );
}
