import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { useThemeStore } from './store/theme.store';
import { useSettings } from './hooks/useSettings';
import './styles/global.css';

// Dev-only: unregister any leftover service worker so `pnpm dev`
// never serves a stale bundle. Production keeps PWA.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
  if ('caches' in window) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  }
}

// Apply saved theme before first paint
useThemeStore.getState().setTheme(useThemeStore.getState().theme);

// Load platform settings on boot (app name, favicon, maintenance, etc.)
useSettings.getState().load().then(() => {
  const state = useSettings.getState();
  const appName = state.get('general.app_name', 'Dating App');
  if (appName) document.title = appName;

  // Inject dynamic favicon if uploaded
  const faviconUrl = state.get('general.favicon_url', null);
  if (faviconUrl) {
    const existing = document.querySelector('link[rel="icon"]');
    if (existing) {
      existing.setAttribute('href', faviconUrl);
    } else {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = faviconUrl;
      document.head.appendChild(link);
    }
  }

  // Inject apple-touch-icon if logo is uploaded
  const logoUrl = state.get('general.logo_url', null);
  if (logoUrl) {
    const existing = document.querySelector('link[rel="apple-touch-icon"]');
    if (existing) {
      existing.setAttribute('href', logoUrl);
    } else {
      const link = document.createElement('link');
      link.rel = 'apple-touch-icon';
      link.href = logoUrl;
      document.head.appendChild(link);
    }
  }

  // Write logo URL to Cache API so the service worker can read it for push notifications
  try {
    caches.open('app-settings').then((cache) => {
      cache.put('/__logo_url', new Response(logoUrl || '', {
        headers: { 'Content-Type': 'text/plain' },
      }));
    });
  } catch {
    // Cache API not available (rare) — SW will fall back to default icon
  }
});



// KILL ALL FOCUS OUTLINES APP-WIDE
const style = document.createElement('style');
style.innerHTML = `
  *:focus, *:focus-visible, *:focus-within, *:active {
    outline: none !important;
    outline-width: 0 !important;
    outline-style: none !important;
    outline-color: transparent !important;
    box-shadow: none !important;
    -webkit-tap-highlight-color: transparent !important;
  }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('root') !).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
