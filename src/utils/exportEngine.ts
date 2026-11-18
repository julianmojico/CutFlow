import type {
  AspectRatioPreset,
  CutSegment,
  FitMode,
  SubtitleCue,
  SubtitleStyleConfig,
  VideoAsset,
  VideoEffectsConfig,
} from '../types/editor';
import { getEditedDuration, getKeptTimeRanges } from './audioEngine';
import {
  buildCssFilterString,
  renderSubtitleToCanvas,
  resolveCanvasDimensions,
} from './subtitleRenderer';

export interface ExportOptions {
  asset: VideoAsset;
  cuts: CutSegment[];
  cues: SubtitleCue[];
  subtitleStyle: SubtitleStyleConfig;
  effects: VideoEffectsConfig;
  aspectRatio: AspectRatioPreset;
  fitMode: FitMode;
  quality: 'original' | '1080p' | '720p';
  onProgress: (percent: number, stageLabel: string) => void;
  signal: AbortSignal;
}

export interface ExportResult {
  blob: Blob;
  extension: 'mp4';
  mimeType: 'video/mp4';
  duration: number;
}

function pickSupportedMimeType(): string | undefined {
  const candidates = [
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm',
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4',
  ];

  if (typeof MediaRecorder === 'undefined') return undefined;
  for (const mimeType of candidates) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }
  return undefined;
}

export async function exportEditedVideo(options: ExportOptions): Promise<ExportResult> {
  const {
    asset,
    cuts,
    cues,
    subtitleStyle,
    effects,
    aspectRatio,
    fitMode,
    quality,
    onProgress,
    signal,
  } = options;

  const keptRanges = getKeptTimeRanges(asset.duration, cuts);
  if (keptRanges.length === 0) {
    throw new Error(
      'Todos los segmentos del video están cortados. Activa al menos un segmento para exportar.'
    );
  }

  const targetDuration = getEditedDuration(asset.duration, cuts);
  const { width, height } = resolveCanvasDimensions(aspectRatio, asset.width, asset.height, quality);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style.position = 'fixed';
  canvas.style.left = '0';
  canvas.style.top = '0';
  canvas.style.width = '2px';
  canvas.style.height = '2px';
  canvas.style.opacity = '0.01';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '-1';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    canvas.remove();
    throw new Error('No se pudo inicializar el lienzo 2D de exportación.');
  }

  const video = document.createElement('video');
  if (!asset.url.startsWith('blob:') && !asset.url.startsWith('data:')) {
    video.crossOrigin = 'anonymous';
  }
  video.src = asset.url;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.muted = false;
  video.preload = 'auto';
  video.style.position = 'fixed';
  video.style.left = '0';
  video.style.top = '0';
  video.style.width = '2px';
  video.style.height = '2px';
  video.style.opacity = '0.01';
  video.style.pointerEvents = 'none';
  video.style.zIndex = '-1';
  document.body.appendChild(video);

  let audioCtx: AudioContext | null = null;
  let combinedStream: MediaStream | null = null;
  let activeUploadId: string | null = null;

  try {
    if (video.readyState < 2) {
      await new Promise<void>((resolve, reject) => {
        const onLoaded = () => {
          cleanup();
          resolve();
        };
        const onErr = () => {
          cleanup();
          reject(new Error('No se pudo cargar el archivo de video para renderizar.'));
        };
        const cleanup = () => {
          video.removeEventListener('loadeddata', onLoaded);
          video.removeEventListener('canplay', onLoaded);
          video.removeEventListener('error', onErr);
        };
        video.addEventListener('loadeddata', onLoaded);
        video.addEventListener('canplay', onLoaded);
        video.addEventListener('error', onErr);
      });
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioCtx();
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume().catch(() => {});
    }
    const sourceNode = audioCtx.createMediaElementSource(video);
    const gainNode = audioCtx.createGain();
    const audioDest = audioCtx.createMediaStreamDestination();

    sourceNode.connect(gainNode);
    gainNode.connect(audioDest);

    const canvasWithCapture = canvas as HTMLCanvasElement & {
      mozCaptureStream?: (frameRate?: number) => MediaStream;
    };
    const captureFn = canvasWithCapture.captureStream || canvasWithCapture.mozCaptureStream;
    if (!captureFn) {
      throw new Error('Tu navegador no soporta captura de lienzo para exportar video.');
    }
    const canvasStream = captureFn.call(canvas, 30);
    combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioDest.stream.getAudioTracks(),
    ]);

    if (typeof MediaRecorder === 'undefined') {
      throw new Error('Tu navegador no soporta grabación de exportación (MediaRecorder).');
    }

    const supportedMime = pickSupportedMimeType();
    const targetBps = quality === '720p' ? 3_000_000 : 4_800_000;
    let recorder: MediaRecorder;
    try {
      recorder = supportedMime
        ? new MediaRecorder(combinedStream, {
            mimeType: supportedMime,
            videoBitsPerSecond: targetBps,
          })
        : new MediaRecorder(combinedStream, { videoBitsPerSecond: targetBps });
    } catch {
      recorder = new MediaRecorder(combinedStream);
    }
    const mimeType = recorder.mimeType || supportedMime || 'video/webm';

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const filterString = buildCssFilterString(effects);
    const bgBaseFilterString = buildCssFilterString({ ...effects, blur: 0 });
    const bgBlurPx = Math.max(20, Math.round(Math.min(width, height) * 0.032));
    const supportsCtxFilter = 'filter' in ctx;
    let hasPaintedVideoFrame = false;

    const drawFrame = () => {
      const vw = video.videoWidth || asset.width;
      const vh = video.videoHeight || asset.height;
      const videoReady = video.readyState >= 2 && vw > 0 && vh > 0;

      if (!videoReady && hasPaintedVideoFrame) {
        return;
      }

      ctx.save();
      ctx.fillStyle = '#09090B';
      ctx.fillRect(0, 0, width, height);

      if (videoReady) {
        hasPaintedVideoFrame = true;
        const srcRatio = vw / vh;
        const dstRatio = width / height;

        if (effects.blurBorders && fitMode === 'contain') {
          let coverW = width;
          let coverH = height;
          if (srcRatio > dstRatio) {
            coverH = height;
            coverW = height * srcRatio;
          } else {
            coverW = width;
            coverH = width / srcRatio;
          }
          const scaleOverscan = 1.1;
          const bgW = coverW * scaleOverscan;
          const bgH = coverH * scaleOverscan;
          const bgX = (width - bgW) / 2;
          const bgY = (height - bgH) / 2;

          ctx.save();
          if (supportsCtxFilter) {
            const prefix = bgBaseFilterString !== 'none' ? `${bgBaseFilterString} ` : '';
            ctx.filter = `${prefix}blur(${bgBlurPx}px) brightness(0.82)`;
          }
          ctx.drawImage(video, bgX, bgY, bgW, bgH);
          ctx.restore();
        }

        let drawW = width;
        let drawH = height;
        let drawX = 0;
        let drawY = 0;

        if (fitMode === 'cover') {
          if (srcRatio > dstRatio) {
            drawH = height;
            drawW = height * srcRatio;
            drawX = (width - drawW) / 2;
          } else {
            drawW = width;
            drawH = width / srcRatio;
            drawY = (height - drawH) / 2;
          }
        } else {
          if (srcRatio > dstRatio) {
            drawW = width;
            drawH = width / srcRatio;
            drawY = (height - drawH) / 2;
          } else {
            drawH = height;
            drawW = height * srcRatio;
            drawX = (width - drawW) / 2;
          }
        }

        if (supportsCtxFilter && filterString !== 'none') {
          ctx.filter = filterString;
        }
        ctx.drawImage(video, drawX, drawY, drawW, drawH);
        if (supportsCtxFilter) {
          ctx.filter = 'none';
        }
      }

      if (effects.vignette > 0) {
        const strength = Math.min(0.9, (effects.vignette / 100) * 0.85);
        const cx = width / 2;
        const cy = height / 2;
        const outerR = Math.hypot(cx, cy);
        const grad = ctx.createRadialGradient(cx, cy, outerR * 0.35, cx, cy, outerR);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, `rgba(0,0,0,${strength.toFixed(2)})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      const t = video.currentTime;
      const activeCue = cues.find((c) => t >= c.startTime && t <= c.endTime);
      if (activeCue) {
        renderSubtitleToCanvas(ctx, activeCue, t, subtitleStyle, width, height);
      }
      ctx.restore();
    };

    const waitNextDecodedVideoFrame = async () => {
      const videoWithRvfc = video as HTMLVideoElement & {
        requestVideoFrameCallback?: (cb: () => void) => number;
      };
      if (typeof videoWithRvfc.requestVideoFrameCallback === 'function') {
        await new Promise<void>((resolve) => {
          let done = false;
          const finish = () => {
            if (done) return;
            done = true;
            window.clearTimeout(timer);
            resolve();
          };
          const timer = window.setTimeout(finish, 250);
          videoWithRvfc.requestVideoFrameCallback!(finish);
        });
      } else {
        await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      }
    };

    let completedDuration = 0;

    onProgress(1, 'Iniciando renderizado...');

    for (let i = 0; i < keptRanges.length; i++) {
      if (signal.aborted) {
        throw new Error('Exportación cancelada por el usuario.');
      }

      const range = keptRanges[i];
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);

      if (Math.abs(video.currentTime - range.startTime) >= 0.01) {
        await new Promise<void>((resolve) => {
          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            video.removeEventListener('seeked', finish);
            video.removeEventListener('canplay', finish);
            window.clearTimeout(fallbackTimer);
            resolve();
          };
          const fallbackTimer = window.setTimeout(finish, 1800);
          video.addEventListener('seeked', finish);
          video.currentTime = range.startTime;
        });
      }

      if (video.readyState < 2) {
        await new Promise<void>((resolve) => {
          const done = () => {
            video.removeEventListener('canplay', done);
            window.clearTimeout(t);
            resolve();
          };
          const t = window.setTimeout(done, 1200);
          video.addEventListener('canplay', done);
        });
      }

      gainNode.gain.setTargetAtTime(1, audioCtx.currentTime, 0.015);
      try {
        await video.play();
      } catch {
        video.muted = true;
        await video.play();
      }

      await waitNextDecodedVideoFrame();
      drawFrame();

      if (i === 0) {
        recorder.start(150);
      } else if (recorder.state === 'paused') {
        recorder.resume();
      }

      await new Promise<void>((resolve, reject) => {
        let rafId = 0;
        const step = () => {
          if (signal.aborted) {
            cancelAnimationFrame(rafId);
            video.pause();
            reject(new Error('Exportación cancelada por el usuario.'));
            return;
          }

          drawFrame();

          const currentInRange = Math.max(0, video.currentTime - range.startTime);
          const pct = Math.min(
            90,
            Math.round(((completedDuration + currentInRange) / Math.max(0.1, targetDuration)) * 90)
          );
          onProgress(pct, `Renderizando segmento ${i + 1} de ${keptRanges.length}...`);

          if (video.currentTime >= range.endTime - 0.03 || video.ended) {
            cancelAnimationFrame(rafId);
            video.pause();
            gainNode.gain.setValueAtTime(0, audioCtx!.currentTime);
            if (recorder.state === 'recording' && i < keptRanges.length - 1) {
              recorder.pause();
            }
            completedDuration += range.endTime - range.startTime;
            resolve();
            return;
          }
          rafId = requestAnimationFrame(step);
        };
        rafId = requestAnimationFrame(step);
      });
    }

    onProgress(91, 'Finalizando captura de video...');
    if (recorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        recorder.stop();
      });
    }

    const rawBlob = new Blob(chunks, { type: mimeType });
    if (rawBlob.size === 0) {
      throw new Error('No se capturaron fotogramas durante la exportación.');
    }
    if (rawBlob.size > 500 * 1024 * 1024) {
      throw new Error(
        'La captura renderizada supera el límite de 500 MB. Selecciona calidad 720p o recorta el clip.'
      );
    }

    // Chunked upload (6 MB slices) to bypass Cloud Run's 32 MB single-request proxy limit up to 500 MB
    onProgress(92, 'Preparando conversión a MP4...');
    const initResp = await fetch('/api/convert-mp4/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalSize: rawBlob.size,
        ext: mimeType.includes('mp4') ? 'mp4' : 'webm',
      }),
      signal,
    });

    if (!initResp.ok) {
      let detail = `Error HTTP ${initResp.status}`;
      try {
        const errJson = (await initResp.json()) as { error?: string };
        if (errJson?.error) detail = errJson.error;
      } catch {
        // ignore JSON parse errors
      }
      throw new Error(`No se pudo convertir el video a MP4 (${detail}).`);
    }

    const { uploadId } = (await initResp.json()) as { uploadId: string };
    activeUploadId = uploadId;

    const CHUNK_BYTES = 6 * 1024 * 1024;
    const totalChunks = Math.max(1, Math.ceil(rawBlob.size / CHUNK_BYTES));

    for (let idx = 0; idx < totalChunks; idx++) {
      if (signal.aborted) {
        throw new Error('Exportación cancelada por el usuario.');
      }
      const start = idx * CHUNK_BYTES;
      const end = Math.min(rawBlob.size, start + CHUNK_BYTES);
      const slice = rawBlob.slice(start, end);
      const uploadPct = 92 + Math.round(((idx + 1) / totalChunks) * 5);
      onProgress(
        uploadPct,
        totalChunks > 1
          ? `Subiendo video (${idx + 1}/${totalChunks})...`
          : 'Subiendo video para MP4...'
      );

      const chunkResp = await fetch(`/api/convert-mp4/chunk/${uploadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: slice,
        signal,
      });

      if (!chunkResp.ok) {
        let detail = `Error HTTP ${chunkResp.status}`;
        try {
          const errJson = (await chunkResp.json()) as { error?: string };
          if (errJson?.error) detail = errJson.error;
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(`No se pudo convertir el video a MP4 (${detail}).`);
      }
    }

    onProgress(98, 'Codificando MP4 universal (H.264)...');
    const finalizeResp = await fetch(`/api/convert-mp4/finalize/${uploadId}`, {
      method: 'POST',
      signal,
    });
    activeUploadId = null;

    if (!finalizeResp.ok) {
      let detail = `Error HTTP ${finalizeResp.status}`;
      try {
        const errJson = (await finalizeResp.json()) as { error?: string };
        if (errJson?.error) detail = errJson.error;
      } catch {
        // ignore JSON parse errors
      }
      throw new Error(`No se pudo convertir el video a MP4 (${detail}).`);
    }

    const mp4Blob = await finalizeResp.blob();
    if (mp4Blob.size === 0) {
      throw new Error('El servidor devolvió un archivo MP4 vacío.');
    }

    onProgress(100, 'MP4 listo para descargar');
    return {
      blob: mp4Blob,
      extension: 'mp4',
      mimeType: 'video/mp4',
      duration: targetDuration,
    };
  } finally {
    if (activeUploadId) {
      void fetch(`/api/convert-mp4/${activeUploadId}`, {
        method: 'DELETE',
        keepalive: true,
      }).catch(() => {});
    }
    video.pause();
    video.removeAttribute('src');
    video.load();
    video.remove();
    canvas.remove();
    combinedStream?.getTracks().forEach((t) => t.stop());
    await audioCtx?.close().catch(() => {});
  }
}
