import React from 'react';
import { Camera, FolderOpen, Scissors } from './Icons';
import type { VideoAsset } from '../types/editor';
import { formatTimecode } from '../utils/audioEngine';
import { PWAInstallButton } from './PWAInstallButton';

interface TopBarProps {
  asset: VideoAsset | null;
  editedDuration: number;
  activeCutCount: number;
  onTriggerUpload: () => void;
  onTriggerRecord: () => void;
  onJumpToExport: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  asset,
  editedDuration,
  activeCutCount,
  onTriggerUpload,
  onTriggerRecord,
  onJumpToExport,
}) => {
  return (
    <header className="sticky top-0 z-30 flex h-[52px] w-full max-w-full items-center justify-between gap-2 border-b border-zinc-800/90 bg-[#09090B]/95 px-2.5 backdrop-blur-md sm:gap-4 sm:px-4 lg:px-6">
      {/* Zone 1: Single-line brand mark */}
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
        <Scissors className="h-4 w-4 shrink-0 text-[#FF453A]" aria-hidden="true" />
        <span className="font-display truncate text-sm font-bold tracking-tight text-white sm:text-base">
          CutFlow Studio
        </span>
      </div>

      {/* Zone 2: Quiet unboxed metadata on desktop / tablet */}
      {asset ? (
        <div className="hidden md:flex items-center gap-2.5 text-xs text-zinc-400 font-mono tabular-nums truncate">
          <span className="truncate max-w-[200px] text-zinc-300 font-sans">{asset.fileName}</span>
          <span aria-hidden="true">·</span>
          <span>
            {asset.width}×{asset.height}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {formatTimecode(editedDuration)} / {formatTimecode(asset.duration)}
          </span>
          <span aria-hidden="true">·</span>
          <span>{activeCutCount} cortes</span>
        </div>
      ) : (
        <div className="hidden md:flex items-center gap-4 text-xs text-zinc-400 whitespace-nowrap">
          <span>Procesamiento local en dispositivo</span>
        </div>
      )}

      {/* Zone 3: Primary actions + PWA Install */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <PWAInstallButton />
        <button
          type="button"
          onClick={onTriggerRecord}
          aria-label="Grabar video"
          className="inline-flex min-h-[38px] sm:min-h-[40px] items-center gap-1.5 rounded-lg border border-zinc-800 bg-[#131316] px-2.5 py-1.5 text-[11px] sm:px-3 sm:text-xs font-medium text-zinc-100 transition hover:border-zinc-600 hover:text-white whitespace-nowrap shrink-0"
        >
          <Camera className="h-3.5 w-3.5 text-[#FF453A]" aria-hidden="true" />
          <span className={asset ? 'hidden sm:inline' : ''}>Grabar video</span>
          {asset && <span className="sm:hidden">Grabar</span>}
        </button>

        {asset ? (
          <>
            <button
              type="button"
              onClick={onTriggerUpload}
              className="inline-flex min-h-[38px] sm:min-h-[40px] items-center gap-1.5 rounded-lg border border-zinc-800 bg-[#131316] px-2.5 py-1.5 text-[11px] sm:px-3 sm:text-xs font-medium text-zinc-200 transition hover:border-zinc-600 hover:text-white whitespace-nowrap shrink-0"
            >
              <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Cambiar video</span>
              <span className="sm:hidden">Video</span>
            </button>
            <button
              type="button"
              onClick={onJumpToExport}
              className="inline-flex min-h-[38px] sm:min-h-[40px] items-center rounded-lg bg-[#FAFAFA] px-3 py-1.5 text-[11px] sm:px-3.5 sm:text-xs font-semibold text-[#09090B] transition hover:bg-zinc-200 whitespace-nowrap shrink-0"
            >
              Exportar
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onTriggerUpload}
            className="inline-flex min-h-[38px] sm:min-h-[40px] items-center rounded-lg bg-[#FAFAFA] px-2.5 py-1.5 text-[11px] sm:px-3.5 sm:text-xs font-semibold text-[#09090B] transition hover:bg-zinc-200 whitespace-nowrap shrink-0"
          >
            <span className="hidden sm:inline">Subir video</span>
            <span className="sm:hidden">Subir</span>
          </button>
        )}
      </div>
    </header>
  );
};
