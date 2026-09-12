import type { Metadata } from 'next';
import './globals.css';
import RecaptchaScript from '../components/RecaptchaScript';

export const metadata: Metadata = {
  title: 'VidexPulse Classifieds',
  description: 'Find useful things nearby with natural-language AI search.',
  metadataBase: new URL('https://classifieds.videxpulse.com')
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><RecaptchaScript />{children}</body>
    </html>
  );
}
