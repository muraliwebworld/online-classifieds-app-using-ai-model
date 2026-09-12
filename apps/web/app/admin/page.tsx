'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
type Tab = 'users' | 'listings' | 'categories' | 'plans' | 'theme';

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('users');
  const [data, setData] = useState<any>({});
  const [error, setError] = useState('');
  useEffect(() => { const token = localStorage.getItem('accessToken'); if (!token) { window.location.href = '/login?next=/admin'; return; } const endpoint = tab === 'users' ? 'users' : tab === 'listings' ? 'listings' : tab === 'categories' ? 'categories' : tab === 'plans' ? 'plans' : 'theme'; fetch(`${API}/api/admin/${endpoint}`, { headers: { authorization: `Bearer ${token}` } }).then(async (r) => { if (!r.ok) throw new Error((await r.json()).error ?? 'Access denied'); return r.json(); }).then(setData).catch((e) => setError(e.message)); }, [tab]);
  const rows = data[tab] ?? [];
  return <main className="site-shell"><div className="container"><header className="header"><Link href="/" className="brand"><span className="brand-mark">✦</span>videxpulse<span style={{ color: 'var(--brand)' }}>.</span></Link><span className="eyebrow">Admin console</span></header><section className="section"><div className="section-heading"><div><div className="eyebrow">Operations</div><h1 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '2.5rem', letterSpacing: '-.06em', margin: '8px 0' }}>Marketplace control</h1><p>Manage trust, content, plans, and the marketplace theme.</p></div></div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>{(['users', 'listings', 'categories', 'plans', 'theme'] as Tab[]).map((item) => <button key={item} className={`button ${tab === item ? 'button-primary' : 'button-light'}`} onClick={() => { setTab(item); setError(''); }}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div>{error ? <div className="empty-state">{error}</div> : <div style={{ overflowX: 'auto', background: 'white', border: '1px solid var(--line)', borderRadius: 15 }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650 }}><thead><tr>{Object.keys(rows[0] ?? { id: 'ID', name: 'Name', status: 'Status', createdAt: 'Created' }).map((key) => <th key={key} style={{ padding: 14, textAlign: 'left', borderBottom: '1px solid var(--line)', color: 'var(--muted)', fontSize: '.75rem' }}>{key}</th>)}</tr></thead><tbody>{rows.map((row: any, index: number) => <tr key={row.id ?? row.key ?? index}>{Object.entries(row).slice(0, 8).map(([key, value]) => <td key={key} style={{ padding: 14, borderBottom: '1px solid var(--line)', fontSize: '.8rem', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—')}</td>)}</tr>)}</tbody></table>{!rows.length && <div className="empty-state">No {tab} found.</div>}</div>}</section></div></main>;
}
