import Link from 'next/link';
import ListingCard from '../../components/ListingCard';
import SearchBox from '../../components/SearchBox';
import { searchListings } from '../../lib/api';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = (await searchParams).q ?? '';
  const listings = await searchListings(query);
  return <main className="site-shell"><div className="container"><header className="header"><Link href="/" className="brand"><span className="brand-mark">✦</span>videxpulse<span style={{ color: 'var(--brand)' }}>.</span></Link><nav className="nav"><Link href="/">Home</Link><Link href="/post" className="button button-primary">Post an ad ＋</Link></nav></header><section className="section" style={{ paddingTop: 38 }}><div className="section-heading"><div><div className="eyebrow">AI-powered results</div><h2 style={{ marginTop: 8 }}>{query ? `Results for “${query}”` : 'Browse local listings'}</h2><p>{listings.length ? `${listings.length} relevant listings found` : 'Describe what you want to find.'}</p></div></div><SearchBox initialQuery={query} /><div className="listing-grid" style={{ marginTop: 28 }}>{listings.length ? listings.map((listing, index) => <ListingCard key={listing.id} listing={listing} index={index} />) : <div className="empty-state">No matching listings found. Try a broader description, category, or location.</div>}</div></section></div></main>;
}
