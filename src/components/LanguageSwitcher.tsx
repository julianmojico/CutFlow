import React, { useEffect, useRef, useState } from 'react';
import { Check, Globe } from './Icons';
import { useI18n } from '../i18n/I18nContext';
import { SUPPORTED_LANGUAGES } from '../i18n/translations';
import { gtmProps, trackEvent } from '../utils/analytics';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage, t } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const current = SUPPORTED_LANGUAGES.find((item) => item.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => {
          const nextOpen = !open;
          setOpen(nextOpen);
          trackEvent('ui_language_menu_toggle', { open: nextOpen, current_language: language });
        }}
        {...gtmProps('topbar_language_switcher', 'i18n', current.shortLabel)}
        aria-label={t.languageSwitcher.ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex min-h-[38px] sm:min-h-[40px] items-center gap-1.5 rounded-lg border border-zinc-800 bg-[#131316] px-2.5 py-1.5 text-[11px] sm:px-3 sm:text-xs font-medium text-zinc-200 transition hover:border-zinc-600 hover:text-white whitespace-nowrap shrink-0"
      >
        <Globe className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
        <span className="font-mono uppercase">{current.shortLabel}</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t.languageSwitcher.menuLabel}
          className="absolute right-0 mt-1.5 w-36 overflow-hidden rounded-xl border border-zinc-800 bg-[#131316] p-1 shadow-2xl z-50"
        >
          {SUPPORTED_LANGUAGES.map((opt) => {
            const active = opt.code === language;
            return (
              <button
                key={opt.code}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setLanguage(opt.code);
                  setOpen(false);
                }}
                {...gtmProps(`topbar_language_select_${opt.code}`, 'i18n', opt.nativeName)}
                className={`flex min-h-[36px] w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition ${
                  active
                    ? 'bg-[#FAFAFA] text-[#09090B]'
                    : 'text-zinc-300 hover:bg-[#1C1C21] hover:text-white'
                }`}
              >
                <span>{opt.nativeName}</span>
                {active && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
