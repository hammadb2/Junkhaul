'use client';

import { useEffect } from 'react';

// The track page is intentionally dark-themed (customer tracking link).
// Force dark mode so the dark-card/glass-bar classes render correctly.
export default function TrackLayout({ children }) {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const root = document.documentElement;
    const prevTheme = root.getAttribute('data-theme');
    root.setAttribute('data-theme', 'dark');
    return () => {
      if (prevTheme === null) root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', prevTheme);
    };
  }, []);

  return <>{children}</>;
}
