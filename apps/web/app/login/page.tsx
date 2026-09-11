'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function LoginPage() {
  const [message, setMessage] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) }); const data = await response.json(); if (response.ok) { localStorage.setItem('accessToken', data.accessToken); window.location.href = '/post'; } else setMessage(data.error ?? 'Unable to sign in'); }
  return <main className="site-shell"><div className="container"><header className="header"><Link href="/" className="brand"><span className="brand-mark">✦</span>videxpulse<span style={{ color: 'var(--brand)' }}>.</span></Link></header><section className="section" style={{ maxWidth: 460, margin: '50px auto' }}><div className="eyebrow">Welcome back</div><h1 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '2.5rem', letterSpacing: '-.06em' }}>Sign in</h1><form onSubmit={submit} style={{ display: 'grid', gap: 15, marginTop: 25 }}><input className="search-input" name="email" type="email" required placeholder="Email address" style={{ border: '1px solid var(--line)', borderRadius: 12 }} /><input className="search-input" name="password" type="password" required placeholder="Password" style={{ border: '1px solid var(--line)', borderRadius: 12 }} /><button className="button button-primary" type="submit">Sign in</button>{message && <p style={{ color: 'var(--brand-dark)' }}>{message}</p>}</form></section></div></main>;
}
