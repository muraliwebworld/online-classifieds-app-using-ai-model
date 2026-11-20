import { getCategories } from "../lib/api";

const categoryIcons: Record<string, string> = {
  homes: "⌂",
  electronics: "▣",
  vehicles: "◉",
  furniture: "◇",
  services: "♧",
  jobs: "◈",
};

function formatListingCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k listings`;
  }
  return `${count} ${count === 1 ? "listing" : "listings"}`;
}

export default async function CategoryNav() {
  const categories = await getCategories();

  return (
    <div className="category-grid">
      {categories.map((category) => (
        <a
          href={`/search?q=${encodeURIComponent(category.name)}`}
          className="category"
          key={category.id}
        >
          <div className="category-icon">
            {categoryIcons[category.slug] ?? "✦"}
          </div>
          <strong>{category.name}</strong>
          <small>{formatListingCount(category.publishedCount ?? 0)}</small>
        </a>
      ))}
      <a href="/search" className="category">
        <div className="category-icon">＋</div>
        <strong>More</strong>
        <small>Explore all</small>
      </a>
    </div>
  );
}
