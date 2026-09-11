import Link from 'next/link';
import type { Listing } from '../lib/api';

const tones = ['orange', 'blue', 'green', ''];

export default function ListingCard({ listing, index = 0 }: { listing: Listing; index?: number }) {
  const image = listing.images?.[0]?.url;
  const price = Number(listing.price).toLocaleString('en-IN');
  return (
    <Link className="listing-card" href={`/listing/${listing.id}`}>
      <div className={`listing-image ${tones[index % tones.length]}`} style={image ? { backgroundImage: `url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
        {!image && <span aria-hidden="true">✦</span>}
        <span className="badge">{listing.category?.name ?? 'Classified'}</span>
        <button className="heart" type="button" aria-label="Save listing" onClick={(event) => event.preventDefault()}>♡</button>
      </div>
      <div className="listing-content">
        <h3>{listing.title}</h3>
        <p className="price">{listing.currency === 'INR' || !listing.currency ? '₹' : listing.currency} {price}</p>
        <div className="listing-meta"><span>⌖ {listing.location?.city ?? 'Nearby'}</span><span>New today</span></div>
        {!!listing.aiTags?.length && <div className="listing-tags">{listing.aiTags.slice(0, 3).map((tag) => <span className="tag" key={tag}>#{tag}</span>)}</div>}
      </div>
    </Link>
  );
}
