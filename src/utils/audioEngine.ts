import type {
  AudioAnalysisConfig,
  AudioAnalysisResult,
  CutSegment,
  SubtitleCue,
  TimeRegion,
} from '../types/editor';

export function formatTimecode(seconds: number, srt = false): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const ms = Math.round((safe - Math.floor(safe)) * 1000);

  const hh = String(hours).padStart(2, '0');
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  const mmm = String(Math.min(999, ms)).padStart(3, '0');

  if (srt) {
    return `${hh}:${mm}:${ss},${mmm}`;
  }
  if (hours > 0) {
    return `${hh}:${mm}:${ss}.${String(Math.floor(ms / 100))}`;
  }
  return `${mm}:${ss}.${String(Math.floor(ms / 100))}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/**
 * Decodes audio from any browser-supported video file and runs local
 * RMS silence detection, speech VAD segmentation, and acoustic hesitation detection.
 */
export async function analyzeVideoAudio(
  fileOrBlob: Blob,
  config: AudioAnalysisConfig,
  fallbackDuration?: number
): Promise<AudioAnalysisResult> {
  let arrayBuffer: ArrayBuffer | null = await fileOrBlob.arrayBuffer();
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();

  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    arrayBuffer = null;
    const duration = audioBuffer.duration || fallbackDuration || 0;
    const sampleRate = audioBuffer.sampleRate;
    const channelCount = audioBuffer.numberOfChannels;

    const length = audioBuffer.length;
    const mono = new Float32Array(length);
    for (let ch = 0; ch < channelCount; ch++) {
      const data = audioBuffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        mono[i] += data[i] / channelCount;
      }
    }

    const peakCount = 280;
    const samplesPerBin = Math.max(1, Math.floor(length / peakCount));
    const peaks: number[] = [];
    for (let b = 0; b < peakCount; b++) {
      const start = b * samplesPerBin;
      const end = Math.min(length, start + samplesPerBin);
      let maxAmp = 0;
      for (let i = start; i < end; i++) {
        const abs = Math.abs(mono[i]);
        if (abs > maxAmp) maxAmp = abs;
      }
      peaks.push(Math.min(1, maxAmp));
    }

    const frameSec = 0.02;
    const frameSamples = Math.max(1, Math.floor(sampleRate * frameSec));
    const frameCount = Math.floor(length / frameSamples);
    const frameRmsDb = new Float32Array(frameCount);
    const frameZcr = new Float32Array(frameCount);

    for (let f = 0; f < frameCount; f++) {
      const start = f * frameSamples;
      let sumSq = 0;
      let zeroCrossings = 0;
      let prev = mono[start];
      for (let i = start; i < start + frameSamples; i++) {
        const v = mono[i];
        sumSq += v * v;
        if ((v >= 0 && prev < 0) || (v < 0 && prev >= 0)) {
          zeroCrossings++;
        }
        prev = v;
      }
      const rms = Math.sqrt(sumSq / frameSamples);
      frameRmsDb[f] = rms > 1e-6 ? 20 * Math.log10(rms) : -96;
      frameZcr[f] = zeroCrossings / frameSamples;
    }

    const minSilenceFrames = Math.max(2, Math.round(config.minSilenceMs / 1000 / frameSec));
    const padSec = 0.05;
    const silences: CutSegment[] = [];
    let silentStartFrame: number | null = null;

    for (let f = 0; f < frameCount; f++) {
      const isSilent = frameRmsDb[f] < config.silenceThresholdDb;
      if (isSilent && silentStartFrame === null) {
        silentStartFrame = f;
      } else if (!isSilent && silentStartFrame !== null) {
        const lenFrames = f - silentStartFrame;
        if (lenFrames >= minSilenceFrames) {
          const rawStart = silentStartFrame * frameSec;
          const rawEnd = f * frameSec;
          const s = rawStart === 0 ? 0 : Math.min(rawEnd - 0.04, rawStart + padSec);
          const e = Math.max(s + 0.06, rawEnd - padSec);
          if (e - s >= 0.12) {
            silences.push({
              id: `cut-sil-${silences.length}-${Math.round(s * 100)}`,
              startTime: Number(s.toFixed(2)),
              endTime: Number(e.toFixed(2)),
              kind: 'silence',
              enabled: true,
              label: `Silencio / Pausa (${(e - s).toFixed(1)}s)`,
            });
          }
        }
        silentStartFrame = null;
      }
    }

    if (silentStartFrame !== null) {
      const lenFrames = frameCount - silentStartFrame;
      if (lenFrames >= minSilenceFrames) {
        const rawStart = silentStartFrame * frameSec;
        const s = Math.min(duration - 0.05, rawStart + padSec);
        const e = duration;
        if (e - s >= 0.12) {
          silences.push({
            id: `cut-sil-${silences.length}-${Math.round(s * 100)}`,
            startTime: Number(s.toFixed(2)),
            endTime: Number(e.toFixed(2)),
            kind: 'silence',
            enabled: true,
            label: `Pausa final (${(e - s).toFixed(1)}s)`,
          });
        }
      }
    }

    const speechRegions: TimeRegion[] = [];
    let cursor = 0;
    for (const sil of silences) {
      if (sil.startTime - cursor >= 0.12) {
        speechRegions.push({
          startTime: Number(cursor.toFixed(2)),
          endTime: Number(sil.startTime.toFixed(2)),
        });
      }
      cursor = sil.endTime;
    }
    if (duration - cursor >= 0.12) {
      speechRegions.push({
        startTime: Number(cursor.toFixed(2)),
        endTime: Number(duration.toFixed(2)),
      });
    }

    const fillerCuts: CutSegment[] = [];
    if (config.detectHesitations) {
      const sensitivityFactor = config.hesitationSensitivity / 100;
      const maxFillerDuration = 0.7 + sensitivityFactor * 0.35;

      for (const region of speechRegions) {
        const regionDur = region.endTime - region.startTime;
        if (regionDur >= 0.16 && regionDur <= maxFillerDuration) {
          const startF = Math.max(0, Math.floor(region.startTime / frameSec));
          const endF = Math.min(frameCount, Math.ceil(region.endTime / frameSec));
          if (endF - startF < 4) continue;

          let meanDb = 0;
          let meanZcr = 0;
          for (let f = startF; f < endF; f++) {
            meanDb += frameRmsDb[f];
            meanZcr += frameZcr[f];
          }
          meanDb /= endF - startF;
          meanZcr /= endF - startF;

          let varianceDb = 0;
          for (let f = startF; f < endF; f++) {
            const diff = frameRmsDb[f] - meanDb;
            varianceDb += diff * diff;
          }
          const stdDevDb = Math.sqrt(varianceDb / (endF - startF));

          const maxAllowedStd = 5.5 + sensitivityFactor * 5.0;
          const maxAllowedZcr = 0.13 + sensitivityFactor * 0.08;

          if (stdDevDb <= maxAllowedStd && meanZcr <= maxAllowedZcr) {
            const confidence = Math.min(
              0.96,
              Math.max(0.55, 1 - stdDevDb / (maxAllowedStd * 1.4))
            );
            fillerCuts.push({
              id: `cut-fil-${fillerCuts.length}-${Math.round(region.startTime * 100)}`,
              startTime: region.startTime,
              endTime: region.endTime,
              kind: 'filler',
              enabled: true,
              label: `Posible muletilla "emm / err" (${regionDur.toFixed(2)}s)`,
              confidence: Number(confidence.toFixed(2)),
            });
          }
        }
      }
    }

    const detectedCuts = mergeSortedCuts([...silences, ...fillerCuts]);

    return {
      peaks,
      duration,
      sampleRate,
      speechRegions,
      detectedCuts,
    };
  } finally {
    await ctx.close().catch(() => {});
  }
}

export interface WavAudioChunk {
  startOffsetSec: number;
  duration: number;
  base64: string;
  mimeType: string;
}

function encodePcmToWavBase64(pcm: Float32Array, sampleRate: number): string {
  const wavBuffer = new ArrayBuffer(44 + pcm.length * 2);
  const view = new DataView(wavBuffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, pcm.length * 2, true);

  let offset = 44;
  for (let i = 0; i < pcm.length; i++) {
    const sample = Math.max(-1, Math.min(1, pcm[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  const bytes = new Uint8Array(wavBuffer);
  let binary = '';
  const chunkSize = 0x4000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/**
 * Extracts and downsamples a video's audio track into 16kHz mono 16-bit WAV chunks
 * (up to 4 min per chunk) so even long videos up to 500 MB stay safely within API payload limits.
 */
export async function extractCompactWavChunksForTranscription(
  blob: Blob,
  maxChunkDurationSec = 240
): Promise<{
  chunks: WavAudioChunk[];
  totalDuration: number;
}> {
  let arrayBuffer: ArrayBuffer | null = await blob.arrayBuffer();
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();

  try {
    let decoded: AudioBuffer;
    try {
      decoded = await ctx.decodeAudioData(arrayBuffer);
      arrayBuffer = null;
    } catch {
      arrayBuffer = null;
      throw new Error(
        'No se pudo extraer una pista de audio legible de este video en el navegador.'
      );
    }

    const totalDuration = decoded.duration || 1;
    const targetRate = 16000;
    const OfflineCtx =
      window.OfflineAudioContext ||
      (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
        .webkitOfflineAudioContext;
    if (!OfflineCtx) {
      throw new Error('Tu navegador no soporta procesamiento de audio sin conexión.');
    }

    const chunks: WavAudioChunk[] = [];
    for (let startOffset = 0; startOffset < totalDuration; startOffset += maxChunkDurationSec) {
      const chunkDur = Math.min(maxChunkDurationSec, totalDuration - startOffset);
      if (chunkDur < 0.08 && chunks.length > 0) break;

      const frameCount = Math.max(1, Math.ceil(chunkDur * targetRate));
      const offline = new OfflineCtx(1, frameCount, targetRate);
      const source = offline.createBufferSource();
      source.buffer = decoded;
      source.connect(offline.destination);
      source.start(0, startOffset, chunkDur);

      const rendered = await offline.startRendering();
      const base64 = encodePcmToWavBase64(rendered.getChannelData(0), targetRate);
      chunks.push({
        startOffsetSec: startOffset,
        duration: chunkDur,
        base64,
        mimeType: 'audio/wav',
      });
    }

    return { chunks, totalDuration };
  } finally {
    await ctx.close().catch(() => {});
  }
}

export async function extractCompactWavForTranscription(blob: Blob): Promise<{
  base64: string;
  mimeType: string;
  duration: number;
}> {
  const { chunks, totalDuration } = await extractCompactWavChunksForTranscription(blob, 3600);
  const first = chunks[0];
  return {
    base64: first?.base64 || '',
    mimeType: first?.mimeType || 'audio/wav',
    duration: totalDuration,
  };
}

export function mergeSortedCuts(cuts: CutSegment[]): CutSegment[] {
  return [...cuts].sort((a, b) => a.startTime - b.startTime);
}

export function getEnabledCutIntervals(cuts: CutSegment[]): TimeRegion[] {
  const enabled = cuts
    .filter((c) => c.enabled && c.endTime > c.startTime)
    .sort((a, b) => a.startTime - b.startTime);

  const merged: TimeRegion[] = [];
  for (const cut of enabled) {
    const last = merged[merged.length - 1];
    if (last && cut.startTime <= last.endTime + 0.02) {
      last.endTime = Math.max(last.endTime, cut.endTime);
    } else {
      merged.push({ startTime: cut.startTime, endTime: cut.endTime });
    }
  }
  return merged;
}

export function getKeptTimeRanges(duration: number, cuts: CutSegment[]): TimeRegion[] {
  const mergedCuts = getEnabledCutIntervals(cuts);
  const kept: TimeRegion[] = [];
  let cursor = 0;

  for (const cut of mergedCuts) {
    if (cut.startTime > cursor + 0.01) {
      kept.push({ startTime: cursor, endTime: Math.min(duration, cut.startTime) });
    }
    cursor = Math.max(cursor, cut.endTime);
  }
  if (duration > cursor + 0.01) {
    kept.push({ startTime: cursor, endTime: duration });
  }
  return kept;
}

export function getEditedDuration(originalDuration: number, cuts: CutSegment[]): number {
  const merged = getEnabledCutIntervals(cuts);
  const cutTotal = merged.reduce((acc, c) => acc + Math.max(0, c.endTime - c.startTime), 0);
  return Math.max(0, originalDuration - cutTotal);
}

export function mapOriginalToEditedTime(originalTime: number, cuts: CutSegment[]): number {
  const merged = getEnabledCutIntervals(cuts);
  let removedBefore = 0;
  for (const c of merged) {
    if (originalTime >= c.endTime) {
      removedBefore += c.endTime - c.startTime;
    } else if (originalTime > c.startTime) {
      removedBefore += originalTime - c.startTime;
      break;
    } else {
      break;
    }
  }
  return Math.max(0, originalTime - removedBefore);
}

export function generateSrt(
  cues: SubtitleCue[],
  cuts: CutSegment[],
  applyCuts: boolean
): string {
  const sorted = [...cues]
    .filter((c) => c.text.trim().length > 0 && c.endTime > c.startTime)
    .sort((a, b) => a.startTime - b.startTime);

  const lines: string[] = [];
  let index = 1;

  for (const cue of sorted) {
    const start = applyCuts ? mapOriginalToEditedTime(cue.startTime, cuts) : cue.startTime;
    const end = applyCuts ? mapOriginalToEditedTime(cue.endTime, cuts) : cue.endTime;
    if (end - start < 0.05) continue;

    lines.push(`${index}`);
    lines.push(`${formatTimecode(start, true)} --> ${formatTimecode(end, true)}`);
    lines.push(cue.text.trim());
    lines.push('');
    index++;
  }

  return lines.join('\n');
}

export async function createSampleDemoVideo(): Promise<{
  blob: Blob;
  cues: SubtitleCue[];
}> {
  const width = 720;
  const height = 1280;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtx();
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume().catch(() => {});
  }
  const dest = audioCtx.createMediaStreamDestination();

  const osc = audioCtx.createOscillator();
  const mod = audioCtx.createOscillator();
  const modGain = audioCtx.createGain();
  const gain = audioCtx.createGain();

  osc.type = 'triangle';
  osc.frequency.value = 175;
  mod.type = 'sine';
  mod.frequency.value = 4.5;
  modGain.gain.value = 28;
  mod.connect(modGain);
  modGain.connect(osc.frequency);

  osc.connect(gain);
  gain.connect(dest);

  const t0 = audioCtx.currentTime;
  gain.gain.setValueAtTime(0.0001, t0);

  gain.gain.setValueAtTime(0.0001, t0 + 0.78);
  gain.gain.linearRampToValueAtTime(0.28, t0 + 0.85);
  osc.frequency.setValueAtTime(195, t0 + 0.85);
  osc.frequency.linearRampToValueAtTime(240, t0 + 1.6);
  osc.frequency.linearRampToValueAtTime(185, t0 + 2.5);
  gain.gain.linearRampToValueAtTime(0.0001, t0 + 2.58);

  gain.gain.setValueAtTime(0.0001, t0 + 2.65);
  gain.gain.linearRampToValueAtTime(0.16, t0 + 2.7);
  modGain.gain.setValueAtTime(2, t0 + 2.65);
  osc.frequency.setValueAtTime(145, t0 + 2.65);
  gain.gain.setValueAtTime(0.16, t0 + 3.05);
  gain.gain.linearRampToValueAtTime(0.0001, t0 + 3.12);

  gain.gain.setValueAtTime(0.0001, t0 + 3.98);
  modGain.gain.setValueAtTime(32, t0 + 3.98);
  gain.gain.linearRampToValueAtTime(0.32, t0 + 4.06);
  osc.frequency.setValueAtTime(210, t0 + 4.06);
  osc.frequency.linearRampToValueAtTime(260, t0 + 5.2);
  osc.frequency.linearRampToValueAtTime(190, t0 + 6.25);
  gain.gain.linearRampToValueAtTime(0.0001, t0 + 6.32);

  gain.gain.setValueAtTime(0.0001, t0 + 7.08);
  gain.gain.linearRampToValueAtTime(0.3, t0 + 7.15);
  osc.frequency.setValueAtTime(200, t0 + 7.15);
  osc.frequency.linearRampToValueAtTime(250, t0 + 8.3);
  osc.frequency.linearRampToValueAtTime(180, t0 + 9.35);
  gain.gain.linearRampToValueAtTime(0.0001, t0 + 9.42);

  const canvasWithCapture = canvas as HTMLCanvasElement & {
    mozCaptureStream?: (frameRate?: number) => MediaStream;
  };
  const canvasStream = canvasWithCapture.captureStream
    ? canvasWithCapture.captureStream(30)
    : canvasWithCapture.mozCaptureStream!(30);
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);

  const mimeCandidates = [
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm',
    'video/mp4',
  ];
  const supportedMime =
    typeof MediaRecorder !== 'undefined'
      ? mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m))
      : undefined;

  const recorder = supportedMime
    ? new MediaRecorder(combinedStream, { mimeType: supportedMime })
    : new MediaRecorder(combinedStream);
  const mimeType = recorder.mimeType || supportedMime || 'video/webm';
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  osc.start(t0);
  mod.start(t0);
  recorder.start(100);

  const startMs = performance.now();
  const totalMs = 9800;

  await new Promise<void>((resolve) => {
    const draw = () => {
      const elapsed = performance.now() - startMs;
      const sec = elapsed / 1000;

      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#141419');
      grad.addColorStop(0.5, '#1D1D24');
      grad.addColorStop(1, '#09090D');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      const pulse = Math.sin(sec * 3) * 18;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 2;
      for (let r = 120; r <= 360; r += 80) {
        ctx.beginPath();
        ctx.arc(width / 2, height * 0.42, r + pulse, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = '#272730';
      ctx.beginPath();
      ctx.arc(width / 2, height * 0.36, 92, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FAFAFA';
      ctx.font = '600 28px "DM Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CLIP DE PRUEBA LOCAL', width / 2, height * 0.56);

      ctx.fillStyle = '#A1A1AA';
      ctx.font = '500 22px "JetBrains Mono", monospace';
      ctx.fillText(`${sec.toFixed(1)}s`, width / 2, height * 0.6);

      if (elapsed < totalMs) {
        requestAnimationFrame(draw);
      } else {
        recorder.stop();
        osc.stop();
        mod.stop();
        resolve();
      }
    };
    requestAnimationFrame(draw);
  });

  await new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  await audioCtx.close().catch(() => {});

  const blob = new Blob(chunks, { type: mimeType });
  const cues: SubtitleCue[] = [
    {
      id: 'demo-cue-1',
      startTime: 0.8,
      endTime: 2.58,
      text: 'Graba tu video directo en Android',
    },
    {
      id: 'demo-cue-2',
      startTime: 3.98,
      endTime: 6.32,
      text: 'Elimina pausas y muletillas al instante',
    },
    {
      id: 'demo-cue-3',
      startTime: 7.08,
      endTime: 9.42,
      text: 'Exporta subtítulos animados en cualquier formato',
    },
  ];

  return { blob, cues };
}
