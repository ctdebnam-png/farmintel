import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FarmIntel — Area Farming Intelligence',
  description: 'Internal area farming intelligence for TD Realty Ohio',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
