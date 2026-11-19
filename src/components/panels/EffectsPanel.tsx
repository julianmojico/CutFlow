import React from 'react';
import { ArrowRight, Blend, RotateCcw } from '../Icons';
import type { FitMode, VideoEffectsConfig } from '../../types/editor';
import { useI18n } from '../../i18n/I18nContext';
import { gtmProps, trackEvent } from '../../utils/analytics';

export const DEFAULT_VIDEO_EFFECTS: VideoEffectsConfig = {
  brightness: 100,
  contrast: 100,
  exposure: 100,
  saturation: 100,
  vignette: 0,
  blur: 0,
  warmth: 0,
  blurBorders: false,
};

interface EffectsPanelProps {
  effects: VideoEffectsConfig;
  fitMode: FitMode;
  onChangeEffects: (next: VideoEffectsConfig) => void;
  onToggleBlurBorders: () => void;
  onNextStep: () => void;
}

type NumericEffectKey = Exclude<keyof VideoEffectsConfig, 'blurBorders'>;

type PresetKey = 'original' | 'highContrast' | 'warmCinema' | 'blackAndWhite' | 'softPortrait';

const PRESETS: Array<{ id: PresetKey; config: VideoEffectsConfig }> = [
  { id: 'original', config: DEFAULT_VIDEO_EFFECTS },
  {
    id: 'highContrast',
    config: {
      brightness: 104,
      contrast: 128,
      exposure: 102,
      saturation: 92,
      vignette: 32,
      blur: 0,
      warmth: -8,
      blurBorders: false,
    },
  },
  {
    id: 'warmCinema',
    config: {
      brightness: 98,
      contrast: 114,
      exposure: 104,
      saturation: 116,
      vignette: 45,
      blur: 0,
      warmth: 22,
      blurBorders: false,
    },
  },
  {
    id: 'blackAndWhite',
    config: {
      brightness: 102,
      contrast: 132,
      exposure: 100,
      saturation: 0,
      vignette: 38,
      blur: 0,
      warmth: 0,
      blurBorders: false,
    },
  },
  {
    id: 'softPortrait',
    config: {
      brightness: 106,
      contrast: 96,
      exposure: 106,
      saturation: 108,
      vignette: 20,
      blur: 0.6,
      warmth: 10,
      blurBorders: false,
    },
  },
];

export const EffectsPanel: React.FC<EffectsPanelProps> = ({
  effects,
  fitMode,
  onChangeEffects,
  onToggleBlurBorders,
  onNextStep,
}) => {
  const { t } = useI18n();

  const sliders: Array<{
    key: NumericEffectKey;
    label: string;
    min: number;
    max: number;
    step: number;
    unit: string;
  }> = [
    { key: 'brightness', label: t.effectsPanel.sliders.brightness, min: 50, max: 150, step: 1, unit: '%' },
    { key: 'contrast', label: t.effectsPanel.sliders.contrast, min: 50, max: 180, step: 1, unit: '%' },
    { key: 'exposure', label: t.effectsPanel.sliders.exposure, min: 60, max: 140, step: 1, unit: '%' },
    { key: 'saturation', label: t.effectsPanel.sliders.saturation, min: 0, max: 200, step: 1, unit: '%' },
    { key: 'vignette', label: t.effectsPanel.sliders.vignette, min: 0, max: 100, step: 2, unit: '%' },
    { key: 'blur', label: t.effectsPanel.sliders.blur, min: 0, max: 12, step: 0.2, unit: 'px' },
    { key: 'warmth', label: t.effectsPanel.sliders.warmth, min: -50, max: 50, step: 2, unit: '' },
  ];

  const blurBordersActive = effects.blurBorders && fitMode === 'contain';

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-semibold text-white">
            {t.effectsPanel.title}
          </h2>
          <p className="mt-0.5 text-xs text-zinc-400">
            {t.effectsPanel.subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            trackEvent('effects_reset');
            onChangeEffects(DEFAULT_VIDEO_EFFECTS);
          }}
          {...gtmProps('effects_reset', 'effects', 'reset')}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-zinc-800 bg-[#09090B] px-2.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white whitespace-nowrap shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>{t.effectsPanel.reset}</span>
        </button>
      </div>

      {/* Blurred Borders Fill */}
      <div className="border-t border-zinc-800/80 pt-4">
        <button
          type="button"
          onClick={() => {
            trackEvent('blur_borders_toggle', {
              enabled: !blurBordersActive,
              location: 'effects_panel',
            });
            onToggleBlurBorders();
          }}
          {...gtmProps('effects_blur_borders', 'effects', 'blur_borders')}
          aria-pressed={blurBordersActive}
          className={`flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition ${
            blurBordersActive
              ? 'border-white bg-[#FAFAFA] text-[#09090B]'
              : 'border-zinc-800 bg-[#09090B] text-zinc-200 hover:border-zinc-600'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Blend className="h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <span className="block text-xs font-semibold leading-tight">
                {t.effectsPanel.blurBordersTitle}
              </span>
              <span
                className={`mt-0.5 block text-[11px] leading-tight ${
                  blurBordersActive ? 'text-zinc-600' : 'text-zinc-400'
                }`}
              >
                {t.effectsPanel.blurBordersDesc}
              </span>
            </div>
          </div>
          <span
            className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
              blurBordersActive
                ? 'bg-[#09090B] text-white'
                : 'border border-zinc-700 text-zinc-400'
            }`}
          >
            {blurBordersActive ? t.effectsPanel.active : t.effectsPanel.activate}
          </span>
        </button>
      </div>

      {/* Quick Presets */}
      <div className="flex flex-wrap gap-1.5 border-t border-zinc-800/80 pt-4">
        {PRESETS.map((preset) => {
          const label = t.effectsPanel.presets[preset.id];
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                trackEvent('effects_preset_select', { preset: preset.id });
                onChangeEffects({ ...preset.config, blurBorders: effects.blurBorders });
              }}
              {...gtmProps(`effects_preset_${preset.id}`, 'effects', label)}
              className="min-h-[36px] rounded-lg border border-zinc-800 bg-[#09090B] px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-[#1C1C21]"
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Sliders */}
      <div className="space-y-4 border-t border-zinc-800/80 pt-4">
        {sliders.map((item) => (
          <div key={item.key}>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <label htmlFor={`fx-${item.key}`} className="font-medium text-zinc-200">
                {item.label}
              </label>
              <span className="font-mono text-zinc-400 tabular-nums">
                {effects[item.key]}
                {item.unit}
              </span>
            </div>
            <input
              id={`fx-${item.key}`}
              type="range"
              min={item.min}
              max={item.max}
              step={item.step}
              value={effects[item.key]}
              onChange={(e) =>
                onChangeEffects({ ...effects, [item.key]: Number(e.target.value) })
              }
              onPointerUp={() =>
                trackEvent('effects_slider_change', {
                  effect: item.key,
                  value: effects[item.key],
                })
              }
              onKeyUp={() =>
                trackEvent('effects_slider_change', {
                  effect: item.key,
                  value: effects[item.key],
                })
              }
              {...gtmProps(`effects_slider_${item.key}`, 'effects', item.key)}
              className="studio-slider w-full"
            />
          </div>
        ))}
      </div>

      {/* Next Step Navigation */}
      <div className="border-t border-zinc-800/80 pt-4">
        <button
          type="button"
          onClick={() => {
            trackEvent('next_step_click', { from: 'effects', to: 'export' });
            onNextStep();
          }}
          {...gtmProps('effects_next_export', 'navigation', t.effectsPanel.nextStep)}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-[#1C1C21] px-4 text-xs font-semibold text-white transition hover:border-zinc-500 hover:bg-zinc-800"
        >
          <span>{t.effectsPanel.nextStep}</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
