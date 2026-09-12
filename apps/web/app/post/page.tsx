'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
type Option = { id: string; name?: string; slug?: string; city?: string; state?: string | null };

export default function PostPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Option[]>([]);
  const [locations, setLocations] = useState<Option[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  useEffect(() => {
    if (!localStorage.getItem('accessToken')) {
      router.replace('/login?next=/post');
      return;
    }
    setCheckingAuth(false);
    void Promise.all([fetch(`${API_URL}/api/catalog/categories`).then((r) => r.json()), fetch(`${API_URL}/api/catalog/locations`).then((r) => r.json())]).then(([c, l]) => { setCategories(c.categories ?? []); setLocations(l.locations ?? []); });
  }, [router]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    const form = new FormData(event.currentTarget);
    const token = localStorage.getItem('accessToken');
    if (!token) { setMessage('Please sign in before posting an ad.'); setBusy(false); return; }
    let recaptchaToken: string | undefined; const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY; if (siteKey && window.grecaptcha) recaptchaToken = await new Promise<string>((resolve, reject) => window.grecaptcha!.ready(() => window.grecaptcha!.execute(siteKey, { action: 'create_listing' }).then(resolve).catch(reject)));
    const response = await fetch(`${API_URL}/api/listings`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ title: form.get('title'), description: form.get('description'), price: form.get('price'), currency: 'INR', categoryId: form.get('categoryId'), locationId: form.get('locationId'), imageUrls: [], recaptchaToken }) });
    const data = await response.json(); setMessage(response.ok ? 'Your ad is being reviewed by AI and will go live shortly.' : (data.error ?? 'Unable to submit listing.')); setBusy(false); if (response.ok) (event.target as HTMLFormElement).reset();
  }
  if (checkingAuth) return <main className="site-shell"><div className="container"><section className="section" style={{ maxWidth: 700, paddingTop: 80 }}><p className="hero-copy">Checking your account…</p></section></div></main>;
  return <main className="site-shell"><div className="container"><header className="header"><Link href="/" className="brand"><span className="brand-mark">✦</span>videxpulse<span style={{ color: 'var(--brand)' }}>.</span></Link><Link href="/" className="text-link">Cancel</Link></header><section className="section" style={{ maxWidth: 700, paddingTop: 35 }}><div className="eyebrow">Share with your community</div><h1 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 'clamp(2rem, 5vw, 3.5rem)', letterSpacing: '-.06em', margin: '10px 0' }}>Post an ad</h1><p className="hero-copy">Write naturally. Our AI will clean up your description, suggest tags, and help buyers find it.</p><form onSubmit={submit} style={{ display: 'grid', gap: 16, marginTop: 30 }}><label>Title<input className="search-input" name="title" required minLength={5} maxLength={160} placeholder="e.g. Solid wood dining table" /></label><label>Description<textarea className="search-input" name="description" required minLength={20} rows={6} placeholder="Tell buyers about condition, details, and what makes it useful." style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 12, marginTop: 7 }} /></label><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}><label>Price (₹)<input className="search-input" name="price" type="number" min="0" required placeholder="15000" style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 12, marginTop: 7 }} /></label><label>Category<select className="search-input" name="categoryId" required style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 12, marginTop: 7 }}>{categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label></div><label>Location<select className="search-input" name="locationId" required style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 12, marginTop: 7 }}>{locations.map((item) => <option value={item.id} key={item.id}>{item.city}, {item.state}</option>)}</select></label><button className="button button-primary" disabled={busy} type="submit">{busy ? 'Submitting…' : 'Submit for review →'}</button>{message && <p style={{ color: message.startsWith('Your') ? '#3e7650' : 'var(--brand-dark)' }}>{message}</p>}</form></section></div></main>;
}
