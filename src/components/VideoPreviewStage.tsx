import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Blend,
  Eye,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Scissors,
} from './Icons';
import type {
  AspectRatioPreset,
  FitMode,
  SubtitleCue,
  SubtitleStyleConfig,
  VideoAsset,
  VideoEffectsConfig,
} from '../types/editor';
import { formatTimecode } from '../utils/audioEngine';
import { buildCssFilterString, computeAnimationFrame } from '../utils/subtitleRenderer';

interface VideoPreviewStageProps {
  asset: VideoAsset;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  currentTime: number;
  editedCurrentTime: number;
  editedDuration: number;
  isPlaying: boolean;
  skipCuts: boolean;
  onToggleSkipCuts: () => void;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  activeCue: SubtitleCue | null;
  firstCue: SubtitleCue | null;
  subtitleStyle: SubtitleStyleConfig;
  animPreviewTrigger: number;
  onUpdateSubtitlePosition: (xPercent: number, yPercent: number) => void;
  effects: VideoEffectsConfig;
  aspectRatio: AspectRatioPreset;
  onChangeAspectRatio: (preset: AspectRatioPreset) => void;
  fitMode: FitMode;
  onToggleFitMode: () => void;
  onToggleBlurBorders: () => void;
}

const ASPECT_OPTIONS: Array<{ value: AspectRatioPreset; label: string }> = [
  { value: 'original', label: 'Original' },
  { value: '9:16', label: '9:16' },
  { value: '16:9', label: '16:9' },
  { value: '1:1', label: '1:1' },
  { value: '4:5', label: '4:5' },
  { value: '21:9', label: '21:9' },
];

export const VideoPreviewStage: React.FC<VideoPreviewStageProps> = ({
  asset,
  videoRef,
  currentTime,
  editedCurrentTime,
  editedDuration,
  isPlaying,
  skipCuts,
  onToggleSkipCuts,
  onTogglePlay,
  onSeek,
  activeCue,
  firstCue,
  subtitleStyle,
  animPreviewTrigger,
  onUpdateSubtitlePosition,
  effects,
  aspectRatio,
  onChangeAspectRatio,
  fitMode,
  onToggleFitMode,
  onToggleBlurBorders,
}) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [videoDecodeError, setVideoDecodeError] = useState<string | null>(null);
  const [compareOriginal, setCompareOriginal] = useState(false);
  const [isDraggingSub, setIsDraggingSub] = useState(false);

  // Temporary 1.4s live animation preview when user selects or tests an animation while paused
  const [previewProgressSec, setPreviewProgressSec] = useState<number | null>(null);

  useEffect(() => {
    if (animPreviewTrigger === 0 || isPlaying) {
      setPreviewProgressSec(null);
      return;
    }

    let rafId = 0;
    const startMs = performance.now();
    const totalMs = 1450;

    const tick = (now: number) => {
      const elapsedSec = (now - startMs) / 1000;
      if (now - startMs < totalMs) {
        setPreviewProgressSec(elapsedSec);
        rafId = requestAnimationFrame(tick);
      } else {
        setPreviewProgressSec(null);
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [animPreviewTrigger, isPlaying]);

  const targetRatio = useMemo(() => {
    switch (aspectRatio) {
      case '9:16':
        return 9 / 16;
      case '16:9':
        return 16 / 9;
      case '1:1':
        return 1;
      case '4:5':
        return 4 / 5;
      case '21:9':
        return 21 / 9;
      case 'original':
      default: {
        const w = asset.width || 16;
        const h = asset.height || 9;
        return w > 0 && h > 0 ? w / h : 16 / 9;
      }
    }
  }, [aspectRatio, asset.height, asset.width]);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) {
        setViewportSize((prev) =>
          prev.width === w && prev.height === h ? prev : { width: w, height: h }
        );
      }
    };

    update();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(update);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const stageSizeStyle = useMemo<React.CSSProperties>(() => {
    if (viewportSize.width > 0 && viewportSize.height > 0) {
      const boxRatio = viewportSize.width / viewportSize.height;
      let width: number;
      let height: number;
      if (targetRatio > boxRatio) {
        width = viewportSize.width;
        height = viewportSize.width / targetRatio;
      } else {
        height = viewportSize.height;
        width = viewportSize.height * targetRatio;
      }
      return {
        width: `${Math.max(120, Math.floor(width))}px`,
        height: `${Math.max(120, Math.floor(height))}px`,
      };
    }

    return {
      aspectRatio: `${targetRatio}`,
      width: targetRatio >= 1 ? '100%' : 'auto',
      height: targetRatio < 1 ? '100%' : 'auto',
      maxWidth: '100%',
      maxHeight: '100%',
    };
  }, [targetRatio, viewportSize.height, viewportSize.width]);

  // Force first frame paint on freshly uploaded videos & detect decode errors
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setVideoDecodeError(null);

    const paintFirstFrame = () => {
      if (
        video.paused &&
        video.currentTime === 0 &&
        Number.isFinite(video.duration) &&
        video.duration > 0.05
      ) {
        try {
          video.currentTime = 0.01;
        } catch {
          // ignore
        }
      }
    };

    const onError = () => {
      setVideoDecodeError('El navegador no pudo decodificar la imagen de este video.');
    };

    if (video.readyState >= 2) {
      paintFirstFrame();
    }
    video.addEventListener('loadeddata', paintFirstFrame);
    video.addEventListener('error', onError);
    return () => {
      video.removeEventListener('loadeddata', paintFirstFrame);
      video.removeEventListener('error', onError);
    };
  }, [asset.url, videoRef]);

  const showBlurredBorders = !compareOriginal && effects.blurBorders && fitMode === 'contain';

  const filterCss = useMemo(
    () => (compareOriginal ? 'none' : buildCssFilterString(effects)),
    [compareOriginal, effects]
  );

  const bgFilterCss = useMemo(
    () => `${buildCssFilterString({ ...effects, blur: 0 })} blur(24px) brightness(0.82)`,
    [effects]
  );

  useEffect(() => {
    const main = videoRef.current;
    const bg = bgVideoRef.current;
    if (!main || !bg || !showBlurredBorders) return;

    const syncTime = () => {
      if (Math.abs(bg.currentTime - main.currentTime) > 0.08) {
        bg.currentTime = main.currentTime;
      }
    };

    const syncPlayState = () => {
      syncTime();
      if (!main.paused) {
        bg.play().catch(() => {});
      } else {
        bg.pause();
      }
    };

    syncPlayState();

    const onPlay = () => {
      syncTime();
      bg.play().catch(() => {});
    };
    const onPause = () => {
      bg.pause();
      syncTime();
    };
    const onSeeked = () => syncTime();
    const onTimeUpdate = () => {
      if (Math.abs(bg.currentTime - main.currentTime) > 0.14) {
        bg.currentTime = main.currentTime;
      }
    };

    main.addEventListener('play', onPlay);
    main.addEventListener('pause', onPause);
    main.addEventListener('seeked', onSeeked);
    main.addEventListener('loadeddata', syncPlayState);
    main.addEventListener('timeupdate', onTimeUpdate);

    return () => {
      main.removeEventListener('play', onPlay);
      main.removeEventListener('pause', onPause);
      main.removeEventListener('seeked', onSeeked);
      main.removeEventListener('loadeddata', syncPlayState);
      main.removeEventListener('timeupdate', onTimeUpdate);
      bg.pause();
    };
  }, [asset.url, showBlurredBorders, videoRef]);

  const handleSubPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsDraggingSub(true);
  };

  const handleSubPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingSub || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    let xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;

    if (Math.abs(xPct - 50) < 3.5) xPct = 50;

    onUpdateSubtitlePosition(
      Math.max(10, Math.min(90, Number(xPct.toFixed(1)))),
      Math.max(10, Math.min(90, Number(yPct.toFixed(1))))
    );
  };

  const handleSubPointerUp = (e: React.PointerEvent) => {
    if (isDraggingSub) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setIsDraggingSub(false);
    }
  };

  const subtitleVisual = useMemo(() => {
    const isPreviewingAnim = previewProgressSec !== null && !isPlaying;
    const targetCue: SubtitleCue | null =
      activeCue ||
      (isPreviewingAnim
        ? firstCue || {
            id: 'preview-sample',
            startTime: 0,
            endTime: 1.45,
            text: 'Vista previa de subtítulo animado',
          }
        : null);

    if (!targetCue || !targetCue.text.trim()) return null;

    const evalCue: SubtitleCue = isPreviewingAnim
      ? { ...targetCue, startTime: 0, endTime: 1.45 }
      : targetCue;
    const evalTime = isPreviewingAnim ? previewProgressSec : currentTime;

    const anim = computeAnimationFrame(evalCue, evalTime, subtitleStyle);
    const words = anim.displayText.split(/\s+/).filter(Boolean);

    const transform = `translate(-50%, calc(-50% + ${(anim.offsetYRatio * 260).toFixed(
      1
    )}px)) scale(${anim.scale.toFixed(3)})`;

    return {
      words,
      opacity: anim.alpha,
      transform,
      activeWordIdx: anim.activeWordIdx,
    };
  }, [activeCue, currentTime, firstCue, isPlaying, previewProgressSec, subtitleStyle]);

  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-[#131316]">
      {/* Top format & preview controls strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 px-3 py-2 sm:px-4">
        <div className="flex max-w-full min-w-0 flex-wrap items-center gap-1">
          {ASPECT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChangeAspectRatio(opt.value)}
              className={`min-h-[34px] rounded-md px-2.5 py-1 text-xs font-medium transition whitespace-nowrap shrink-0 ${
                aspectRatio === opt.value
                  ? 'bg-white text-zinc-950'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleFitMode}
            title={fitMode === 'contain' ? 'Cambiar a Rellenar' : 'Cambiar a Ajustar'}
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-md border border-zinc-800 bg-[#1C1C21] px-2.5 py-1 text-xs font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white whitespace-nowrap shrink-0"
          >
            {fitMode === 'contain' ? (
              <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{fitMode === 'contain' ? 'Ajustar' : 'Rellenar'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleBlurBorders}
            aria-pressed={effects.blurBorders && fitMode === 'contain'}
            title="Completar los bordes vacíos con desenfoque"
            className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition whitespace-nowrap shrink-0 ${
              effects.blurBorders && fitMode === 'contain'
                ? 'border-white bg-white text-zinc-950'
                : 'border-zinc-800 bg-[#1C1C21] text-zinc-300 hover:border-zinc-600 hover:text-white'
            }`}
          >
            <Blend className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Bordes blur</span>
          </button>

          <button
            type="button"
            onClick={() => setCompareOriginal((prev) => !prev)}
            className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition whitespace-nowrap shrink-0 ${
              compareOriginal
                ? 'border-white bg-white text-zinc-950'
                : 'border-zinc-800 bg-[#1C1C21] text-zinc-300 hover:border-zinc-600 hover:text-white'
            }`}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Original</span>
          </button>
        </div>
      </div>

      {/* Interactive Video Stage */}
      <div className="min-w-0 overflow-hidden bg-[#09090B] p-3 sm:p-5">
        <div
          ref={viewportRef}
          className="relative flex h-[38vh] min-h-[240px] max-h-[480px] w-full max-w-full items-center justify-center overflow-hidden sm:h-[48vh] sm:min-h-[320px] sm:max-h-[540px]"
        >
          <div
            ref={stageRef}
            onClick={onTogglePlay}
            style={stageSizeStyle}
            className="relative cursor-pointer overflow-hidden rounded-xl border border-zinc-800 bg-black shadow-2xl"
          >
            {showBlurredBorders && (
              <video
                ref={bgVideoRef}
                src={asset.url}
                muted
                playsInline
                preload="auto"
                aria-hidden="true"
                style={{ filter: bgFilterCss }}
                className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover transition-none"
              />
            )}

            <video
              ref={videoRef}
              src={asset.url}
              playsInline
              preload="auto"
              style={{ filter: filterCss }}
              className={`relative z-[1] block h-full w-full transition-none ${
                fitMode === 'cover' ? 'object-cover' : 'object-contain'
              }`}
            />

            {videoDecodeError && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 p-4 text-center">
                <p className="max-w-xs text-xs font-medium text-[#FF453A]">
                  {videoDecodeError}
                </p>
              </div>
            )}

          {!compareOriginal && effects.vignette > 0 && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-[2]"
              style={{
                background: `radial-gradient(circle at center, rgba(0,0,0,0) 35%, rgba(0,0,0,${Math.min(
                  0.9,
                  (effects.vignette / 100) * 0.85
                ).toFixed(2)}) 100%)`,
              }}
            />
          )}

          {isDraggingSub && Math.abs(subtitleStyle.xPercent - 50) < 1 && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-1/2 z-[5] w-px -translate-x-1/2 bg-[#FF453A]/80"
            />
          )}

          {subtitleVisual && (
            <div
              onPointerDown={handleSubPointerDown}
              onPointerMove={handleSubPointerMove}
              onPointerUp={handleSubPointerUp}
              onClick={(e) => e.stopPropagation()}
              title="Arrastra para mover la ubicación del subtítulo"
              style={{
                left: `${subtitleStyle.xPercent}%`,
                top: `${subtitleStyle.yPercent}%`,
                maxWidth: `${subtitleStyle.maxWidthPercent}%`,
                opacity: subtitleVisual.opacity,
                transform: subtitleVisual.transform,
                fontFamily: `"${subtitleStyle.fontFamily}", sans-serif`,
                fontWeight: subtitleStyle.fontWeight,
                fontSize: `clamp(13px, ${(subtitleStyle.fontSize / 26).toFixed(2)}vw, ${Math.round(
                  subtitleStyle.fontSize * 0.52
                )}px)`,
                lineHeight: 1.24,
                backgroundColor: subtitleStyle.bgEnabled
                  ? `${subtitleStyle.bgColor}${Math.round(subtitleStyle.bgOpacity * 255)
                      .toString(16)
                      .padStart(2, '0')}`
                  : 'transparent',
                borderRadius: `${subtitleStyle.bgRadius}px`,
                padding: subtitleStyle.bgEnabled ? '0.28em 0.55em' : '0.1em 0.25em',
                textShadow: subtitleStyle.shadowEnabled
                  ? '0 2px 8px rgba(0, 0, 0, 0.9)'
                  : 'none',
                WebkitTextStroke:
                  subtitleStyle.strokeWidth > 0
                    ? `${(subtitleStyle.strokeWidth * 0.45).toFixed(1)}px ${subtitleStyle.strokeColor}`
                    : '0px transparent',
                paintOrder: 'stroke fill',
              }}
              className={`absolute z-10 cursor-grab select-none text-center touch-none active:cursor-grabbing ${
                isDraggingSub ? 'ring-1 ring-[#FF453A]' : ''
              }`}
            >
              {subtitleVisual.words.map((word, idx) => {
                const isKaraokeActive =
                  subtitleStyle.animation === 'karaoke' &&
                  idx === subtitleVisual.activeWordIdx;
                return (
                  <span
                    key={`${idx}-${word}`}
                    style={{
                      color: isKaraokeActive
                        ? subtitleStyle.highlightColor
                        : subtitleStyle.textColor,
                      display: 'inline-block',
                      transform: isKaraokeActive ? 'scale(1.1)' : 'scale(1)',
                      transition: 'transform 80ms ease-out, color 80ms ease-out',
                      marginRight: idx < subtitleVisual.words.length - 1 ? '0.26em' : '0',
                    }}
                  >
                    {word}
                  </span>
                );
              })}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Transport Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/80 px-3 py-2 sm:px-4">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSeek(Math.max(0, currentTime - 2))}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
            aria-label="Retroceder 2 segundos"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            className="flex h-11 min-w-[44px] items-center justify-center rounded-xl bg-[#FAFAFA] px-3.5 text-[#09090B] transition hover:bg-zinc-200 active:scale-[0.97]"
            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
          </button>

          <button
            type="button"
            onClick={() => onSeek(Math.min(asset.duration, currentTime + 2))}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
            aria-label="Avanzar 2 segundos"
          >
            <RotateCw className="h-4 w-4" />
          </button>

          <div className="ml-1 flex flex-col font-mono tabular-nums">
            <span className="text-xs font-semibold text-white">
              {formatTimecode(skipCuts ? editedCurrentTime : currentTime)}
              <span className="text-zinc-500">
                {' '}
                / {formatTimecode(skipCuts ? editedDuration : asset.duration)}
              </span>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleSkipCuts}
          className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition whitespace-nowrap shrink-0 ${
            skipCuts
              ? 'border-[#FF453A]/60 bg-[#FF453A]/15 text-white'
              : 'border-zinc-800 bg-[#1C1C21] text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Scissors className="h-3.5 w-3.5 text-[#FF453A]" aria-hidden="true" />
          <span>{skipCuts ? 'Saltando cortes' : 'Video sin cortes'}</span>
        </button>
      </div>
    </section>
  );
};
