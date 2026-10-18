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
});

ReactDOM.createRoot(document.getElementById('root') !).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
