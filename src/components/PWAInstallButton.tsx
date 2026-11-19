import React, { useState } from 'react';
import { Download, Smartphone, X } from './Icons';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useI18n } from '../i18n/I18nContext';
import { gtmProps, trackEvent } from '../utils/analytics';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { t } = useI18n();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={async () => {
          trackEvent('pwa_install_click', { platform: 'prompt' });
          const accepted = await install();
          trackEvent('pwa_install_result', { accepted });
        }}
        {...gtmProps('pwa_install_prompt', 'pwa', 'install_app')}
        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-white sm:min-h-[40px] sm:gap-2 sm:px-3"
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">{t.pwa.installApp}</span>
        <span className="sm:hidden">{t.pwa.installShort}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            setShowGuide(true);
            trackEvent('pwa_install_guide_open', { platform: 'ios' });
          }}
          {...gtmProps('pwa_install_ios_guide', 'pwa', 'ios')}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-100 transition hover:border-zinc-500 whitespace-nowrap shrink-0"
        >
          <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t.pwa.installShort}</span>
        </button>

        {showGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-[#131316] p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">{t.pwa.iosModalTitle}</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowGuide(false);
                    trackEvent('pwa_install_guide_close', { via: 'close_icon' });
                  }}
                  {...gtmProps('pwa_install_ios_close_icon', 'pwa', 'ios')}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  aria-label={t.pwa.close}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                {t.pwa.iosStep1Prefix}
                <strong className="text-white">{t.pwa.iosStep1Bold}</strong>
                {t.pwa.iosStep1Suffix}
                <br />
                {t.pwa.iosStep2Prefix}
                <strong className="text-white">{t.pwa.iosStep2Bold}</strong>
                {t.pwa.iosStep2Suffix}
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowGuide(false);
                  trackEvent('pwa_install_guide_close', { via: 'confirm_button' });
                }}
                {...gtmProps('pwa_install_ios_confirm', 'pwa', 'ios')}
                className="mt-5 w-full min-h-[44px] rounded-xl bg-white py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
              >
                {t.pwa.understood}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
