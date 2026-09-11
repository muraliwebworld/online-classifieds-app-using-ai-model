import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VidexPulse Classifieds',
  description: 'Find useful things nearby with natural-language AI search.',
  metadataBase: new URL('https://classifieds.videxpulse.com')
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
