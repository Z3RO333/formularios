'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

const links = [
  { href: '/solicitar', label: 'Solicitar' },
  { href: '/painel', label: 'Painel' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/comprovantes', label: 'Comprovantes' },
  { href: '/admin', label: 'Admin' }
];

export default function TopNav() {
  const pathname = usePathname();

  // Na tela de solicitação, não exibimos os links, apenas o toggle de tema
  if (pathname?.startsWith('/solicitar')) {
    return (
      <header className="top-nav">
        <div className="logo">Sistema de Pedidos</div>
        <div style={{ marginLeft: 'auto' }}>
          <ThemeToggle />
        </div>
      </header>
    );
  }

  return (
    <header className="top-nav">
      <div className="logo">Sistema de Pedidos</div>
      <nav>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-link ${pathname?.startsWith(link.href) ? 'active' : ''}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <ThemeToggle />
    </header>
  );
}
