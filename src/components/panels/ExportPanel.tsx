import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Blend, Check, Copy, Download, Film, FileText, X } from '../Icons';
import type {
  AspectRatioPreset,
  CutSegment,
  FitMode,
  SubtitleCue,
  SubtitleStyleConfig,
  VideoAsset,
  VideoEffectsConfig,
} from '../../types/editor';
import { useI18n } from '../../i18n/I18nContext';
import { gtmProps, trackEvent } from '../../utils/analytics';
import { formatBytes, formatTimecode, generateSrt, getEditedDuration } from '../../utils/audioEngine';
import { exportEditedVideo } from '../../utils/exportEngine';
import { getAspectOptions, resolveCanvasDimensions } from '../../utils/subtitleRenderer';

interface ExportPanelProps {
  asset: VideoAsset;
  cuts: CutSegment[];
  cues: SubtitleCue[];
  subtitleStyle: SubtitleStyleConfig;
  effects: VideoEffectsConfig;
  aspectRatio: AspectRatioPreset;
  nativeAspectLabel: string | null;
  fitMode: FitMode;
  onChangeAspectRatio: (preset: AspectRatioPreset) => void;
  onToggleFitMode: () => void;
  onToggleBlurBorders: () => void;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  asset,
  cuts,
  cues,
  subtitleStyle,
  effects,
  aspectRatio,
  nativeAspectLabel,
  fitMode,
  onChangeAspectRatio,
  onToggleFitMode,
  onToggleBlurBorders,
}) => {
  const { language, t } = useI18n();
  const [applyCutsToSrt, setApplyCutsToSrt] = useState(true);
  const [copiedSrt, setCopiedSrt] = useState(false);
  const [quality, setQuality] = useState<'original' | '1080p' | '720p'>('1080p');

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stageLabel, setStageLabel] = useState('');
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportedUrl, setExportedUrl] = useState<{
    url: string;
    fileName: string;
    size: number;
    duration: number;
  } | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!exportedUrl) return;
    const urlToRevoke = exportedUrl.url;
    const timer = window.setTimeout(() => {
      URL.revokeObjectURL(urlToRevoke);
      setExportedUrl((prev) => (prev?.url === urlToRevoke ? null : prev));
    }, 60 * 60 * 1000);

    return () => {
      window.clearTimeout(timer);
      URL.revokeObjectURL(urlToRevoke);
    };
  }, [exportedUrl]);

  useEffect(() => {
    setExportedUrl(null);
  }, [asset.url]);

  const srtContent = useMemo(
    () => generateSrt(cues, cuts, applyCutsToSrt),
    [applyCutsToSrt, cues, cuts]
  );

  const aspectOptions = useMemo(() => getAspectOptions(nativeAspectLabel), [nativeAspectLabel]);

  const targetDims = useMemo(
    () => resolveCanvasDimensions(aspectRatio, asset.width, asset.height, quality),
    [aspectRatio, asset.height, asset.width, quality]
  );

  const editedDuration = useMemo(
    () => getEditedDuration(asset.duration, cuts),
    [asset.duration, cuts]
  );

  const baseName = asset.fileName.replace(/\.[^/.]+$/, '') || 'cutflow-video';

  const handleDownloadSrt = () => {
    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}.srt`;
    a.click();
    trackEvent('export_srt', { cues_count: cues.length });
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleCopySrt = async () => {
    if (!srtContent) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(srtContent);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch {
      const ta = document.createElement('textarea');
      ta.value = srtContent;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedSrt(true);
    trackEvent('export_srt_copy', { cues_count: cues.length });
    setTimeout(() => setCopiedSrt(false), 1800);
  };

  const handleStartVideoExport = async () => {
    setExportError(null);
    if (exportedUrl) {
      URL.revokeObjectURL(exportedUrl.url);
      setExportedUrl(null);
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsExporting(true);
    setProgress(0);
    setStageLabel(t.exportPanel.preparingRender);
    trackEvent('export_mp4_start', {
      aspect_ratio: aspectRatio,
      quality,
      blur_borders: effects.blurBorders && fitMode === 'contain',
    });

    try {
      const result = await exportEditedVideo({
        asset,
        cuts,
        cues,
        subtitleStyle,
        effects,
        aspectRatio,
        fitMode,
        quality,
        lang: language,
        onProgress: (pct, label) => {
          setProgress(pct);
          setStageLabel(label);
        },
        signal: controller.signal,
      });

      const url = URL.createObjectURL(result.blob);
      const fileName = `${baseName}_${t.exportPanel.fileSuffix}.${result.extension}`;
      setExportedUrl({
        url,
        fileName,
        size: result.blob.size,
        duration: result.duration,
      });

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      trackEvent('export_mp4', {
        aspect_ratio: aspectRatio,
        quality,
        blur_borders: effects.blurBorders && fitMode === 'contain',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : t.exportPanel.exportErrorDefault;
      setExportError(msg);
      trackEvent('export_mp4_error', { message: msg.slice(0, 80) });
    } finally {
      setIsExporting(false);
      abortRef.current = null;
    }
  };

  const handleCancelExport = () => {
    trackEvent('export_mp4_cancel');
    abortRef.current?.abort();
  };

  return (
    <div className="space-y-5">
      {/* 1. Primary: Export MP4 Video with Burned-in Subtitles & Effects */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Film className="h-4 w-4 shrink-0 text-[#FF453A]" />
            <h2 className="font-display text-base font-semibold text-white">
              {t.exportPanel.title}
            </h2>
          </div>
          <span className="font-mono text-xs text-zinc-400 tabular-nums">
            {targetDims.width}×{targetDims.height} · {formatTimecode(editedDuration)}
          </span>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-medium text-zinc-300">{t.exportPanel.canvasFormat}</span>
          <div className="grid grid-cols-3 gap-1.5">
            {aspectOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  trackEvent('aspect_ratio_change', {
                    aspect_ratio: opt.value,
                    label: opt.label,
                    location: 'export',
                  });
                  onChangeAspectRatio(opt.value);
                }}
                {...gtmProps(`export_aspect_${opt.value}`, 'export', opt.label)}
                className={`min-h-[38px] rounded-lg border text-xs font-medium transition ${
                  aspectRatio === opt.value
                    ? 'border-white bg-white text-[#09090B]'
                    : 'border-zinc-800 bg-[#09090B] text-zinc-300 hover:border-zinc-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <span className="mb-1.5 block text-xs text-zinc-300">{t.exportPanel.resolution}</span>
            <select
              value={quality}
              onChange={(e) => {
                const nextQuality = e.target.value as 'original' | '1080p' | '720p';
                trackEvent('export_quality_change', { quality: nextQuality });
                setQuality(nextQuality);
              }}
              {...gtmProps('export_quality_select', 'export', quality)}
              className="min-h-[40px] w-full rounded-lg border border-zinc-800 bg-[#09090B] px-2.5 text-xs text-white"
            >
              <option value="1080p">{t.exportPanel.quality1080p}</option>
              <option value="720p">{t.exportPanel.quality720p}</option>
              <option value="original">{t.exportPanel.qualityNative}</option>
            </select>
          </div>
          <div className="min-w-0">
            <span className="mb-1.5 block text-xs text-zinc-300">{t.exportPanel.framing}</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  trackEvent('fit_mode_toggle', {
                    next_fit_mode: fitMode === 'contain' ? 'cover' : 'contain',
                    location: 'export',
                  });
                  onToggleFitMode();
                }}
                {...gtmProps('export_fit_mode', 'export', fitMode === 'contain' ? 'fit' : 'fill')}
                className="min-h-[40px] flex-1 rounded-lg border border-zinc-800 bg-[#09090B] px-2.5 text-xs font-medium text-zinc-200 hover:border-zinc-600 whitespace-nowrap"
              >
                {fitMode === 'contain' ? t.exportPanel.fit : t.exportPanel.fill}
              </button>
              <button
                type="button"
                onClick={() => {
                  trackEvent('blur_borders_toggle', {
                    enabled: !(effects.blurBorders && fitMode === 'contain'),
                    location: 'export',
                  });
                  onToggleBlurBorders();
                }}
                {...gtmProps('export_blur_borders', 'export', 'blur_borders')}
                title={t.exportPanel.blurTitle}
                aria-pressed={effects.blurBorders && fitMode === 'contain'}
                className={`inline-flex min-h-[40px] items-center justify-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition whitespace-nowrap shrink-0 ${
                  effects.blurBorders && fitMode === 'contain'
                    ? 'border-white bg-white text-[#09090B]'
                    : 'border-zinc-800 bg-[#09090B] text-zinc-300 hover:border-zinc-600'
                }`}
              >
                <Blend className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t.exportPanel.blur}</span>
              </button>
            </div>
          </div>
        </div>

        {exportError && (
          <p className="rounded-xl border border-[#FF453A]/40 bg-[#FF453A]/10 p-3 text-xs text-[#FF453A]">
            {exportError}
          </p>
        )}

        {isExporting ? (
          <div className="space-y-3 rounded-xl border border-zinc-700 bg-[#09090B] p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-white">{stageLabel}</span>
              <span className="font-mono text-zinc-300 tabular-nums">{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                style={{ width: `${progress}%` }}
                className="h-full bg-[#FF453A] transition-all duration-150"
              />
            </div>
            <button
              type="button"
              onClick={handleCancelExport}
              {...gtmProps('export_cancel_mp4', 'export', 'cancel_render')}
              className="inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-700 text-xs font-medium text-zinc-300 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
              <span>{t.exportPanel.cancelRender}</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleStartVideoExport}
            {...gtmProps('export_start_mp4', 'export', t.exportPanel.renderAndExport)}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#FAFAFA] px-5 text-sm font-semibold text-[#09090B] transition hover:bg-zinc-200 active:scale-[0.98]"
          >
            <Download className="h-4 w-4" />
            <span>{t.exportPanel.renderAndExport}</span>
          </button>
        )}

        {exportedUrl && (
          <div className="space-y-2.5 rounded-xl border border-zinc-700 bg-[#09090B] p-3">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-medium text-white">{exportedUrl.fileName}</span>
              <span className="font-mono text-zinc-400 tabular-nums shrink-0">
                {formatBytes(exportedUrl.size)}
              </span>
            </div>
            <video
              src={exportedUrl.url}
              controls
              playsInline
              className="max-h-48 w-full rounded-lg bg-black"
            />
            <a
              href={exportedUrl.url}
              download={exportedUrl.fileName}
              onClick={() => trackEvent('export_mp4_redownload')}
              {...gtmProps('export_redownload_mp4', 'export', t.exportPanel.downloadAgain)}
              className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-[#1C1C21] text-xs font-semibold text-white hover:border-zinc-500"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{t.exportPanel.downloadAgain}</span>
            </a>
          </div>
        )}
      </div>

      {/* 2. Compact Secondary: Export SRT */}
      <div className="space-y-2.5 border-t border-zinc-800/80 pt-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-zinc-400" />
            <h3 className="text-xs font-semibold text-zinc-200">
              {t.exportPanel.srtTitle}
            </h3>
          </div>
          <span className="font-mono text-[11px] text-zinc-500 tabular-nums">
            {t.exportPanel.srtLines(cues.length)}
          </span>
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-2 text-[11px] text-zinc-400">
          <span>{t.exportPanel.adjustSrtTiming}</span>
          <input
            type="checkbox"
            checked={applyCutsToSrt}
            onChange={(e) => {
              trackEvent('export_srt_apply_cuts_toggle', { enabled: e.target.checked });
              setApplyCutsToSrt(e.target.checked);
            }}
            {...gtmProps('export_srt_apply_cuts', 'export', 'adjust_srt_timing')}
            className="h-3.5 w-3.5 accent-white"
          />
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDownloadSrt}
            disabled={!srtContent}
            {...gtmProps('export_download_srt', 'export', t.exportPanel.downloadSrt)}
            className="inline-flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-[#1C1C21] px-3 text-xs font-medium text-white transition hover:border-zinc-500 disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{t.exportPanel.downloadSrt}</span>
          </button>
          <button
            type="button"
            onClick={handleCopySrt}
            disabled={!srtContent}
            {...gtmProps('export_copy_srt', 'export', t.exportPanel.copy)}
            className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-[#09090B] px-3 text-xs font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white disabled:opacity-40"
          >
            {copiedSrt ? <Check className="h-3.5 w-3.5 text-white" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedSrt ? t.exportPanel.copied : t.exportPanel.copy}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
