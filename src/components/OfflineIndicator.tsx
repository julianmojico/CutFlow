import React from 'react';
import { WifiOff } from './Icons';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useI18n } from '../i18n/I18nContext';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { t } = useI18n();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 left-4 z-40 flex items-center gap-2 rounded-lg border border-zinc-700 bg-[#131316] px-3 py-2 text-xs font-medium text-zinc-200 shadow-lg lg:bottom-4"
    >
      <WifiOff className="h-3.5 w-3.5 text-[#FF453A]" aria-hidden="true" />
      <span>{t.offline.status}</span>
    </div>
  );
};
