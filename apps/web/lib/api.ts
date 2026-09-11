export type Listing = {
  id: string;
  title: string;
  description?: string;
  price: string | number;
  currency?: string;
  aiTags?: string[];
  images?: { url: string; sortOrder: number }[];
  category?: { name: string; slug: string };
  location?: { city: string; district?: string | null; state?: string | null };
  seller?: { id: string; name: string };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

export async function searchListings(query: string): Promise<Listing[]> {
  if (!query.trim()) return [];
  const response = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(query)}`, { cache: 'no-store' });
  if (!response.ok) return [];
  const data = await response.json() as { listings?: Listing[] };
  return data.listings ?? [];
}

export async function getListing(id: string): Promise<Listing | null> {
  const response = await fetch(`${API_URL}/api/listings/${encodeURIComponent(id)}`, { next: { revalidate: 30 } });
  if (!response.ok) return null;
  const data = await response.json() as { listing?: Listing };
  return data.listing ?? null;
}
