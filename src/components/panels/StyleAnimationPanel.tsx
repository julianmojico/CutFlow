import React from 'react';
import { ArrowRight, Play } from '../Icons';
import type {
  SubtitleAnimation,
  SubtitleFontFamily,
  SubtitlePositionPreset,
  SubtitleStyleConfig,
} from '../../types/editor';
import { useI18n } from '../../i18n/I18nContext';
import { gtmProps, trackEvent } from '../../utils/analytics';

interface StyleAnimationPanelProps {
  style: SubtitleStyleConfig;
  onChangeStyle: (next: SubtitleStyleConfig) => void;
  onReplayAnimation: () => void;
  onNextStep: () => void;
}

const FONTS: Array<{ value: SubtitleFontFamily; label: string }> = [
  { value: 'DM Sans', label: 'DM Sans' },
  { value: 'Bricolage Grotesque', label: 'Bricolage' },
  { value: 'Oswald', label: 'Oswald' },
  { value: 'Playfair Display', label: 'Playfair' },
  { value: 'JetBrains Mono', label: 'Mono' },
];

const ANIMATION_KEYS: SubtitleAnimation[] = [
  'none',
  'fade',
  'slide-up',
  'pop',
  'karaoke',
  'typewriter',
];

const POSITION_DEFS: Array<{ value: Exclude<SubtitlePositionPreset, 'custom'>; y: number }> = [
  { value: 'top', y: 18 },
  { value: 'middle', y: 50 },
  { value: 'bottom', y: 82 },
];

const COLOR_SWATCHES = ['#FAFAFA', '#FACC15', '#FF453A', '#38BDF8', '#4ADE80', '#09090B'];

export const StyleAnimationPanel: React.FC<StyleAnimationPanelProps> = ({
  style,
  onChangeStyle,
  onReplayAnimation,
  onNextStep,
}) => {
  const { t } = useI18n();
  const setPositionPreset = (preset: SubtitlePositionPreset, y: number) => {
    onChangeStyle({
      ...style,
      positionPreset: preset,
      xPercent: 50,
      yPercent: y,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-base font-semibold text-white">
          {t.stylePanel.title}
        </h2>
        <p className="mt-0.5 text-xs text-zinc-400">
          {t.stylePanel.subtitle}
        </p>
      </div>

      {/* Animation Presets */}
      <div className="space-y-2 border-t border-zinc-800/80 pt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-zinc-200">{t.stylePanel.entranceAnimation}</span>
          <button
            type="button"
            onClick={() => {
              trackEvent('subtitle_animation_replay', { animation: style.animation });
              onReplayAnimation();
            }}
            {...gtmProps('style_replay_animation', 'subtitle_style', 'replay_animation')}
            className="inline-flex min-h-[30px] items-center gap-1 rounded-md border border-zinc-700 bg-[#1C1C21] px-2 text-[11px] font-medium text-zinc-200 hover:border-zinc-500 hover:text-white"
          >
            <Play className="h-3 w-3" />
            <span>{t.stylePanel.testBtn}</span>
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {ANIMATION_KEYS.map((animKey) => {
            const label = t.stylePanel.animations[animKey];
            return (
              <button
                key={animKey}
                type="button"
                onClick={() => {
                  trackEvent('subtitle_animation_select', { animation: animKey });
                  onChangeStyle({ ...style, animation: animKey });
                  onReplayAnimation();
                }}
                {...gtmProps(`style_animation_${animKey}`, 'subtitle_style', label)}
                className={`min-h-[40px] rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                  style.animation === animKey
                    ? 'border-white bg-white text-[#09090B]'
                    : 'border-zinc-800 bg-[#09090B] text-zinc-300 hover:border-zinc-600 hover:text-white'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Position Presets + X/Y Fine Tuning */}
      <div className="space-y-3 border-t border-zinc-800/80 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-200">{t.stylePanel.canvasPosition}</span>
          <span className="font-mono text-[11px] text-zinc-400 tabular-nums">
            X {Math.round(style.xPercent)}% · Y {Math.round(style.yPercent)}%
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {POSITION_DEFS.map((pos) => {
            const label = t.stylePanel.positions[pos.value];
            return (
              <button
                key={pos.value}
                type="button"
                onClick={() => {
                  trackEvent('subtitle_position_preset', { preset: pos.value });
                  setPositionPreset(pos.value, pos.y);
                }}
                {...gtmProps(`style_position_${pos.value}`, 'subtitle_style', label)}
                className={`min-h-[40px] rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                  style.positionPreset === pos.value
                    ? 'border-white bg-white text-[#09090B]'
                    : 'border-zinc-800 bg-[#09090B] text-zinc-300 hover:border-zinc-600'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <div className="mb-1 flex justify-between text-[11px] text-zinc-400">
              <span>{t.stylePanel.axisX}</span>
              <span className="font-mono tabular-nums">{Math.round(style.xPercent)}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={90}
              value={style.xPercent}
              onChange={(e) =>
                onChangeStyle({
                  ...style,
                  positionPreset: 'custom',
                  xPercent: Number(e.target.value),
                })
              }
              onPointerUp={() =>
                trackEvent('subtitle_style_change', {
                  field: 'x_percent',
                  value: Math.round(style.xPercent),
                })
              }
              onKeyUp={() =>
                trackEvent('subtitle_style_change', {
                  field: 'x_percent',
                  value: Math.round(style.xPercent),
                })
              }
              {...gtmProps('style_position_x', 'subtitle_style', 'axis_x')}
              className="studio-slider w-full"
            />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-[11px] text-zinc-400">
              <span>{t.stylePanel.axisY}</span>
              <span className="font-mono tabular-nums">{Math.round(style.yPercent)}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={90}
              value={style.yPercent}
              onChange={(e) =>
                onChangeStyle({
                  ...style,
                  positionPreset: 'custom',
                  yPercent: Number(e.target.value),
                })
              }
              onPointerUp={() =>
                trackEvent('subtitle_style_change', {
                  field: 'y_percent',
                  value: Math.round(style.yPercent),
                })
              }
              onKeyUp={() =>
                trackEvent('subtitle_style_change', {
                  field: 'y_percent',
                  value: Math.round(style.yPercent),
                })
              }
              {...gtmProps('style_position_y', 'subtitle_style', 'axis_y')}
              className="studio-slider w-full"
            />
          </div>
        </div>
      </div>

      {/* Typography */}
      <div className="space-y-3 border-t border-zinc-800/80 pt-4">
        <span className="text-xs font-medium text-zinc-200">{t.stylePanel.typography}</span>
        <div className="grid grid-cols-3 gap-1.5">
          {FONTS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                trackEvent('subtitle_font_select', { font: f.value });
                onChangeStyle({ ...style, fontFamily: f.value });
              }}
              {...gtmProps(
                `style_font_${f.value.toLowerCase().replace(/\s+/g, '_')}`,
                'subtitle_style',
                f.label
              )}
              style={{ fontFamily: `"${f.value}", sans-serif` }}
              className={`min-h-[40px] rounded-lg border px-2 py-1.5 text-xs transition truncate ${
                style.fontFamily === f.value
                  ? 'border-white bg-white text-[#09090B] font-semibold'
                  : 'border-zinc-800 bg-[#09090B] text-zinc-300 hover:border-zinc-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="pt-1">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-zinc-300">{t.stylePanel.fontSize}</span>
            <span className="font-mono text-zinc-400 tabular-nums">{style.fontSize} px</span>
          </div>
          <input
            type="range"
            min={32}
            max={92}
            value={style.fontSize}
            onChange={(e) => onChangeStyle({ ...style, fontSize: Number(e.target.value) })}
            onPointerUp={() =>
              trackEvent('subtitle_style_change', { field: 'font_size', value: style.fontSize })
            }
            onKeyUp={() =>
              trackEvent('subtitle_style_change', { field: 'font_size', value: style.fontSize })
            }
            {...gtmProps('style_font_size', 'subtitle_style', 'font_size')}
            className="studio-slider w-full"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              const nextWeight = style.fontWeight === 700 ? 600 : 700;
              trackEvent('subtitle_style_change', { field: 'bold', value: nextWeight === 700 });
              onChangeStyle({
                ...style,
                fontWeight: nextWeight,
              });
            }}
            {...gtmProps('style_font_bold', 'subtitle_style', 'bold')}
            className={`min-h-[40px] flex-1 rounded-lg border text-xs font-medium transition ${
              style.fontWeight === 700
                ? 'border-white bg-white text-[#09090B]'
                : 'border-zinc-800 bg-[#09090B] text-zinc-300'
            }`}
          >
            {t.stylePanel.bold}
          </button>
          <button
            type="button"
            onClick={() => {
              const nextUpper = !style.uppercase;
              trackEvent('subtitle_style_change', { field: 'uppercase', value: nextUpper });
              onChangeStyle({ ...style, uppercase: nextUpper });
            }}
            {...gtmProps('style_uppercase', 'subtitle_style', 'uppercase')}
            className={`min-h-[40px] flex-1 rounded-lg border text-xs font-medium transition ${
              style.uppercase
                ? 'border-white bg-white text-[#09090B]'
                : 'border-zinc-800 bg-[#09090B] text-zinc-300'
            }`}
          >
            {t.stylePanel.uppercase}
          </button>
        </div>
      </div>

      {/* Colors, Outline, Shadow & Background Box */}
      <div className="space-y-4 border-t border-zinc-800/80 pt-4">
        <div>
          <span className="mb-2 block text-xs font-medium text-zinc-200">{t.stylePanel.textColor}</span>
          <div className="flex flex-wrap items-center gap-2">
            {COLOR_SWATCHES.map((hex) => (
              <button
                key={`txt-${hex}`}
                type="button"
                onClick={() => {
                  trackEvent('subtitle_color_select', { target: 'text', color: hex });
                  onChangeStyle({ ...style, textColor: hex });
                }}
                {...gtmProps(`style_text_color_${hex.replace('#', '')}`, 'subtitle_style', hex)}
                style={{ backgroundColor: hex }}
                aria-label={t.stylePanel.textColorAria(hex)}
                className={`h-8 w-8 rounded-full border-2 transition ${
                  style.textColor.toLowerCase() === hex.toLowerCase()
                    ? 'scale-110 border-[#FF453A]'
                    : 'border-zinc-700'
                }`}
              />
            ))}
            <input
              type="color"
              value={style.textColor}
              onChange={(e) => onChangeStyle({ ...style, textColor: e.target.value })}
              onBlur={(e) =>
                trackEvent('subtitle_color_select', {
                  target: 'text_custom',
                  color: e.target.value,
                })
              }
              {...gtmProps('style_text_color_custom', 'subtitle_style', 'custom_color')}
              aria-label={t.stylePanel.customColorAria}
              className="h-8 w-10 cursor-pointer rounded border border-zinc-700 bg-transparent"
            />
          </div>
        </div>

        {style.animation === 'karaoke' && (
          <div>
            <span className="mb-2 block text-xs font-medium text-zinc-200">
              {t.stylePanel.highlightColor}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {['#FF453A', '#FACC15', '#4ADE80', '#38BDF8', '#FAFAFA'].map((hex) => (
                <button
                  key={`hl-${hex}`}
                  type="button"
                  onClick={() => {
                    trackEvent('subtitle_color_select', { target: 'highlight', color: hex });
                    onChangeStyle({ ...style, highlightColor: hex });
                  }}
                  {...gtmProps(`style_highlight_color_${hex.replace('#', '')}`, 'subtitle_style', hex)}
                  style={{ backgroundColor: hex }}
                  aria-label={t.stylePanel.highlightColorAria(hex)}
                  className={`h-7 w-7 rounded-full border-2 transition ${
                    style.highlightColor.toLowerCase() === hex.toLowerCase()
                      ? 'scale-110 border-white'
                      : 'border-zinc-700'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-zinc-300">{t.stylePanel.stroke}</span>
            <span className="font-mono text-zinc-400 tabular-nums">{style.strokeWidth} px</span>
          </div>
          <input
            type="range"
            min={0}
            max={8}
            step={1}
            value={style.strokeWidth}
            onChange={(e) => onChangeStyle({ ...style, strokeWidth: Number(e.target.value) })}
            onPointerUp={() =>
              trackEvent('subtitle_style_change', {
                field: 'stroke_width',
                value: style.strokeWidth,
              })
            }
            onKeyUp={() =>
              trackEvent('subtitle_style_change', {
                field: 'stroke_width',
                value: style.strokeWidth,
              })
            }
            {...gtmProps('style_stroke_width', 'subtitle_style', 'stroke_width')}
            className="studio-slider w-full"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              const nextShadow = !style.shadowEnabled;
              trackEvent('subtitle_style_change', { field: 'shadow', value: nextShadow });
              onChangeStyle({ ...style, shadowEnabled: nextShadow });
            }}
            {...gtmProps('style_shadow_toggle', 'subtitle_style', 'shadow')}
            className={`min-h-[40px] flex-1 rounded-lg border text-xs font-medium transition ${
              style.shadowEnabled
                ? 'border-white bg-white text-[#09090B]'
                : 'border-zinc-800 bg-[#09090B] text-zinc-300'
            }`}
          >
            {t.stylePanel.shadow}
          </button>
          <button
            type="button"
            onClick={() => {
              const nextBg = !style.bgEnabled;
              trackEvent('subtitle_style_change', { field: 'bg_enabled', value: nextBg });
              onChangeStyle({ ...style, bgEnabled: nextBg });
            }}
            {...gtmProps('style_bg_toggle', 'subtitle_style', 'bg_box')}
            className={`min-h-[40px] flex-1 rounded-lg border text-xs font-medium transition ${
              style.bgEnabled
                ? 'border-white bg-white text-[#09090B]'
                : 'border-zinc-800 bg-[#09090B] text-zinc-300'
            }`}
          >
            {t.stylePanel.bgBox}
          </button>
        </div>

        {style.bgEnabled && (
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-zinc-800 bg-[#09090B] p-3">
            <div>
              <span className="mb-1.5 block text-[11px] text-zinc-400">{t.stylePanel.bgColor}</span>
              <div className="flex items-center gap-2">
                {['#09090B', '#FAFAFA', '#FF453A'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      trackEvent('subtitle_color_select', { target: 'bg', color: c });
                      onChangeStyle({ ...style, bgColor: c });
                    }}
                    {...gtmProps(`style_bg_color_${c.replace('#', '')}`, 'subtitle_style', c)}
                    style={{ backgroundColor: c }}
                    aria-label={t.stylePanel.bgColorAria(c)}
                    className={`h-6 w-6 rounded-full border ${
                      style.bgColor.toLowerCase() === c.toLowerCase()
                        ? 'border-white ring-1 ring-white'
                        : 'border-zinc-600'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-[11px] text-zinc-400">
                <span>{t.stylePanel.opacity}</span>
                <span className="font-mono tabular-nums">
                  {Math.round(style.bgOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.2}
                max={1}
                step={0.05}
                value={style.bgOpacity}
                onChange={(e) => onChangeStyle({ ...style, bgOpacity: Number(e.target.value) })}
                onPointerUp={() =>
                  trackEvent('subtitle_style_change', {
                    field: 'bg_opacity',
                    value: style.bgOpacity,
                  })
                }
                onKeyUp={() =>
                  trackEvent('subtitle_style_change', {
                    field: 'bg_opacity',
                    value: style.bgOpacity,
                  })
                }
                {...gtmProps('style_bg_opacity', 'subtitle_style', 'bg_opacity')}
                className="studio-slider w-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Next Step Navigation */}
      <div className="border-t border-zinc-800/80 pt-4">
        <button
          type="button"
          onClick={() => {
            trackEvent('next_step_click', { from: 'style', to: 'effects' });
            onNextStep();
          }}
          {...gtmProps('style_next_effects', 'navigation', t.stylePanel.nextStep)}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-[#1C1C21] px-4 text-xs font-semibold text-white transition hover:border-zinc-500 hover:bg-zinc-800"
        >
          <span>{t.stylePanel.nextStep}</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
