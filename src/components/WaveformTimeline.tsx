import React, { useRef } from 'react';
import { Scissors } from './Icons';
import type { CutSegment, SubtitleCue } from '../types/editor';
import { formatTimecode } from '../utils/audioEngine';

interface WaveformTimelineProps {
  peaks: number[];
  duration: number;
  currentTime: number;
  cuts: CutSegment[];
  cues: SubtitleCue[];
  isAnalyzing: boolean;
  onSeek: (time: number) => void;
  onToggleCut: (cutId: string) => void;
  onAddManualCutAtPlayhead: () => void;
}

export const WaveformTimeline: React.FC<WaveformTimelineProps> = ({
  peaks,
  duration,
  currentTime,
  cuts,
  cues,
  isAnalyzing,
  onSeek,
  onToggleCut,
  onAddManualCutAtPlayhead,
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const isScrubbingRef = useRef(false);

  const seekFromPointer = (clientX: number) => {
    if (!trackRef.current || duration <= 0) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onSeek(ratio * duration);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    isScrubbingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    seekFromPointer(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isScrubbingRef.current) return;
    seekFromPointer(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isScrubbingRef.current) {
      isScrubbingRef.current = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const playheadPct = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-zinc-800 bg-[#131316] p-3 sm:p-4">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-zinc-400">
          <span className="font-medium text-zinc-200">Línea de tiempo de audio</span>
          {isAnalyzing && (
            <span className="font-mono text-[11px] text-zinc-400">Analizando señal...</span>
          )}
        </div>

        <button
          type="button"
          onClick={onAddManualCutAtPlayhead}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-zinc-700 bg-[#1C1C21] px-2.5 py-1 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white whitespace-nowrap shrink-0"
        >
          <Scissors className="h-3.5 w-3.5 text-[#FF453A]" aria-hidden="true" />
          <span>Cortar 0.8s aquí</span>
        </button>
      </div>

      {/* Interactive Waveform + Cuts Overlay */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative h-20 w-full cursor-ew-resize select-none overflow-hidden rounded-xl border border-zinc-800 bg-[#09090B] touch-none"
      >
        {/* Cut segments shading */}
        {duration > 0 &&
          cuts.map((cut) => {
            const left = (cut.startTime / duration) * 100;
            const width = Math.max(0.5, ((cut.endTime - cut.startTime) / duration) * 100);
            const isFiller = cut.kind === 'filler';
            return (
              <button
                key={cut.id}
                type="button"
                title={`${cut.label} — Clic para ${cut.enabled ? 'conservar' : 'cortar'}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCut(cut.id);
                }}
                style={{ left: `${left}%`, width: `${width}%` }}
                className={`absolute inset-y-0 z-10 border-x transition ${
                  cut.enabled
                    ? isFiller
                      ? 'border-[#FF453A]/70 bg-[#FF453A]/25 hover:bg-[#FF453A]/35'
                      : 'border-zinc-500/50 bg-zinc-700/35 hover:bg-zinc-600/45'
                    : 'border-zinc-700/30 bg-transparent opacity-30 hover:opacity-70'
                }`}
              />
            );
          })}

        {/* Waveform bars */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-between gap-[1px] px-1">
          {(peaks.length > 0 ? peaks : Array.from({ length: 120 }, () => 0.12)).map((amp, i) => {
            const timeAtBar = duration > 0 ? (i / Math.max(1, peaks.length)) * duration : 0;
            const isCut = cuts.some(
              (c) => c.enabled && timeAtBar >= c.startTime && timeAtBar <= c.endTime
            );
            const heightPct = Math.max(8, Math.round(amp * 88));
            return (
              <div
                key={i}
                style={{ height: `${heightPct}%` }}
                className={`flex-1 rounded-full ${
                  isCut ? 'bg-zinc-600/50' : 'bg-zinc-200/85'
                }`}
              />
            );
          })}
        </div>

        {/* Playhead */}
        <div
          aria-hidden="true"
          style={{ left: `${playheadPct}%` }}
          className="pointer-events-none absolute inset-y-0 z-20 w-[2px] -translate-x-1/2 bg-[#FF453A]"
        >
          <div className="mx-auto h-2.5 w-2.5 -translate-x-[4px] rounded-b-sm bg-[#FF453A]" />
        </div>
      </div>

      {/* Subtitle Cues Mini Track */}
      <div className="relative mt-2 h-6 w-full overflow-hidden rounded-lg border border-zinc-800/80 bg-[#09090B]">
        {duration > 0 &&
          cues.map((cue) => {
            const left = (cue.startTime / duration) * 100;
            const width = Math.max(1.2, ((cue.endTime - cue.startTime) / duration) * 100);
            const isActive = currentTime >= cue.startTime && currentTime <= cue.endTime;
            return (
              <button
                key={cue.id}
                type="button"
                onClick={() => onSeek(cue.startTime)}
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`${formatTimecode(cue.startTime)}: ${cue.text}`}
                className={`absolute inset-y-1 truncate rounded px-1 text-left text-[10px] font-medium transition ${
                  isActive
                    ? 'bg-[#FAFAFA] text-[#09090B]'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {cue.text}
              </button>
            );
          })}
      </div>

      {/* Legend (unboxed clean metadata) */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-zinc-700/70 border border-zinc-500/60" />
            Silencio / pausa
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#FF453A]/35 border border-[#FF453A]/80" />
            Posible «emm / err»
          </span>
        </div>
        <span className="font-mono tabular-nums">
          Toca una región para activar o conservar
        </span>
      </div>
    </section>
  );
};
