import React from 'react';
import { ArrowRight, Play } from '../Icons';
import type {
  SubtitleAnimation,
  SubtitleFontFamily,
  SubtitlePositionPreset,
  SubtitleStyleConfig,
} from '../../types/editor';

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

const ANIMATIONS: Array<{ value: SubtitleAnimation; label: string }> = [
  { value: 'none', label: 'Estático' },
  { value: 'fade', label: 'Aparición' },
  { value: 'slide-up', label: 'Deslizar' },
  { value: 'pop', label: 'Pop' },
  { value: 'karaoke', label: 'Karaoke' },
  { value: 'typewriter', label: 'Máquina' },
];

const POSITIONS: Array<{ value: SubtitlePositionPreset; label: string; y: number }> = [
  { value: 'top', label: 'Superior', y: 18 },
  { value: 'middle', label: 'Centro', y: 50 },
  { value: 'bottom', label: 'Inferior', y: 82 },
];

const COLOR_SWATCHES = ['#FAFAFA', '#FACC15', '#FF453A', '#38BDF8', '#4ADE80', '#09090B'];

export const StyleAnimationPanel: React.FC<StyleAnimationPanelProps> = ({
  style,
  onChangeStyle,
  onReplayAnimation,
  onNextStep,
}) => {
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
          Ubicación, fuente y animación
        </h2>
        <p className="mt-0.5 text-xs text-zinc-400">
          También puedes arrastrar el texto directo sobre el video
        </p>
      </div>

      {/* Animation Presets */}
      <div className="space-y-2 border-t border-zinc-800/80 pt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-zinc-200">Animación de entrada</span>
          <button
            type="button"
            onClick={onReplayAnimation}
            className="inline-flex min-h-[30px] items-center gap-1 rounded-md border border-zinc-700 bg-[#1C1C21] px-2 text-[11px] font-medium text-zinc-200 hover:border-zinc-500 hover:text-white"
          >
            <Play className="h-3 w-3" />
            <span>Probar</span>
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {ANIMATIONS.map((anim) => (
            <button
              key={anim.value}
              type="button"
              onClick={() => {
                onChangeStyle({ ...style, animation: anim.value });
                onReplayAnimation();
              }}
              className={`min-h-[40px] rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                style.animation === anim.value
                  ? 'border-white bg-white text-[#09090B]'
                  : 'border-zinc-800 bg-[#09090B] text-zinc-300 hover:border-zinc-600 hover:text-white'
              }`}
            >
              {anim.label}
            </button>
          ))}
        </div>
      </div>

      {/* Position Presets + X/Y Fine Tuning */}
      <div className="space-y-3 border-t border-zinc-800/80 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-200">Ubicación en lienzo</span>
          <span className="font-mono text-[11px] text-zinc-400 tabular-nums">
            X {Math.round(style.xPercent)}% · Y {Math.round(style.yPercent)}%
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {POSITIONS.map((pos) => (
            <button
              key={pos.value}
              type="button"
              onClick={() => setPositionPreset(pos.value, pos.y)}
              className={`min-h-[40px] rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                style.positionPreset === pos.value
                  ? 'border-white bg-white text-[#09090B]'
                  : 'border-zinc-800 bg-[#09090B] text-zinc-300 hover:border-zinc-600'
              }`}
            >
              {pos.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <div className="mb-1 flex justify-between text-[11px] text-zinc-400">
              <span>Eje X</span>
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
              className="studio-slider w-full"
            />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-[11px] text-zinc-400">
              <span>Eje Y</span>
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
              className="studio-slider w-full"
            />
          </div>
        </div>
      </div>

      {/* Typography */}
      <div className="space-y-3 border-t border-zinc-800/80 pt-4">
        <span className="text-xs font-medium text-zinc-200">Tipografía</span>
        <div className="grid grid-cols-3 gap-1.5">
          {FONTS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => onChangeStyle({ ...style, fontFamily: f.value })}
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
            <span className="text-zinc-300">Tamaño de fuente</span>
            <span className="font-mono text-zinc-400 tabular-nums">{style.fontSize} px</span>
          </div>
          <input
            type="range"
            min={32}
            max={92}
            value={style.fontSize}
            onChange={(e) => onChangeStyle({ ...style, fontSize: Number(e.target.value) })}
            className="studio-slider w-full"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              onChangeStyle({
                ...style,
                fontWeight: style.fontWeight === 700 ? 600 : 700,
              })
            }
            className={`min-h-[40px] flex-1 rounded-lg border text-xs font-medium transition ${
              style.fontWeight === 700
                ? 'border-white bg-white text-[#09090B]'
                : 'border-zinc-800 bg-[#09090B] text-zinc-300'
            }`}
          >
            Negrita (700)
          </button>
          <button
            type="button"
            onClick={() => onChangeStyle({ ...style, uppercase: !style.uppercase })}
            className={`min-h-[40px] flex-1 rounded-lg border text-xs font-medium transition ${
              style.uppercase
                ? 'border-white bg-white text-[#09090B]'
                : 'border-zinc-800 bg-[#09090B] text-zinc-300'
            }`}
          >
            MAYÚSCULAS
          </button>
        </div>
      </div>

      {/* Colors, Outline, Shadow & Background Box */}
      <div className="space-y-4 border-t border-zinc-800/80 pt-4">
        <div>
          <span className="mb-2 block text-xs font-medium text-zinc-200">Color de texto</span>
          <div className="flex flex-wrap items-center gap-2">
            {COLOR_SWATCHES.map((hex) => (
              <button
                key={`txt-${hex}`}
                type="button"
                onClick={() => onChangeStyle({ ...style, textColor: hex })}
                style={{ backgroundColor: hex }}
                aria-label={`Color de texto ${hex}`}
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
              aria-label="Color personalizado"
              className="h-8 w-10 cursor-pointer rounded border border-zinc-700 bg-transparent"
            />
          </div>
        </div>

        {style.animation === 'karaoke' && (
          <div>
            <span className="mb-2 block text-xs font-medium text-zinc-200">
              Color activo (Karaoke)
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {['#FF453A', '#FACC15', '#4ADE80', '#38BDF8', '#FAFAFA'].map((hex) => (
                <button
                  key={`hl-${hex}`}
                  type="button"
                  onClick={() => onChangeStyle({ ...style, highlightColor: hex })}
                  style={{ backgroundColor: hex }}
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
            <span className="text-zinc-300">Contorno / Trazo</span>
            <span className="font-mono text-zinc-400 tabular-nums">{style.strokeWidth} px</span>
          </div>
          <input
            type="range"
            min={0}
            max={8}
            step={1}
            value={style.strokeWidth}
            onChange={(e) => onChangeStyle({ ...style, strokeWidth: Number(e.target.value) })}
            className="studio-slider w-full"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChangeStyle({ ...style, shadowEnabled: !style.shadowEnabled })}
            className={`min-h-[40px] flex-1 rounded-lg border text-xs font-medium transition ${
              style.shadowEnabled
                ? 'border-white bg-white text-[#09090B]'
                : 'border-zinc-800 bg-[#09090B] text-zinc-300'
            }`}
          >
            Sombra
          </button>
          <button
            type="button"
            onClick={() => onChangeStyle({ ...style, bgEnabled: !style.bgEnabled })}
            className={`min-h-[40px] flex-1 rounded-lg border text-xs font-medium transition ${
              style.bgEnabled
                ? 'border-white bg-white text-[#09090B]'
                : 'border-zinc-800 bg-[#09090B] text-zinc-300'
            }`}
          >
            Caja de fondo
          </button>
        </div>

        {style.bgEnabled && (
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-zinc-800 bg-[#09090B] p-3">
            <div>
              <span className="mb-1.5 block text-[11px] text-zinc-400">Color de caja</span>
              <div className="flex items-center gap-2">
                {['#09090B', '#FAFAFA', '#FF453A'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onChangeStyle({ ...style, bgColor: c })}
                    style={{ backgroundColor: c }}
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
                <span>Opacidad</span>
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
          onClick={onNextStep}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-[#1C1C21] px-4 text-xs font-semibold text-white transition hover:border-zinc-500 hover:bg-zinc-800"
        >
          <span>Aplicar efectos</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
