import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { useThemeStore } from './store/theme.store';
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

ReactDOM.createRoot(document.getElementById('root') !).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);