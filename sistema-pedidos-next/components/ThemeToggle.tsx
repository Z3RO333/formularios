'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem('theme') as Theme | null;
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const initial = getInitialTheme();
    applyTheme(initial);
  }, []);

  function applyTheme(next: Theme) {
    setTheme(next);
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = next;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('theme', next);
    }
  }

  const toggle = () => applyTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Alternar tema"
      className="theme-toggle"
    >
      {theme === 'dark' ? '🌙 Escuro' : '☀️ Claro'}
    </button>
  );
}
