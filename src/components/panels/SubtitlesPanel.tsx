import React, { useState } from 'react';
import { ArrowRight, Globe, Loader2, Plus, Scissors, Sparkles, Trash2 } from '../Icons';
import type { SubtitleCue, TimeRegion } from '../../types/editor';
import { useI18n } from '../../i18n/I18nContext';
import { gtmProps, trackEvent } from '../../utils/analytics';
import { extractCompactWavChunksForTranscription, formatTimecode } from '../../utils/audioEngine';

interface SubtitlesPanelProps {
  sourceBlob: Blob | null;
  cues: SubtitleCue[];
  speechRegions: TimeRegion[];
  detectedLanguage: string | null;
  currentTime: number;
  duration: number;
  onChangeCues: (cues: SubtitleCue[]) => void;
  onDeleteCue: (cue: SubtitleCue) => void;
  onChangeDetectedLanguage: (lang: string | null) => void;
  onSeek: (time: number) => void;
  onNextStep: () => void;
}

export const SubtitlesPanel: React.FC<SubtitlesPanelProps> = ({
  sourceBlob,
  cues,
  speechRegions,
  detectedLanguage,
  currentTime,
  duration,
  onChangeCues,
  onDeleteCue,
  onChangeDetectedLanguage,
  onSeek,
  onNextStep,
}) => {
  const { language, t } = useI18n();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stageText, setStageText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAutoTranscribe = async () => {
    if (!sourceBlob || isTranscribing) return;
    trackEvent('auto_transcribe_start', { duration_sec: Math.round(duration) });
    setErrorMsg(null);
    setIsTranscribing(true);
    setProgress(8);
    setStageText(t.subtitlesPanel.stageExtracting);

    let progressTimer: number | undefined;
    try {
      const { chunks } = await extractCompactWavChunksForTranscription(sourceBlob, 90, language);
      if (chunks.length === 0) {
        throw new Error(t.subtitlesPanel.stageNoAudio);
      }

      const mergedCues: SubtitleCue[] = [];
      let resolvedLanguage: string | null = null;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const basePct = 20 + Math.round((i / chunks.length) * 75);
        const capPct = Math.min(95, 20 + Math.round(((i + 0.9) / chunks.length) * 75));
        setProgress(basePct);
        setStageText(
          chunks.length > 1
            ? t.subtitlesPanel.stageChunk(i + 1, chunks.length)
            : t.subtitlesPanel.stageTranscribing
        );

        if (progressTimer) window.clearInterval(progressTimer);
        progressTimer = window.setInterval(() => {
          setProgress((prev) => (prev < capPct ? prev + 2 : prev));
        }, 650);

        const chunkEnd = chunk.startOffsetSec + chunk.duration;
        const localRegions = speechRegions
          .filter((r) => r.endTime > chunk.startOffsetSec && r.startTime < chunkEnd)
          .map((r) => ({
            startTime: Math.max(0, Number((r.startTime - chunk.startOffsetSec).toFixed(2))),
            endTime: Math.min(
              chunk.duration,
              Number((r.endTime - chunk.startOffsetSec).toFixed(2))
            ),
          }));

        let payload: {
          detectedLanguage?: string;
          cues?: SubtitleCue[];
          error?: string;
        } = {};

        const maxClientAttempts = 3;
        for (let attempt = 1; attempt <= maxClientAttempts; attempt++) {
          let response: Response;
          try {
            response = await fetch('/api/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64: chunk.base64,
                mimeType: chunk.mimeType,
                duration: chunk.duration,
                speechRegions: localRegions,
                languageHint: resolvedLanguage || undefined,
                uiLanguage: language,
              }),
            });
          } catch (networkErr) {
            if (attempt < maxClientAttempts) {
              setStageText(t.subtitlesPanel.stageRetryNetwork(attempt, maxClientAttempts - 1));
              await new Promise((r) => setTimeout(r, 1800 * attempt));
              continue;
            }
            throw networkErr;
          }

          const rawText = await response.text();
          try {
            payload = rawText ? (JSON.parse(rawText) as typeof payload) : {};
          } catch {
            payload = {};
          }

          if (response.ok) {
            break;
          }

          const isRetryable = [429, 502, 503, 504].includes(response.status);
          if (isRetryable && attempt < maxClientAttempts) {
            setStageText(t.subtitlesPanel.stageRetryBusy(attempt, maxClientAttempts - 1));
            await new Promise((r) => setTimeout(r, 2000 * attempt));
            continue;
          }

          throw new Error(payload.error || t.subtitlesPanel.errorDefault);
        }

        if (
          !resolvedLanguage &&
          payload.detectedLanguage &&
          payload.detectedLanguage !== 'Sin voz detectada' &&
          payload.detectedLanguage !== t.subtitlesPanel.noSpeechDetected
        ) {
          resolvedLanguage = payload.detectedLanguage;
        } else if (!resolvedLanguage && payload.detectedLanguage) {
          resolvedLanguage = payload.detectedLanguage;
        }

        for (const c of payload.cues ?? []) {
          mergedCues.push({
            id: `cue-ai-${i}-${mergedCues.length}-${Math.round((c.startTime + chunk.startOffsetSec) * 100)}`,
            startTime: Number((c.startTime + chunk.startOffsetSec).toFixed(2)),
            endTime: Number((c.endTime + chunk.startOffsetSec).toFixed(2)),
            text: c.text,
          });
        }
      }

      if (progressTimer) window.clearInterval(progressTimer);
      setProgress(100);
      setStageText(t.subtitlesPanel.stageDone);
      onChangeDetectedLanguage(resolvedLanguage || t.subtitlesPanel.unknownLanguage);
      onChangeCues(mergedCues);
      trackEvent('auto_transcribe_success', {
        cues_count: mergedCues.length,
        language: resolvedLanguage || 'unknown',
      });
    } catch (err) {
      if (progressTimer) window.clearInterval(progressTimer);
      const message =
        err instanceof Error ? err.message : t.subtitlesPanel.errorUnexpected;
      setErrorMsg(message);
      trackEvent('auto_transcribe_error', { message: message.slice(0, 80) });
    } finally {
      setIsTranscribing(false);
    }
  };

  const addCueAtPlayhead = () => {
    const start = Number(currentTime.toFixed(2));
    const end = Number(Math.min(duration || start + 2.5, start + 2.2).toFixed(2));
    const next: SubtitleCue = {
      id: `cue-${Date.now()}`,
      startTime: start,
      endTime: Math.max(start + 0.4, end),
      text: t.subtitlesPanel.newSubtitleDefault,
    };
    onChangeCues([...cues, next].sort((a, b) => a.startTime - b.startTime));
  };

  const updateCue = (id: string, patch: Partial<SubtitleCue>) => {
    onChangeCues(cues.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const splitCue = (cue: SubtitleCue) => {
    const words = cue.text.trim().split(/\s+/);
    if (words.length < 2) return;
    const midIdx = Math.ceil(words.length / 2);
    const midTime = Number(((cue.startTime + cue.endTime) / 2).toFixed(2));

    const first: SubtitleCue = {
      ...cue,
      endTime: midTime,
      text: words.slice(0, midIdx).join(' '),
    };
    const second: SubtitleCue = {
      id: `cue-split-${Date.now()}`,
      startTime: midTime,
      endTime: cue.endTime,
      text: words.slice(midIdx).join(' '),
    };
    const next = cues.flatMap((c) => (c.id === cue.id ? [first, second] : [c]));
    onChangeCues(next);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-semibold text-white">
            {t.subtitlesPanel.title}
          </h2>
          <p className="mt-0.5 text-xs text-zinc-400">
            {t.subtitlesPanel.linesCount(cues.length)}
            {detectedLanguage ? t.subtitlesPanel.detectedLanguageSuffix(detectedLanguage) : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            trackEvent('subtitle_cue_add');
            addCueAtPlayhead();
          }}
          {...gtmProps('subtitles_add_cue', 'subtitles', t.subtitlesPanel.addLine)}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-zinc-700 bg-[#1C1C21] px-3 py-1.5 text-xs font-medium text-zinc-100 transition hover:border-zinc-500 whitespace-nowrap shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t.subtitlesPanel.addLine}</span>
        </button>
      </div>

      {/* Primary Automatic Transcription CTA + Loader */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={handleAutoTranscribe}
          disabled={!sourceBlob || isTranscribing}
          {...gtmProps('subtitles_auto_transcribe', 'subtitles', t.subtitlesPanel.autoTranscribeBtn)}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#FAFAFA] px-4 text-sm font-semibold text-[#09090B] transition hover:bg-zinc-200 active:scale-[0.98] disabled:opacity-50"
        >
          {isTranscribing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          <span>
            {isTranscribing
              ? t.subtitlesPanel.transcribingBtn
              : t.subtitlesPanel.autoTranscribeBtn}
          </span>
        </button>

        {isTranscribing && (
          <div className="space-y-2 rounded-xl border border-zinc-800 bg-[#09090B] p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-200">{stageText}</span>
              <span className="font-mono text-zinc-400 tabular-nums">{progress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                style={{ width: `${progress}%` }}
                className="h-full bg-[#FF453A] transition-all duration-200"
              />
            </div>
          </div>
        )}

        {!isTranscribing && detectedLanguage && (
          <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 text-xs">
            <span className="flex items-center gap-2 text-zinc-300">
              <Globe className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
              <span>{t.subtitlesPanel.detectedLanguageLabel}</span>
            </span>
            <span className="font-semibold text-white">{detectedLanguage}</span>
          </div>
        )}

        {errorMsg && (
          <p className="rounded-xl border border-[#FF453A]/40 bg-[#FF453A]/10 p-3 text-xs text-[#FF453A]">
            {errorMsg}
          </p>
        )}
      </div>

      {/* Cue Editor List */}
      <div className="space-y-2.5 border-t border-zinc-800/80 pt-4">
        {cues.length === 0 ? (
          <p className="rounded-xl border border-zinc-800/80 bg-[#09090B] p-4 text-center text-xs text-zinc-400">
            {t.subtitlesPanel.emptyState}
          </p>
        ) : (
          <div className="max-h-[360px] space-y-2.5 overflow-y-auto pr-1">
            {cues.map((cue, idx) => {
              const isActive = currentTime >= cue.startTime && currentTime <= cue.endTime;

              return (
                <div
                  key={cue.id}
                  className={`rounded-xl border p-3 transition ${
                    isActive
                      ? 'border-white/70 bg-[#1C1C21]'
                      : 'border-zinc-800 bg-[#09090B]'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        trackEvent('subtitle_cue_seek', { source: 'panel' });
                        onSeek(cue.startTime);
                      }}
                      {...gtmProps('subtitles_cue_seek', 'subtitles', 'Seek cue')}
                      className="flex items-center gap-2 font-mono text-[11px] text-zinc-300 tabular-nums hover:text-white"
                    >
                      <span className="text-zinc-500">#{idx + 1}</span>
                      <span>
                        {formatTimecode(cue.startTime)} → {formatTimecode(cue.endTime)}
                      </span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          trackEvent('subtitle_cue_split');
                          splitCue(cue);
                        }}
                        {...gtmProps('subtitles_cue_split', 'subtitles', 'split_cue')}
                        title={t.subtitlesPanel.splitCueTitle}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white"
                      >
                        <Scissors className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          trackEvent('subtitle_cue_delete');
                          onDeleteCue(cue);
                        }}
                        {...gtmProps('subtitles_cue_delete', 'subtitles', 'delete_cue')}
                        title={t.subtitlesPanel.deleteCueTitle}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-[#FF453A]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    value={cue.text}
                    onChange={(e) => updateCue(cue.id, { text: e.target.value })}
                    onBlur={() => trackEvent('subtitle_cue_edit')}
                    {...gtmProps('subtitles_cue_edit_text', 'subtitles', 'edit_cue_text')}
                    className="w-full resize-none rounded-lg border border-zinc-800 bg-[#131316] px-2.5 py-1.5 text-xs leading-relaxed text-white focus:border-zinc-500 focus:outline-none"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Next Step Navigation */}
      <div className="border-t border-zinc-800/80 pt-4">
        <button
          type="button"
          onClick={() => {
            trackEvent('next_step_click', { from: 'subtitles', to: 'style' });
            onNextStep();
          }}
          {...gtmProps('subtitles_next_style', 'navigation', t.subtitlesPanel.nextStep)}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-[#1C1C21] px-4 text-xs font-semibold text-white transition hover:border-zinc-500 hover:bg-zinc-800"
        >
          <span>{t.subtitlesPanel.nextStep}</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
