import React from 'react';
import { ArrowRight, Check, Play, RefreshCw, Scissors, Trash2 } from '../Icons';
import type { AudioAnalysisConfig, CutSegment } from '../../types/editor';
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
            Silencios y pausas
          </h2>
          <p className="mt-0.5 text-xs text-zinc-400">
            {activeCount} cortes activos · {savedSeconds.toFixed(1)}s removidos del montaje
          </p>
        </div>

        <button
          type="button"
          onClick={onReanalyze}
          disabled={isAnalyzing}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#FAFAFA] px-3 py-1.5 text-xs font-semibold text-[#09090B] transition hover:bg-zinc-200 disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
          <span>{isAnalyzing ? 'Analizando...' : 'Analizar'}</span>
        </button>
      </div>

      {/* Silence & Pause Thresholds */}
      <div className="space-y-4 border-t border-zinc-800/80 pt-4">
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <label htmlFor="silence-db" className="font-medium text-zinc-200">
              Umbral de silencio
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
            className="studio-slider w-full"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <label htmlFor="min-silence-ms" className="font-medium text-zinc-200">
              Duración mínima de pausa
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
            className="studio-slider w-full"
          />
        </div>

        {/* Acoustic Hesitation ("emm / err") Toggle */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div>
            <p className="text-xs font-medium text-zinc-200">
              Detectar vacilaciones acústicas («emm / err»)
            </p>
            <p className="text-[11px] text-zinc-400">
              Marca ráfagas cortas aisladas con tono estable entre pausas
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={config.detectHesitations}
            onClick={() =>
              onChangeConfig({ ...config, detectHesitations: !config.detectHesitations })
            }
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
                Sensibilidad a vacilaciones
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
              className="studio-slider w-full"
            />
          </div>
        )}
      </div>

      {/* Detected Cuts List */}
      <div className="space-y-2.5 border-t border-zinc-800/80 pt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-zinc-200">
            Segmentos detectados ({cuts.length})
          </span>
          {cuts.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => onEnableAllCuts(true)}
                className="text-zinc-300 underline-offset-2 hover:text-white hover:underline"
              >
                Cortar todos
              </button>
              <span className="text-zinc-600">·</span>
              <button
                type="button"
                onClick={() => onEnableAllCuts(false)}
                className="text-zinc-400 underline-offset-2 hover:text-white hover:underline"
              >
                Conservar todos
              </button>
            </div>
          )}
        </div>

        {cuts.length === 0 ? (
          <p className="rounded-xl border border-zinc-800/80 bg-[#09090B] p-4 text-center text-xs text-zinc-400">
            No se detectaron silencios con el umbral actual. Prueba subir el umbral en dB o reducir la duración mínima.
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
                  onClick={() => onSeek(Math.max(0, cut.startTime - 0.35))}
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
                    onClick={() => onToggleCut(cut.id)}
                    title={cut.enabled ? 'Conservar segmento' : 'Cortar segmento'}
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
                    onClick={() => onDeleteCut(cut.id)}
                    title="Eliminar marcador"
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
          onClick={onNextStep}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-[#1C1C21] px-4 text-xs font-semibold text-white transition hover:border-zinc-500 hover:bg-zinc-800"
        >
          <span>Editar texto</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
