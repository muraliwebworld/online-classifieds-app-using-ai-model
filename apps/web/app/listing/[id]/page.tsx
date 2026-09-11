import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getListing } from '../../../lib/api';

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const listing = await getListing((await params).id);
  if (!listing) notFound();
  return <main className="site-shell"><div className="container"><header className="header"><Link href="/" className="brand"><span className="brand-mark">✦</span>videxpulse<span style={{ color: 'var(--brand)' }}>.</span></Link><Link href="/search" className="text-link">← Back to search</Link></header><section className="section" style={{ paddingTop: 30, maxWidth: 900 }}><div className="listing-image orange" style={{ height: 390, borderRadius: 18, backgroundImage: listing.images?.[0]?.url ? `url(${listing.images[0].url})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>{!listing.images?.[0]?.url && <span>✦</span>}</div><div style={{ padding: '28px 0' }}><div className="eyebrow">{listing.category?.name ?? 'Classified listing'}</div><h1 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 'clamp(2rem, 5vw, 3.3rem)', letterSpacing: '-.06em', margin: '10px 0' }}>{listing.title}</h1><p className="price" style={{ fontSize: '1.5rem' }}>₹ {Number(listing.price).toLocaleString('en-IN')}</p><p className="hero-copy" style={{ marginTop: 22, whiteSpace: 'pre-wrap' }}>{listing.description}</p><div className="listing-meta" style={{ justifyContent: 'start', gap: 28, marginTop: 25 }}><span>⌖ {listing.location?.city ?? 'Nearby'}</span><span>Seller: {listing.seller?.name ?? 'Community seller'}</span></div><button className="button button-primary" style={{ marginTop: 28 }}>Contact seller</button></div></section></div></main>;
}
