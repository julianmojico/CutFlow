declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const DEFAULT_GA_MEASUREMENT_ID = 'G-7F5B63975M';
const envId = (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined)?.trim() || '';
const GA_MEASUREMENT_ID =
  envId && envId !== 'G-XXXXXXXXXX' && /^G-[A-Z0-9]+$/i.test(envId)
    ? envId
    : DEFAULT_GA_MEASUREMENT_ID;

let initialized = false;

export function initAnalytics(): void {
  if (initialized || !GA_MEASUREMENT_ID || typeof window === 'undefined') {
    return;
  }
  initialized = true;

  window.dataLayer = window.dataLayer || [];
  const hasGtmTag = Boolean(
    document.querySelector('script[src*="googletagmanager.com/gtm.js"]')
  );

  if (typeof window.gtag !== 'function') {
    window.gtag = function () {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
  }

  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: true,
  });

  if (!hasGtmTag) {
    const existing = document.querySelector(
      `script[src*="googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`
    );
    if (!existing) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
        GA_MEASUREMENT_ID
      )}`;
      document.head.appendChild(script);
    }
  }
}

export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
}
