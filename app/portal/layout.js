'use client';

import { useEffect } from 'react';

// Force light mode for the entire crew portal.
// This prevents dark-mode CSS variables from making light text invisible
// when the user's phone is in dark mode.
export default function PortalLayout({ children }) {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const root = document.documentElement;
    const prevTheme = root.getAttribute('data-theme');
    root.setAttribute('data-theme', 'light');
    return () => {
      if (prevTheme === null) root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', prevTheme);
    };
  }, []);

  return <>{children}</>;
}
