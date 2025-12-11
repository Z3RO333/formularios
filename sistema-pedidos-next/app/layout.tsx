import './globals.css';
import { ReactNode } from 'react';
import ToastProvider from '@/components/ToastProvider';

export const metadata = {
  title: 'Sistema de Pedidos',
  description: 'Sistema de gestão de pedidos e aprovações'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <ToastProvider />
        <main className="container">
          {children}
        </main>
      </body>
    </html>
  );
}
