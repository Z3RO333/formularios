import './globals.css';
import { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
