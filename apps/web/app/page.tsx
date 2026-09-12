import Link from 'next/link';
import CategoryNav from '../components/CategoryNav';
import ListingCard from '../components/ListingCard';
import SearchBox from '../components/SearchBox';
import AccountMenu from '../components/AccountMenu';
import { searchListings } from '../lib/api';

export default async function HomePage() {
  const listings = await searchListings('');

  return (
    <main className="site-shell">
      <div className="container">
        <header className="header">
          <Link href="/" className="brand"><span className="brand-mark">✦</span>videxpulse<span style={{ color: 'var(--brand)' }}>.</span></Link>
          <AccountMenu />
        </header>
        <section className="hero">
          <div className="eyebrow">The smarter local marketplace</div>
          <h1>Find what you need.<br /><span>Sell what you don’t.</span></h1>
          <p className="hero-copy">Describe what you’re looking for in your own words. Our intelligent search connects you with great finds from people nearby.</p>
          <SearchBox />
          <p className="hero-note">✦ Powered by intelligent search · Discover more with less scrolling</p>
        </section>
        <section className="section"><div className="section-heading"><div><h2>Explore by category</h2><p>Start with what you’re looking for today</p></div></div><CategoryNav /></section>
        <section className="section"><div className="section-heading"><div><h2>Fresh finds near you</h2><p>Recently posted by your community</p></div><Link className="text-link" href="/search">View all listings →</Link></div><div className="listing-grid">{listings.length ? listings.slice(0, 8).map((listing, index) => <ListingCard key={listing.id} listing={listing} index={index} />) : <div className="empty-state"><strong>Listings are coming soon</strong><br />Search for something specific or be the first to post an ad.</div>}</div></section>
      </div>
      <footer className="footer"><div className="container">© 2026 VidexPulse Classifieds · Built for local discovery</div></footer>
    </main>
  );
}
