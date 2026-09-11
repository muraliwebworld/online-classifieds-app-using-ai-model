'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SearchBox({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/search?q=${encodeURIComponent(value)}` : '/');
  }

  return (
    <form className="search-panel" onSubmit={submit}>
      <span className="search-icon" aria-hidden="true">⌕</span>
      <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “a comfortable sofa under ₹20,000”" aria-label="Search listings" />
      <button className="button button-primary" type="submit">Search with AI</button>
    </form>
  );
}
