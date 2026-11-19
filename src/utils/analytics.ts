declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const DEFAULT_GA_MEASUREMENT_ID = 'G-7F5B63975M';

const envId = (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined)?.trim() || '';

export const GA_MEASUREMENT_ID =
  envId && envId !== 'G-XXXXXXXXXX' && /^G-[A-Z0-9]+$/i.test(envId)
    ? envId
    : DEFAULT_GA_MEASUREMENT_ID;

export type AnalyticsParams = Record<string, string | number | boolean>;

let initialized = false;

function ensureGtagFunction(): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function () {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
  }
}

export function initAnalytics(): void {
  if (initialized || !GA_MEASUREMENT_ID || typeof window === 'undefined') {
    return;
  }
  initialized = true;

  ensureGtagFunction();

  // Always ensure the GA4 gtag.js loader script is present for the active Measurement ID
  const existingGtagScript = document.querySelector(
    `script[src*="googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`
  );

  if (!existingGtagScript) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
      GA_MEASUREMENT_ID
    )}`;
    document.head.appendChild(script);

    // Configure dynamically injected Measurement ID (index.html already configures DEFAULT_GA_MEASUREMENT_ID)
    window.gtag?.('config', GA_MEASUREMENT_ID, {
      send_page_view: true,
      anonymize_ip: true,
    });
  }

  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

  setUserProperties({
    display_mode: isStandalone ? 'standalone' : 'browser',
    pwa_installed: isStandalone,
    online_status: navigator.onLine ? 'online' : 'offline',
  });

  window.addEventListener('online', () => {
    setUserProperties({ online_status: 'online' });
    trackEvent('connection_status_change', { status: 'online' });
  });

  window.addEventListener('offline', () => {
    setUserProperties({ online_status: 'offline' });
    trackEvent('connection_status_change', { status: 'offline' });
  });

  window.addEventListener('appinstalled', () => {
    setUserProperties({ pwa_installed: true });
    trackEvent('pwa_app_installed');
  });

  window.addEventListener('error', (event) => {
    const desc = event.message || 'Unhandled window error';
    trackException(desc, false);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const desc =
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : 'Unhandled promise rejection';
    trackException(desc, false);
  });
}

export function setUserProperties(props: AnalyticsParams): void {
  if (typeof window === 'undefined') return;
  ensureGtagFunction();
  window.gtag?.('set', 'user_properties', props);
}

export function trackPageView(
  pagePath: string,
  pageTitle: string,
  extra?: AnalyticsParams
): void {
  if (typeof window === 'undefined') return;
  ensureGtagFunction();

  const normalizedPath = pagePath.startsWith('/') ? pagePath : `/${pagePath}`;
  const pageLocation = `${window.location.origin}${normalizedPath}`;

  window.dataLayer.push({
    event: 'virtual_page_view',
    page_path: normalizedPath,
    page_title: pageTitle,
    page_location: pageLocation,
    ...(extra || {}),
  });

  window.gtag?.('event', 'page_view', {
    send_to: GA_MEASUREMENT_ID,
    page_path: normalizedPath,
    page_title: pageTitle,
    page_location: pageLocation,
    ...(extra || {}),
  });
}

export function trackException(description: string, fatal = false): void {
  if (typeof window === 'undefined') return;
  ensureGtagFunction();
  const safeDesc = description.slice(0, 140);

  window.dataLayer.push({
    event: 'app_exception',
    description: safeDesc,
    fatal,
  });

  window.gtag?.('event', 'exception', {
    send_to: GA_MEASUREMENT_ID,
    description: safeDesc,
    fatal,
  });
}

export function trackEvent(eventName: string, params?: AnalyticsParams): void {
  if (typeof window === 'undefined') return;
  ensureGtagFunction();

  window.dataLayer.push({
    event: eventName,
    ...(params || {}),
  });

  window.gtag?.('event', eventName, {
    ...(params || {}),
    send_to: GA_MEASUREMENT_ID,
  });
}

export function gtmProps(
  tag: string,
  category: string,
  label?: string
): {
  'data-gtm-tag': string;
  'data-gtm-category': string;
  'data-gtm-label'?: string;
} {
  return {
    'data-gtm-tag': tag,
    'data-gtm-category': category,
    ...(label !== undefined ? { 'data-gtm-label': label } : {}),
  };
}
