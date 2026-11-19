import React from 'react';
import { ArrowRight, Check, Play, RefreshCw, Scissors, Trash2 } from '../Icons';
import type { AudioAnalysisConfig, CutSegment } from '../../types/editor';
import { useI18n } from '../../i18n/I18nContext';
import { gtmProps, trackEvent } from '../../utils/analytics';
import { formatTimecode } from '../../utils/audioEngine';

interface AudioCutsPanelProps {
  config: AudioAnalysisConfig;
  cuts: CutSegment[];
  isAnalyzing: boolean;
  onChangeConfig: (next: AudioAnalysisConfig) => void;
  onReanalyze: () => void;
  onToggleCut: (id: string) => void;
  onDeleteCut: (id: string) => void;
  onEnableAllCuts: (enabled: boolean) => void;
  onSeek: (time: number) => void;
  onNextStep: () => void;
}

export const AudioCutsPanel: React.FC<AudioCutsPanelProps> = ({
  config,
  cuts,
  isAnalyzing,
  onChangeConfig,
  onReanalyze,
  onToggleCut,
  onDeleteCut,
  onEnableAllCuts,
  onSeek,
  onNextStep,
}) => {
  const { t } = useI18n();
  const activeCount = cuts.filter((c) => c.enabled).length;
  const savedSeconds = cuts
    .filter((c) => c.enabled)
    .reduce((acc, c) => acc + (c.endTime - c.startTime), 0);

  return (
    <div className="space-y-6">
      {/* Header & Summary */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-white">
            {t.audioPanel.title}
          </h2>
          <p className="mt-0.5 text-xs text-zinc-400">
            {t.audioPanel.summary(activeCount, savedSeconds.toFixed(1))}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            trackEvent('audio_analyze_click', {
              silence_threshold_db: config.silenceThresholdDb,
              min_silence_ms: config.minSilenceMs,
              detect_hesitations: config.detectHesitations,
            });
            onReanalyze();
          }}
          disabled={isAnalyzing}
          {...gtmProps('audio_reanalyze', 'audio_cuts', t.audioPanel.analyze)}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#FAFAFA] px-3 py-1.5 text-xs font-semibold text-[#09090B] transition hover:bg-zinc-200 disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
          <span>{isAnalyzing ? t.audioPanel.analyzing : t.audioPanel.analyze}</span>
        </button>
      </div>

      {/* Silence & Pause Thresholds */}
      <div className="space-y-4 border-t border-zinc-800/80 pt-4">
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <label htmlFor="silence-db" className="font-medium text-zinc-200">
              {t.audioPanel.silenceThreshold}
            </label>
            <span className="font-mono text-zinc-400 tabular-nums">
              {config.silenceThresholdDb} dB
            </span>
          </div>
          <input
            id="silence-db"
            type="range"
            min={-50}
            max={-12}
            step={1}
            value={config.silenceThresholdDb}
            onChange={(e) =>
              onChangeConfig({ ...config, silenceThresholdDb: Number(e.target.value) })
            }
            onPointerUp={() =>
              trackEvent('audio_config_change', {
                field: 'silence_threshold_db',
                value: config.silenceThresholdDb,
              })
            }
            onKeyUp={() =>
              trackEvent('audio_config_change', {
                field: 'silence_threshold_db',
                value: config.silenceThresholdDb,
              })
            }
            {...gtmProps('audio_silence_threshold', 'audio_cuts', 'silence_threshold')}
            className="studio-slider w-full"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <label htmlFor="min-silence-ms" className="font-medium text-zinc-200">
              {t.audioPanel.minPauseDuration}
            </label>
            <span className="font-mono text-zinc-400 tabular-nums">
              {(config.minSilenceMs / 1000).toFixed(2)} s
            </span>
          </div>
          <input
            id="min-silence-ms"
            type="range"
            min={160}
            max={1500}
            step={20}
            value={config.minSilenceMs}
            onChange={(e) =>
              onChangeConfig({ ...config, minSilenceMs: Number(e.target.value) })
            }
            onPointerUp={() =>
              trackEvent('audio_config_change', {
                field: 'min_silence_ms',
                value: config.minSilenceMs,
              })
            }
            onKeyUp={() =>
              trackEvent('audio_config_change', {
                field: 'min_silence_ms',
                value: config.minSilenceMs,
              })
            }
            {...gtmProps('audio_min_silence_ms', 'audio_cuts', 'min_silence_ms')}
            className="studio-slider w-full"
          />
        </div>

        {/* Acoustic Hesitation ("emm / err") Toggle */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div>
            <p className="text-xs font-medium text-zinc-200">
              {t.audioPanel.detectHesitationsTitle}
            </p>
            <p className="text-[11px] text-zinc-400">
              {t.audioPanel.detectHesitationsDesc}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={config.detectHesitations}
            onClick={() => {
              const nextVal = !config.detectHesitations;
              trackEvent('audio_config_change', {
                field: 'detect_hesitations',
                value: nextVal,
              });
              onChangeConfig({ ...config, detectHesitations: nextVal });
            }}
            {...gtmProps('audio_detect_hesitations', 'audio_cuts', 'detect_hesitations')}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition ${
              config.detectHesitations
                ? 'border-white bg-white'
                : 'border-zinc-700 bg-zinc-900'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full transition ${
                config.detectHesitations
                  ? 'translate-x-6 bg-[#09090B]'
                  : 'translate-x-1 bg-zinc-400'
              }`}
            />
          </button>
        </div>

        {config.detectHesitations && (
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <label htmlFor="hesitation-sens" className="font-medium text-zinc-300">
                {t.audioPanel.hesitationSensitivity}
              </label>
              <span className="font-mono text-zinc-400 tabular-nums">
                {config.hesitationSensitivity}%
              </span>
            </div>
            <input
              id="hesitation-sens"
              type="range"
              min={10}
              max={100}
              step={5}
              value={config.hesitationSensitivity}
              onChange={(e) =>
                onChangeConfig({
                  ...config,
                  hesitationSensitivity: Number(e.target.value),
                })
              }
              onPointerUp={() =>
                trackEvent('audio_config_change', {
                  field: 'hesitation_sensitivity',
                  value: config.hesitationSensitivity,
                })
              }
              onKeyUp={() =>
                trackEvent('audio_config_change', {
                  field: 'hesitation_sensitivity',
                  value: config.hesitationSensitivity,
                })
              }
              {...gtmProps('audio_hesitation_sensitivity', 'audio_cuts', 'hesitation_sensitivity')}
              className="studio-slider w-full"
            />
          </div>
        )}
      </div>

      {/* Detected Cuts List */}
      <div className="space-y-2.5 border-t border-zinc-800/80 pt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-zinc-200">
            {t.audioPanel.detectedSegments(cuts.length)}
          </span>
          {cuts.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  trackEvent('cuts_bulk_toggle', { enabled: true, count: cuts.length });
                  onEnableAllCuts(true);
                }}
                {...gtmProps('audio_enable_all_cuts', 'audio_cuts', 'cut_all')}
                className="text-zinc-300 underline-offset-2 hover:text-white hover:underline"
              >
                {t.audioPanel.cutAll}
              </button>
              <span className="text-zinc-600">·</span>
              <button
                type="button"
                onClick={() => {
                  trackEvent('cuts_bulk_toggle', { enabled: false, count: cuts.length });
                  onEnableAllCuts(false);
                }}
                {...gtmProps('audio_disable_all_cuts', 'audio_cuts', 'keep_all')}
                className="text-zinc-400 underline-offset-2 hover:text-white hover:underline"
              >
                {t.audioPanel.keepAll}
              </button>
            </div>
          )}
        </div>

        {cuts.length === 0 ? (
          <p className="rounded-xl border border-zinc-800/80 bg-[#09090B] p-4 text-center text-xs text-zinc-400">
            {t.audioPanel.emptyState}
          </p>
        ) : (
          <div className="max-h-60 space-y-1.5 overflow-y-auto pr-1">
            {cuts.map((cut) => (
              <div
                key={cut.id}
                className={`flex min-h-[48px] items-center justify-between gap-2 rounded-xl border px-3 py-2 transition ${
                  cut.enabled
                    ? 'border-zinc-700 bg-[#1C1C21]'
                    : 'border-zinc-800/60 bg-[#09090B] opacity-60'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    trackEvent('cut_seek', { kind: cut.kind });
                    onSeek(Math.max(0, cut.startTime - 0.35));
                  }}
                  {...gtmProps('audio_cut_seek', 'audio_cuts', cut.kind)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                >
                  <Play className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-zinc-100">{cut.label}</p>
                    <p className="font-mono text-[11px] text-zinc-400 tabular-nums">
                      {formatTimecode(cut.startTime)} → {formatTimecode(cut.endTime)}
                    </p>
                  </div>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      trackEvent('cut_toggle', {
                        kind: cut.kind,
                        enabled: !cut.enabled,
                        source: 'panel',
                      });
                      onToggleCut(cut.id);
                    }}
                    {...gtmProps('audio_cut_toggle', 'audio_cuts', cut.kind)}
                    title={cut.enabled ? t.audioPanel.keepSegmentTitle : t.audioPanel.cutSegmentTitle}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                      cut.enabled
                        ? 'border-[#FF453A]/60 bg-[#FF453A]/20 text-white'
                        : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {cut.enabled ? (
                      <Scissors className="h-3.5 w-3.5 text-[#FF453A]" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      trackEvent('cut_delete', { kind: cut.kind });
                      onDeleteCut(cut.id);
                    }}
                    {...gtmProps('audio_cut_delete', 'audio_cuts', cut.kind)}
                    title={t.audioPanel.deleteMarkerTitle}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Next Step Navigation */}
      <div className="border-t border-zinc-800/80 pt-4">
        <button
          type="button"
          onClick={() => {
            trackEvent('next_step_click', { from: 'audio', to: 'subtitles' });
            onNextStep();
          }}
          {...gtmProps('audio_next_subtitles', 'navigation', t.audioPanel.nextStep)}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-[#1C1C21] px-4 text-xs font-semibold text-white transition hover:border-zinc-500 hover:bg-zinc-800"
        >
          <span>{t.audioPanel.nextStep}</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
