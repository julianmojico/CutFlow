import type {
  AspectRatioPreset,
  SubtitleCue,
  SubtitleStyleConfig,
  VideoEffectsConfig,
} from '../types/editor';

export function buildCssFilterString(effects: VideoEffectsConfig): string {
  const combinedBrightness = (effects.brightness / 100) * (effects.exposure / 100) * 100;
  const parts: string[] = [];

  if (Math.abs(combinedBrightness - 100) >= 0.2) {
    parts.push(`brightness(${combinedBrightness.toFixed(1)}%)`);
  }
  if (Math.abs(effects.contrast - 100) >= 0.2) {
    parts.push(`contrast(${effects.contrast.toFixed(1)}%)`);
  }
  if (Math.abs(effects.saturation - 100) >= 0.2) {
    parts.push(`saturate(${effects.saturation.toFixed(1)}%)`);
  }
  if (effects.blur > 0.05) {
    parts.push(`blur(${effects.blur.toFixed(1)}px)`);
  }
  if (effects.warmth > 0) {
    parts.push(`sepia(${(effects.warmth * 0.8).toFixed(1)}%)`);
  } else if (effects.warmth < 0) {
    parts.push(`hue-rotate(${(effects.warmth * 0.45).toFixed(1)}deg)`);
  }

  return parts.length > 0 ? parts.join(' ') : 'none';
}

export const STANDARD_ASPECT_OPTIONS: Array<{
  value: Exclude<AspectRatioPreset, 'native'>;
  label: string;
  ratio: number;
}> = [
  { value: '9:16', label: '9:16', ratio: 9 / 16 },
  { value: '16:9', label: '16:9', ratio: 16 / 9 },
  { value: '1:1', label: '1:1', ratio: 1 },
  { value: '4:5', label: '4:5', ratio: 4 / 5 },
  { value: '21:9', label: '21:9', ratio: 21 / 9 },
];

function formatCustomAspectRatio(width: number, height: number): string {
  const actual = width / height;
  const commonRatios: Array<[number, number]> = [
    [4, 3],
    [3, 4],
    [3, 2],
    [2, 3],
    [16, 10],
    [10, 16],
    [5, 4],
    [4, 5],
    [5, 3],
    [3, 5],
    [18, 9],
    [9, 18],
    [19, 9],
    [9, 19],
    [20, 9],
    [9, 20],
    [9, 21],
  ];

  for (const [a, b] of commonRatios) {
    if (Math.abs(Math.log(actual / (a / b))) <= 0.028) {
      return `${a}:${b}`;
    }
  }

  let bestA = 16;
  let bestB = 9;
  let bestErr = Infinity;
  for (let b = 1; b <= 20; b++) {
    const a = Math.max(1, Math.round(actual * b));
    if (a > 25) continue;
    const err = Math.abs(actual - a / b);
    if (err < bestErr) {
      bestErr = err;
      bestA = a;
      bestB = b;
    }
  }

  const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));
  const d = gcd(bestA, bestB);
  return `${bestA / d}:${bestB / d}`;
}

export function detectVideoAspectRatio(
  width: number,
  height: number
): { preset: AspectRatioPreset; nativeLabel: string | null; displayLabel: string } {
  if (!width || !height || width <= 0 || height <= 0) {
    return { preset: '16:9', nativeLabel: null, displayLabel: '16:9' };
  }

  const actual = width / height;
  let closest = STANDARD_ASPECT_OPTIONS[1];
  let minDiff = Infinity;

  for (const opt of STANDARD_ASPECT_OPTIONS) {
    const diff = Math.abs(Math.log(actual / opt.ratio));
    if (diff < minDiff) {
      minDiff = diff;
      closest = opt;
    }
  }

  if (minDiff <= 0.05) {
    return { preset: closest.value, nativeLabel: null, displayLabel: closest.label };
  }

  const customLabel = formatCustomAspectRatio(width, height);
  return {
    preset: 'native',
    nativeLabel: customLabel,
    displayLabel: customLabel,
  };
}

export function getAspectOptions(
  nativeLabel: string | null
): Array<{ value: AspectRatioPreset; label: string }> {
  const base: Array<{ value: AspectRatioPreset; label: string }> = STANDARD_ASPECT_OPTIONS.map(
    ({ value, label }) => ({ value, label })
  );
  if (nativeLabel) {
    return [{ value: 'native', label: nativeLabel }, ...base];
  }
  return base;
}

export function resolveCanvasDimensions(
  preset: AspectRatioPreset,
  sourceWidth: number,
  sourceHeight: number,
  quality: 'original' | '1080p' | '720p'
): { width: number; height: number } {
  const safeW = Math.max(320, sourceWidth || 1280);
  const safeH = Math.max(320, sourceHeight || 720);

  let ratio = safeW / safeH;
  switch (preset) {
    case '9:16':
      ratio = 9 / 16;
      break;
    case '16:9':
      ratio = 16 / 9;
      break;
    case '1:1':
      ratio = 1;
      break;
    case '4:5':
      ratio = 4 / 5;
      break;
    case '21:9':
      ratio = 21 / 9;
      break;
    case 'native':
    default:
      ratio = safeW / safeH;
      break;
  }

  if (quality === 'original' && preset === 'native') {
    return {
      width: Math.round(safeW / 2) * 2,
      height: Math.round(safeH / 2) * 2,
    };
  }

  const shortSide = quality === '720p' ? 720 : 1080;
  let width: number;
  let height: number;

  if (ratio >= 1) {
    height = shortSide;
    width = Math.round((shortSide * ratio) / 2) * 2;
  } else {
    width = shortSide;
    height = Math.round((shortSide / ratio) / 2) * 2;
  }

  return { width, height };
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0');
  const num = parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function computeAnimationFrame(
  cue: SubtitleCue,
  currentTime: number,
  style: SubtitleStyleConfig
) {
  const raw = style.uppercase ? cue.text.toUpperCase() : cue.text;
  const trimmed = raw.trim();
  const duration = Math.max(0.15, cue.endTime - cue.startTime);
  const elapsed = Math.max(0, currentTime - cue.startTime);
  const progress = Math.min(1, Math.max(0, elapsed / duration));

  const introDur = Math.min(0.42, duration * 0.45);
  const intro = Math.min(1, elapsed / Math.max(0.08, introDur));
  const eased = 1 - Math.pow(1 - intro, 3);

  const isTyping = style.animation === 'typewriter' && progress < 0.8;
  const displayText =
    style.animation === 'typewriter'
      ? trimmed.slice(0, Math.max(1, Math.ceil(trimmed.length * Math.min(1, progress / 0.8))))
      : trimmed;

  let alpha = 1;
  let scale = 1;
  let offsetYRatio = 0;

  if (style.animation === 'fade') {
    alpha = eased;
  } else if (style.animation === 'slide-up') {
    alpha = eased;
    offsetYRatio = (1 - eased) * 0.05;
  } else if (style.animation === 'pop') {
    alpha = Math.min(1, elapsed / 0.12);
    if (intro < 0.65) {
      const p = intro / 0.65;
      scale = 0.6 + 0.54 * (1 - Math.pow(1 - p, 2));
    } else {
      const p = (intro - 0.65) / 0.35;
      scale = 1.14 - 0.14 * p;
    }
  }

  const allWords = trimmed.split(/\s+/).filter(Boolean);
  const activeWordIdx = Math.min(
    Math.max(0, allWords.length - 1),
    Math.floor(progress * allWords.length)
  );

  return {
    displayText: isTyping ? `${displayText}|` : displayText,
    alpha,
    scale,
    offsetYRatio,
    activeWordIdx,
  };
}

export function renderSubtitleToCanvas(
  ctx: CanvasRenderingContext2D,
  cue: SubtitleCue,
  currentTime: number,
  style: SubtitleStyleConfig,
  canvasWidth: number,
  canvasHeight: number
) {
  const anim = computeAnimationFrame(cue, currentTime, style);
  if (!anim.displayText.trim()) return;

  const minDim = Math.min(canvasWidth, canvasHeight);
  const scaledFontSize = Math.round((style.fontSize / 1080) * minDim * 1.35);

  ctx.save();
  ctx.globalAlpha = anim.alpha;
  ctx.font = `${style.fontWeight} ${scaledFontSize}px "${style.fontFamily}", sans-serif`;
  ctx.textBaseline = 'middle';

  const maxBoxW = canvasWidth * (style.maxWidthPercent / 100);
  const words = anim.displayText.split(/\s+/).filter(Boolean);

  const lines: string[][] = [];
  let currentLine: string[] = [];
  for (const word of words) {
    const candidate = [...currentLine, word].join(' ');
    if (ctx.measureText(candidate).width > maxBoxW && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = [word];
    } else {
      currentLine.push(word);
    }
  }
  if (currentLine.length > 0) lines.push(currentLine);

  const lineHeight = scaledFontSize * 1.24;
  const totalHeight = lines.length * lineHeight;
  const lineWidths = lines.map((line) => ctx.measureText(line.join(' ')).width);
  const maxLineWidth = Math.max(...lineWidths, 0);

  const centerX = canvasWidth * (style.xPercent / 100);
  const centerY = canvasHeight * (style.yPercent / 100) + anim.offsetYRatio * canvasHeight;

  ctx.translate(centerX, centerY);
  ctx.scale(anim.scale, anim.scale);

  if (style.bgEnabled) {
    const padX = scaledFontSize * 0.55;
    const padY = scaledFontSize * 0.34;
    ctx.fillStyle = hexToRgba(style.bgColor, style.bgOpacity);
    drawRoundedRect(
      ctx,
      -maxLineWidth / 2 - padX,
      -totalHeight / 2 - padY,
      maxLineWidth + padX * 2,
      totalHeight + padY * 2,
      (style.bgRadius / 40) * scaledFontSize
    );
    ctx.fill();
  }

  let globalWordIdx = 0;
  lines.forEach((lineWords, lineIndex) => {
    const y = -totalHeight / 2 + lineHeight * (lineIndex + 0.5);
    const fullLineWidth = lineWidths[lineIndex];
    let xCursor = -fullLineWidth / 2;
    const spaceWidth = ctx.measureText(' ').width;

    lineWords.forEach((word, wIdx) => {
      const wordWidth = ctx.measureText(word).width;
      const isActiveKaraoke =
        style.animation === 'karaoke' && globalWordIdx === anim.activeWordIdx;

      ctx.save();
      const wordCenterX = xCursor + wordWidth / 2;
      if (isActiveKaraoke) {
        ctx.translate(wordCenterX, y);
        ctx.scale(1.1, 1.1);
        ctx.translate(-wordCenterX, -y);
      }

      ctx.textAlign = 'left';
      if (style.shadowEnabled) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = scaledFontSize * 0.22;
        ctx.shadowOffsetY = scaledFontSize * 0.06;
      } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
      }

      if (style.strokeWidth > 0) {
        ctx.lineJoin = 'round';
        ctx.lineWidth = (style.strokeWidth / 4) * (scaledFontSize * 0.16);
        ctx.strokeStyle = style.strokeColor;
        ctx.strokeText(word, xCursor, y);
      }

      ctx.fillStyle = isActiveKaraoke ? style.highlightColor : style.textColor;
      ctx.fillText(word, xCursor, y);
      ctx.restore();

      xCursor += wordWidth + (wIdx < lineWords.length - 1 ? spaceWidth : 0);
      globalWordIdx++;
    });
  });

  ctx.restore();
}
