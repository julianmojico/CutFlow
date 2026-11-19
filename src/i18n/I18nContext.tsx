import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { setUserProperties, trackEvent } from '../utils/analytics';
import {
  detectBrowserLanguage,
  SUPPORTED_LANGUAGES,
  TRANSLATIONS,
  type TranslationDictionary,
  type UILanguage,
} from './translations';

interface I18nContextValue {
  language: UILanguage;
  setLanguage: (next: UILanguage) => void;
  t: TranslationDictionary;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function updateMetaTag(attr: 'name' | 'property', key: string, content: string): void {
  const el = document.querySelector(`meta[${attr}="${key}"]`);
  if (el) {
    el.setAttribute('content', content);
  }
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<UILanguage>(() => detectBrowserLanguage());
  const detectedLoggedRef = useRef(false);

  useEffect(() => {
    if (!detectedLoggedRef.current && typeof window !== 'undefined') {
      detectedLoggedRef.current = true;
      trackEvent('ui_language_detected', {
        language,
        browser_language: navigator.language || 'unknown',
      });
    }
  }, [language]);

  useEffect(() => {
    setUserProperties({ ui_language: language });
    if (typeof document === 'undefined') return;
    const dict = TRANSLATIONS[language];
    const langMeta = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

    document.documentElement.lang = language;
    document.title = dict.seo.title;

    updateMetaTag('name', 'description', dict.seo.description);
    updateMetaTag('property', 'og:title', dict.seo.title);
    updateMetaTag('property', 'og:description', dict.seo.description);
    updateMetaTag('property', 'og:locale', langMeta.ogLocale);
    updateMetaTag('property', 'og:image:alt', dict.seo.ogImageAlt);
    updateMetaTag('name', 'twitter:title', dict.seo.title);
    updateMetaTag('name', 'twitter:description', dict.seo.description);
    updateMetaTag('name', 'twitter:image:alt', dict.seo.ogImageAlt);

    const canonicalUrl = `${window.location.origin}${window.location.pathname}`;
    const canonicalEl = document.querySelector('link[rel="canonical"]');
    if (canonicalEl) {
      canonicalEl.setAttribute('href', canonicalUrl);
    }
    updateMetaTag('property', 'og:url', canonicalUrl);
    updateMetaTag('name', 'twitter:url', canonicalUrl);
  }, [language]);

  const setLanguage = useCallback(
    (next: UILanguage) => {
      if (next === language) return;
      trackEvent('ui_language_change', {
        from_language: language,
        to_language: next,
      });
      setLanguageState(next);
    },
    [language]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t: TRANSLATIONS[language],
    }),
    [language, setLanguage]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}
