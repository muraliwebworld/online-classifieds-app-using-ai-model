const categories = [
  ["⌂", "Homes", "1.2k listings"],
  ["▣", "Electronics", "860 listings"],
  ["◉", "Vehicles", "540 listings"],
  ["◇", "Furniture", "430 listings"],
  ["♧", "Services", "290 listings"],
  ["＋", "More", "Explore all"],
];

export default function CategoryNav() {
  return (
    <div className="category-grid">
      {categories.map(([icon, name, count]) => (
        <a
          href={`/search?q=${encodeURIComponent(name)}`}
          className="category"
          key={name}
        >
          <div className="category-icon">{icon}</div>
          <strong>{name}</strong>
          <small>{count}</small>
        </a>
      ))}
    </div>
  );
}
