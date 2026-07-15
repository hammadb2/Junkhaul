'use client';

import { useEffect } from 'react';

// The track page uses the site's default light theme.
// No dark-mode override — brand rule is light backgrounds only.
export default function TrackLayout({ children }) {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const root = document.documentElement;
    // Ensure any lingering dark theme is removed.
    const prevTheme = root.getAttribute('data-theme');
    if (prevTheme === 'dark') root.removeAttribute('data-theme');
    return () => {
      if (prevTheme === 'dark') root.setAttribute('data-theme', prevTheme);
    };
  }, []);

  return <>{children}</>;
}
