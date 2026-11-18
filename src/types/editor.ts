export type AspectRatioPreset = 'original' | '9:16' | '16:9' | '1:1' | '4:5' | '21:9';
export type FitMode = 'contain' | 'cover';
export type EditorTab = 'audio' | 'subtitles' | 'style' | 'effects' | 'export';

export interface VideoAsset {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  duration: number;
  width: number;
  height: number;
}

export type CutKind = 'silence' | 'filler' | 'manual';

export interface CutSegment {
  id: string;
  startTime: number;
  endTime: number;
  kind: CutKind;
  enabled: boolean;
  label: string;
  confidence?: number;
}

export interface SubtitleCue {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

export type SubtitleFontFamily =
  | 'DM Sans'
  | 'Bricolage Grotesque'
  | 'Oswald'
  | 'Playfair Display'
  | 'JetBrains Mono';

export type SubtitleAnimation =
  | 'none'
  | 'fade'
  | 'slide-up'
  | 'pop'
  | 'karaoke'
  | 'typewriter';

export type SubtitlePositionPreset = 'top' | 'middle' | 'bottom' | 'custom';

export interface SubtitleStyleConfig {
  fontFamily: SubtitleFontFamily;
  fontSize: number;
  fontWeight: 600 | 700;
  uppercase: boolean;
  textColor: string;
  highlightColor: string;
  strokeColor: string;
  strokeWidth: number;
  shadowEnabled: boolean;
  bgEnabled: boolean;
  bgColor: string;
  bgOpacity: number;
  bgRadius: number;
  positionPreset: SubtitlePositionPreset;
  xPercent: number;
  yPercent: number;
  maxWidthPercent: number;
  animation: SubtitleAnimation;
}

export interface VideoEffectsConfig {
  brightness: number;
  contrast: number;
  exposure: number;
  saturation: number;
  vignette: number;
  blur: number;
  warmth: number;
  blurBorders: boolean;
}

export interface AudioAnalysisConfig {
  silenceThresholdDb: number;
  minSilenceMs: number;
  detectHesitations: boolean;
  hesitationSensitivity: number;
}

export interface TimeRegion {
  startTime: number;
  endTime: number;
}

export interface AudioAnalysisResult {
  peaks: number[];
  duration: number;
  sampleRate: number;
  speechRegions: TimeRegion[];
  detectedCuts: CutSegment[];
}
