import type { ReactNode } from 'react';

export const metadata = {
  title: 'Railway container console',
  description: 'Spins one Railway container up and down.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
