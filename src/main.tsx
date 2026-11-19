import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { I18nProvider } from './i18n/I18nContext';
import './index.css';
import { initAnalytics } from './utils/analytics';

initAnalytics();

if (typeof window !== 'undefined') {
  if ('caches' in window) {
    void caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      void navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <I18nProvider>
    <App />
  </I18nProvider>
);
