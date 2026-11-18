import 'dotenv/config';
import express from 'express';
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500 MB max input video
const MAX_TMP_QUOTA_BYTES = 1200 * 1024 * 1024; // ~1.2 GB /tmp safety ceiling
const INACTIVITY_CLEANUP_MS = 30 * 60 * 1000; // Purge after 30 min of user inactivity
const TEMP_FILE_MAX_AGE_MS = 30 * 60 * 1000; // Strict <1 hour retention ceiling
const MAX_CONCURRENT_FFMPEG = 1;
const MAX_QUEUED_FFMPEG = 2;

let lastActivityAt = Date.now();
const activeTempFiles = new Set<string>();

function touchActivity(): void {
  lastActivityAt = Date.now();
}

const app = express();
app.use(express.json({ limit: '40mb' }));
app.use('/api', (_req, res, next) => {
  touchActivity();
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

async function listCutflowTempEntries(): Promise<Array<{ fullPath: string; size: number; mtimeMs: number }>> {
  try {
    const tmpDir = os.tmpdir();
    const entries = await fs.readdir(tmpDir);
    const items = await Promise.all(
      entries
        .filter((name) => name.startsWith('cutflow-in-') || name.startsWith('cutflow-out-'))
        .map(async (name) => {
          const fullPath = path.join(tmpDir, name);
          try {
            const stat = await fs.stat(fullPath);
            return { fullPath, size: stat.size, mtimeMs: stat.mtimeMs };
          } catch {
            return null;
          }
        })
    );
    return items.filter((item): item is { fullPath: string; size: number; mtimeMs: number } => item !== null);
  } catch {
    return [];
  }
}

async function getCutflowTempUsageBytes(): Promise<number> {
  const entries = await listCutflowTempEntries();
  return entries.reduce((sum, item) => sum + item.size, 0);
}

interface PendingMp4Upload {
  id: string;
  tmpIn: string;
  tmpOut: string;
  bytesReceived: number;
  createdAt: number;
  lastChunkAt: number;
}

const pendingUploads = new Map<string, PendingMp4Upload>();

async function cleanupTempVideos(options?: { purgeIdle?: boolean }): Promise<void> {
  const now = Date.now();
  const isUserIdle = Boolean(options?.purgeIdle) && now - lastActivityAt >= INACTIVITY_CLEANUP_MS;

  for (const [id, upload] of pendingUploads.entries()) {
    const uploadExpired = now - upload.lastChunkAt > TEMP_FILE_MAX_AGE_MS;
    if (uploadExpired || isUserIdle) {
      pendingUploads.delete(id);
      activeTempFiles.delete(upload.tmpIn);
      activeTempFiles.delete(upload.tmpOut);
      await fs.unlink(upload.tmpIn).catch(() => {});
      await fs.unlink(upload.tmpOut).catch(() => {});
    }
  }

  const entries = await listCutflowTempEntries();
  await Promise.all(
    entries.map(async (entry) => {
      if (activeTempFiles.has(entry.fullPath)) return;
      const isExpired = now - entry.mtimeMs > TEMP_FILE_MAX_AGE_MS;
      if (isExpired || isUserIdle) {
        await fs.unlink(entry.fullPath).catch(() => {});
      }
    })
  );
}

let activeFfmpegJobs = 0;
const ffmpegWaitQueue: Array<{ resolve: () => void; reject: (err: Error) => void }> = [];

async function acquireFfmpegSlot(req: express.Request): Promise<() => void> {
  if (activeFfmpegJobs < MAX_CONCURRENT_FFMPEG) {
    activeFfmpegJobs++;
    return () => {
      activeFfmpegJobs = Math.max(0, activeFfmpegJobs - 1);
      const next = ffmpegWaitQueue.shift();
      if (next) {
        activeFfmpegJobs++;
        next.resolve();
      }
    };
  }

  if (ffmpegWaitQueue.length >= MAX_QUEUED_FFMPEG) {
    throw Object.assign(
      new Error('El servidor está procesando varias exportaciones en este momento. Intenta en unos segundos.'),
      { statusCode: 503 }
    );
  }

  await new Promise<void>((resolve, reject) => {
    const waiter = { resolve, reject };
    ffmpegWaitQueue.push(waiter);

    const onAbort = () => {
      const idx = ffmpegWaitQueue.indexOf(waiter);
      if (idx !== -1) {
        ffmpegWaitQueue.splice(idx, 1);
        reject(Object.assign(new Error('Exportación cancelada.'), { statusCode: 499 }));
      }
    };
    req.once('close', () => {
      if (!req.complete) onAbort();
    });
  });

  return () => {
    activeFfmpegJobs = Math.max(0, activeFfmpegJobs - 1);
    const next = ffmpegWaitQueue.shift();
    if (next) {
      activeFfmpegJobs++;
      next.resolve();
    }
  };
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface SpeechRegionInput {
  startTime: number;
  endTime: number;
}

interface TranscribeCue {
  startTime: number;
  endTime: number;
  text: string;
}

function getErrorStatusAndCode(err: unknown): { status: number; rawMessage: string } {
  if (!err || typeof err !== 'object') {
    return { status: 500, rawMessage: String(err || '') };
  }
  const anyErr = err as { status?: number; code?: number; message?: string };
  const rawMessage = typeof anyErr.message === 'string' ? anyErr.message : '';
  let status = Number(anyErr.status || anyErr.code || 0);

  if (!status && rawMessage) {
    if (rawMessage.includes('"code":503') || rawMessage.includes('UNAVAILABLE')) status = 503;
    else if (rawMessage.includes('"code":429') || rawMessage.includes('RESOURCE_EXHAUSTED')) status = 429;
    else if (rawMessage.includes('"code":403') || rawMessage.includes('PERMISSION_DENIED')) status = 403;
    else if (rawMessage.includes('"code":400') || rawMessage.includes('API_KEY_INVALID')) status = 400;
  }

  return { status: status || 500, rawMessage };
}

function isTransientGeminiError(err: unknown): boolean {
  const { status, rawMessage } = getErrorStatusAndCode(err);
  if (status === 503 || status === 429 || status === 502 || status === 504) return true;
  const lower = rawMessage.toLowerCase();
  return (
    lower.includes('high demand') ||
    lower.includes('unavailable') ||
    lower.includes('overloaded') ||
    lower.includes('rate limit') ||
    lower.includes('econnreset') ||
    lower.includes('etimedout')
  );
}

function formatFriendlyGeminiError(err: unknown): { status: number; message: string } {
  const { status, rawMessage } = getErrorStatusAndCode(err);
  const lower = rawMessage.toLowerCase();

  if (status === 503 || lower.includes('high demand') || lower.includes('unavailable')) {
    return {
      status: 503,
      message:
        'El servicio de transcripción está recibiendo mucha demanda en este momento. Reintenta en unos segundos.',
    };
  }
  if (status === 429 || lower.includes('resource_exhausted') || lower.includes('quota')) {
    return {
      status: 429,
      message:
        'Se alcanzó el límite temporal de solicitudes de transcripción. Espera un momento e inténtalo de nuevo.',
    };
  }
  if (status === 403 || lower.includes('api_key_invalid') || lower.includes('permission_denied')) {
    return {
      status: 403,
      message:
        'Revisa la clave GEMINI_API_KEY en Settings > Secrets para habilitar la transcripción automática.',
    };
  }
  return {
    status: 500,
    message: 'No se pudo completar la transcripción automática en este momento. Inténtalo nuevamente.',
  };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(Object.assign(new Error(`${label} timed out after ${timeoutMs}ms`), { status: 504 }));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function parseJsonResponseSafely<T>(rawText: string | undefined): T {
  const trimmed = (rawText ?? '').trim();
  const stripped = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(stripped || '{}') as T;
}

async function withGeminiRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = 2,
  baseDelayMs = 800,
  timeoutMs = 20000,
  label = 'gemini-call'
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await withTimeout(operation(), timeoutMs, `${label}#${attempt}`);
    } catch (err) {
      lastError = err;
      if (!isTransientGeminiError(err) || attempt === maxAttempts) {
        throw err;
      }
      const jitter = Math.round(Math.random() * 350);
      const delay = baseDelayMs * Math.pow(2, attempt - 1) + jitter;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

const modelCooldownUntil = new Map<string, number>();
const MODEL_COOLDOWN_MS = 60 * 1000;

function isModelInCooldown(model: string): boolean {
  const until = modelCooldownUntil.get(model);
  if (!until) return false;
  if (Date.now() >= until) {
    modelCooldownUntil.delete(model);
    return false;
  }
  return true;
}

function markModelTransientFailure(model: string, err: unknown): void {
  if (isTransientGeminiError(err)) {
    modelCooldownUntil.set(model, Date.now() + MODEL_COOLDOWN_MS);
  }
}

app.post('/api/transcribe', async (req, res) => {
  const reqStart = Date.now();
  try {
    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({
        error: 'Falta configurar GEMINI_API_KEY en los secretos del entorno.',
      });
      return;
    }

    const { audioBase64, mimeType, duration, speechRegions, languageHint } = req.body as {
      audioBase64?: string;
      mimeType?: string;
      duration?: number;
      speechRegions?: SpeechRegionInput[];
      languageHint?: string;
    };

    if (!audioBase64 || !mimeType) {
      res.status(400).json({ error: 'Se requiere audio codificado para transcribir.' });
      return;
    }

    const audioPart = {
      inlineData: {
        mimeType,
        data: audioBase64,
      },
    };

    let rawTranscript = '';
    if (!isModelInCooldown('gemini-3.5-transcribe')) {
      try {
        const transcribeResp = await withGeminiRetry(
          () =>
            ai.models.generateContent({
              model: 'gemini-3.5-transcribe',
              contents: {
                parts: [
                  audioPart,
                  {
                    text: 'Transcribe all spoken words verbatim in the original language. Include natural punctuation.',
                  },
                ],
              },
            }),
          1,
          500,
          10000,
          'gemini-3.5-transcribe'
        );
        rawTranscript = (transcribeResp.text ?? '').trim();
      } catch (err) {
        markModelTransientFailure('gemini-3.5-transcribe', err);
        const { status } = getErrorStatusAndCode(err);
        console.warn(`[transcribe] gemini-3.5-transcribe skipped (status=${status})`);
        rawTranscript = '';
      }
    }

    const regionsHint =
      Array.isArray(speechRegions) && speechRegions.length > 0
        ? `Detected acoustic speech intervals (seconds): ${speechRegions
            .slice(0, 60)
            .map((r) => `[${r.startTime.toFixed(2)}-${r.endTime.toFixed(2)}]`)
            .join(', ')}.`
        : '';

    const alignPrompt = [
      'Analyze the provided audio and produce synchronized subtitle cues.',
      rawTranscript
        ? `Reference verbatim transcript: """${rawTranscript}"""`
        : 'Transcribe all spoken speech verbatim in its original spoken language.',
      languageHint ? `Expected spoken language context: ${languageHint}.` : '',
      `Total audio duration: ${Number(duration || 0).toFixed(2)} seconds.`,
      regionsHint,
      'Rules:',
      '1. Return detectedLanguage as the clear Spanish name of the primary spoken language (for example: "Español", "Inglés", "Portugués", "Francés", "Italiano", "Alemán").',
      '2. Split speech into natural, concise subtitle cues (max 8-10 words per cue) with accurate startTime and endTime in seconds.',
      '3. Keep the spoken words in their original language (do not translate).',
      '4. If there is no speech in the audio, return an empty cues array and detectedLanguage "Sin voz detectada".',
    ]
      .filter(Boolean)
      .join('\n');

    const alignSchema = {
      type: Type.OBJECT,
      properties: {
        detectedLanguage: {
          type: Type.STRING,
          description: 'Primary spoken language name in Spanish.',
        },
        cues: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              startTime: { type: Type.NUMBER },
              endTime: { type: Type.NUMBER },
              text: { type: Type.STRING },
            },
            required: ['startTime', 'endTime', 'text'],
          },
        },
      },
      required: ['detectedLanguage', 'cues'],
    };

    let alignResp;
    let modelUsed = '';

    if (!isModelInCooldown('gemini-4-hydrogen')) {
      try {
        modelUsed = 'gemini-4-hydrogen';
        alignResp = await withGeminiRetry(
          () =>
            ai.models.generateContent({
              model: 'gemini-4-hydrogen',
              contents: {
                parts: [audioPart, { text: alignPrompt }],
              },
              config: {
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
                responseMimeType: 'application/json',
                responseSchema: alignSchema,
              },
            }),
          1,
          700,
          15000,
          'gemini-4-hydrogen'
        );
      } catch (primaryErr) {
        markModelTransientFailure('gemini-4-hydrogen', primaryErr);
        const primaryInfo = getErrorStatusAndCode(primaryErr);
        console.warn(
          `[transcribe] gemini-4-hydrogen failed (status=${primaryInfo.status}), using gemini-3.1-flash-lite`
        );
        if (!isTransientGeminiError(primaryErr)) {
          throw primaryErr;
        }
        alignResp = undefined;
      }
    }

    if (!alignResp) {
      modelUsed = 'gemini-3.1-flash-lite';
      try {
        alignResp = await withGeminiRetry(
          () =>
            ai.models.generateContent({
              model: 'gemini-3.1-flash-lite',
              contents: {
                parts: [audioPart, { text: alignPrompt }],
              },
              config: {
                responseMimeType: 'application/json',
                responseSchema: alignSchema,
              },
            }),
          3,
          800,
          18000,
          'gemini-3.1-flash-lite'
        );
      } catch (liteErr) {
        if (!rawTranscript || !isTransientGeminiError(liteErr)) {
          throw liteErr;
        }
        modelUsed = 'gemini-3.1-flash-lite-text-align';
        alignResp = await withGeminiRetry(
          () =>
            ai.models.generateContent({
              model: 'gemini-3.1-flash-lite',
              contents: alignPrompt,
              config: {
                responseMimeType: 'application/json',
                responseSchema: alignSchema,
              },
            }),
          2,
          700,
          15000,
          'gemini-3.1-flash-lite-text'
        );
      }
    }

    const parsed = parseJsonResponseSafely<{
      detectedLanguage?: string;
      cues?: TranscribeCue[];
    }>(alignResp.text);

    const maxDur = Number(duration) || 3600;
    const cleanedCues = (parsed.cues ?? [])
      .filter((c) => c.text && c.text.trim().length > 0)
      .map((c, idx) => {
        const start = Math.max(0, Math.min(maxDur - 0.1, Number(c.startTime) || 0));
        const end = Math.max(start + 0.25, Math.min(maxDur, Number(c.endTime) || start + 1.5));
        return {
          id: `cue-ai-${idx}-${Math.round(start * 100)}`,
          startTime: Number(start.toFixed(2)),
          endTime: Number(end.toFixed(2)),
          text: c.text.trim(),
        };
      });

    console.info(
      `[transcribe] ok model=${modelUsed} duration=${Number(duration || 0).toFixed(1)}s cues=${cleanedCues.length} ms=${Date.now() - reqStart}`
    );

    res.json({
      detectedLanguage: parsed.detectedLanguage || languageHint || 'Español',
      cues: cleanedCues,
      rawTranscript,
      modelUsed,
    });
  } catch (err) {
    const info = getErrorStatusAndCode(err);
    console.error(
      `[transcribe] failed status=${info.status} ms=${Date.now() - reqStart}:`,
      info.rawMessage.slice(0, 220)
    );
    const friendly = formatFriendlyGeminiError(err);
    res.status(friendly.status).json({ error: friendly.message });
  }
});

async function resolveFfmpegBinary(): Promise<string> {
  const candidates = [
    path.join(__dirname, 'node_modules', '@ffmpeg-installer', 'linux-x64', 'ffmpeg'),
    path.join(process.cwd(), 'node_modules', '@ffmpeg-installer', 'linux-x64', 'ffmpeg'),
  ];
  for (const bin of candidates) {
    try {
      await fs.access(bin);
      await fs.chmod(bin, 0o755).catch(() => {});
      return bin;
    } catch {
      // try next candidate
    }
  }
  return 'ffmpeg';
}

async function transcodeToMp4(tmpIn: string, tmpOut: string): Promise<number> {
  const ffmpegBin = await resolveFfmpegBinary();
  const baseInputArgs = [
    '-y',
    '-loglevel',
    'error',
    '-fflags',
    '+genpts+igndts',
    '-avoid_negative_ts',
    'make_zero',
    '-i',
    tmpIn,
    '-vf',
    'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-r',
    '30',
    '-vsync',
    'cfr',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '22',
    '-pix_fmt',
    'yuv420p',
    '-max_muxing_queue_size',
    '4096',
  ];

  try {
    await execFileAsync(
      ffmpegBin,
      [
        ...baseInputArgs,
        '-c:a',
        'aac',
        '-b:a',
        '160k',
        '-af',
        'aresample=async=1:first_pts=0',
        '-movflags',
        '+faststart',
        tmpOut,
      ],
      { maxBuffer: 16 * 1024 * 1024 }
    );
  } catch {
    await execFileAsync(
      ffmpegBin,
      [...baseInputArgs, '-an', '-movflags', '+faststart', tmpOut],
      { maxBuffer: 16 * 1024 * 1024 }
    );
  }

  const outStat = await fs.stat(tmpOut);
  if (!outStat || outStat.size === 0) {
    throw new Error('FFmpeg generó un archivo MP4 vacío.');
  }
  return outStat.size;
}

app.post('/api/convert-mp4/init', async (req, res) => {
  try {
    const { totalSize, ext } = (req.body || {}) as { totalSize?: number; ext?: string };
    const expectedBytes = Number(totalSize || 0);
    if (Number.isFinite(expectedBytes) && expectedBytes > MAX_VIDEO_BYTES) {
      res.status(413).json({
        error: 'El video supera el límite máximo permitido de 500 MB.',
      });
      return;
    }

    await cleanupTempVideos({ purgeIdle: false });
    const currentTmpBytes = await getCutflowTempUsageBytes();
    const reserveBytes =
      Number.isFinite(expectedBytes) && expectedBytes > 0
        ? expectedBytes * 1.4
        : 120 * 1024 * 1024;

    if (currentTmpBytes + reserveBytes > MAX_TMP_QUOTA_BYTES) {
      res.status(507).json({
        error:
          'El espacio temporal del servidor está ocupado por otras exportaciones activas. Intenta de nuevo en unos segundos.',
      });
      return;
    }

    const id = crypto.randomUUID();
    const safeExt = ext === 'mp4' ? 'mp4' : 'webm';
    const tmpIn = path.join(os.tmpdir(), `cutflow-in-${id}.${safeExt}`);
    const tmpOut = path.join(os.tmpdir(), `cutflow-out-${id}.mp4`);

    await fs.writeFile(tmpIn, Buffer.alloc(0));
    activeTempFiles.add(tmpIn);

    const now = Date.now();
    pendingUploads.set(id, {
      id,
      tmpIn,
      tmpOut,
      bytesReceived: 0,
      createdAt: now,
      lastChunkAt: now,
    });

    res.json({ uploadId: id });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'No se pudo inicializar la conversión a MP4.';
    res.status(500).json({ error: message });
  }
});

app.post('/api/convert-mp4/chunk/:uploadId', async (req, res) => {
  const { uploadId } = req.params;
  const upload = pendingUploads.get(uploadId);
  if (!upload) {
    res.status(404).json({ error: 'Sesión de conversión no encontrada o expirada.' });
    return;
  }

  try {
    const chunkBytes = await new Promise<number>((resolve, reject) => {
      const ws = fsSync.createWriteStream(upload.tmpIn, { flags: 'a' });
      let receivedInChunk = 0;
      let settled = false;

      const fail = (err: Error) => {
        if (settled) return;
        settled = true;
        req.destroy();
        ws.destroy();
        reject(err);
      };

      req.on('data', (chunk: Buffer) => {
        receivedInChunk += chunk.length;
        if (upload.bytesReceived + receivedInChunk > MAX_VIDEO_BYTES) {
          fail(
            Object.assign(new Error('El video supera el límite máximo permitido de 500 MB.'), {
              statusCode: 413,
            })
          );
          return;
        }
        if (!ws.write(chunk)) {
          req.pause();
        }
      });

      ws.on('drain', () => {
        req.resume();
      });

      req.on('end', () => {
        ws.end();
      });

      req.on('aborted', () => {
        fail(Object.assign(new Error('Carga de fragmento cancelada.'), { statusCode: 499 }));
      });

      req.on('error', fail);
      ws.on('error', fail);
      ws.on('finish', () => {
        if (settled) return;
        settled = true;
        resolve(receivedInChunk);
      });
    });

    upload.bytesReceived += chunkBytes;
    upload.lastChunkAt = Date.now();
    touchActivity();

    res.json({ receivedBytes: upload.bytesReceived });
  } catch (err) {
    const anyErr = err as { statusCode?: number; message?: string };
    if (anyErr?.statusCode === 413 || anyErr?.statusCode === 499) {
      pendingUploads.delete(uploadId);
      activeTempFiles.delete(upload.tmpIn);
      void fs.unlink(upload.tmpIn).catch(() => {});
    }
    const statusCode = anyErr?.statusCode && anyErr.statusCode >= 400 ? anyErr.statusCode : 500;
    const message =
      err instanceof Error ? err.message : 'Error al subir fragmento de video para conversión.';
    res.status(statusCode).json({ error: message });
  }
});

app.post('/api/convert-mp4/finalize/:uploadId', async (req, res) => {
  const { uploadId } = req.params;
  const upload = pendingUploads.get(uploadId);
  if (!upload) {
    res.status(404).json({ error: 'Sesión de conversión no encontrada o expirada.' });
    return;
  }

  pendingUploads.delete(uploadId);
  const { tmpIn, tmpOut } = upload;
  activeTempFiles.add(tmpIn);
  activeTempFiles.add(tmpOut);

  let releaseSlot: (() => void) | null = null;
  let cleaned = false;

  const cleanupJobFiles = () => {
    if (cleaned) return;
    cleaned = true;
    activeTempFiles.delete(tmpIn);
    activeTempFiles.delete(tmpOut);
    void fs.unlink(tmpIn).catch(() => {});
    void fs.unlink(tmpOut).catch(() => {});
  };

  res.on('close', cleanupJobFiles);
  res.on('finish', cleanupJobFiles);

  try {
    if (upload.bytesReceived === 0) {
      res.status(400).json({ error: 'Video vacío recibido para conversión a MP4.' });
      return;
    }

    releaseSlot = await acquireFfmpegSlot(req);
    touchActivity();

    const outSize = await transcodeToMp4(tmpIn, tmpOut);

    touchActivity();
    res.setHeader('Content-Type', 'video/mp4');
    if (outSize <= 30 * 1024 * 1024) {
      res.setHeader('Content-Length', String(outSize));
    }
    await pipeline(fsSync.createReadStream(tmpOut), res);
  } catch (err) {
    if (!res.headersSent) {
      const anyErr = err as { statusCode?: number; message?: string };
      const statusCode = anyErr?.statusCode && anyErr.statusCode >= 400 ? anyErr.statusCode : 500;
      const message =
        err instanceof Error ? err.message : 'No se pudo convertir el video a MP4.';
      res.status(statusCode).json({ error: message });
    }
  } finally {
    if (releaseSlot) {
      releaseSlot();
      releaseSlot = null;
    }
    cleanupJobFiles();
  }
});

app.delete('/api/convert-mp4/:uploadId', (req, res) => {
  const { uploadId } = req.params;
  const upload = pendingUploads.get(uploadId);
  if (upload) {
    pendingUploads.delete(uploadId);
    activeTempFiles.delete(upload.tmpIn);
    activeTempFiles.delete(upload.tmpOut);
    void fs.unlink(upload.tmpIn).catch(() => {});
    void fs.unlink(upload.tmpOut).catch(() => {});
  }
  res.status(204).end();
});

app.post('/api/convert-mp4', async (req, res) => {
  const id = crypto.randomUUID();
  const tmpIn = path.join(os.tmpdir(), `cutflow-in-${id}.webm`);
  const tmpOut = path.join(os.tmpdir(), `cutflow-out-${id}.mp4`);

  let releaseSlot: (() => void) | null = null;
  let cleaned = false;

  const cleanupJobFiles = () => {
    if (cleaned) return;
    cleaned = true;
    activeTempFiles.delete(tmpIn);
    activeTempFiles.delete(tmpOut);
    void fs.unlink(tmpIn).catch(() => {});
    void fs.unlink(tmpOut).catch(() => {});
  };

  res.on('close', cleanupJobFiles);
  res.on('finish', cleanupJobFiles);

  try {
    const contentLengthHeader = Number(req.headers['content-length'] || 0);
    if (Number.isFinite(contentLengthHeader) && contentLengthHeader > MAX_VIDEO_BYTES) {
      res.status(413).json({
        error: 'El video supera el límite máximo permitido de 500 MB.',
      });
      return;
    }

    releaseSlot = await acquireFfmpegSlot(req);
    touchActivity();

    await cleanupTempVideos({ purgeIdle: false });
    const currentTmpBytes = await getCutflowTempUsageBytes();
    const expectedExtraBytes =
      Number.isFinite(contentLengthHeader) && contentLengthHeader > 0
        ? contentLengthHeader * 1.4
        : 120 * 1024 * 1024;

    if (currentTmpBytes + expectedExtraBytes > MAX_TMP_QUOTA_BYTES) {
      res.status(507).json({
        error:
          'El espacio temporal del servidor está ocupado por otras exportaciones activas. Intenta de nuevo en unos segundos.',
      });
      return;
    }

    activeTempFiles.add(tmpIn);
    activeTempFiles.add(tmpOut);

    const receivedBytes = await new Promise<number>((resolve, reject) => {
      const ws = fsSync.createWriteStream(tmpIn);
      let total = 0;
      let settled = false;

      const fail = (err: Error) => {
        if (settled) return;
        settled = true;
        req.destroy();
        ws.destroy();
        reject(err);
      };

      req.on('data', (chunk: Buffer) => {
        total += chunk.length;
        if (total > MAX_VIDEO_BYTES) {
          fail(
            Object.assign(new Error('El video supera el límite máximo permitido de 500 MB.'), {
              statusCode: 413,
            })
          );
          return;
        }
        if (!ws.write(chunk)) {
          req.pause();
        }
      });

      ws.on('drain', () => {
        req.resume();
      });

      req.on('end', () => {
        ws.end();
      });

      req.on('aborted', () => {
        fail(Object.assign(new Error('Carga de video cancelada.'), { statusCode: 499 }));
      });

      req.on('error', fail);
      ws.on('error', fail);
      ws.on('finish', () => {
        if (settled) return;
        settled = true;
        resolve(total);
      });
    });

    if (receivedBytes === 0) {
      res.status(400).json({ error: 'Video vacío recibido para conversión a MP4.' });
      return;
    }

    const outSize = await transcodeToMp4(tmpIn, tmpOut);

    touchActivity();
    res.setHeader('Content-Type', 'video/mp4');
    if (outSize <= 30 * 1024 * 1024) {
      res.setHeader('Content-Length', String(outSize));
    }
    await pipeline(fsSync.createReadStream(tmpOut), res);
  } catch (err) {
    if (!res.headersSent) {
      const anyErr = err as { statusCode?: number; message?: string };
      const statusCode = anyErr?.statusCode && anyErr.statusCode >= 400 ? anyErr.statusCode : 500;
      const message =
        err instanceof Error ? err.message : 'No se pudo convertir el video a MP4.';
      res.status(statusCode).json({ error: message });
    }
  } finally {
    if (releaseSlot) {
      releaseSlot();
      releaseSlot = null;
    }
    cleanupJobFiles();
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const httpServer = http.createServer(app);
  httpServer.requestTimeout = 20 * 60 * 1000;

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      plugins: [
        {
          name: 'configure-middleware-ws',
          config: () => ({
            server: {
              ws: { server: httpServer },
            },
          }),
        },
      ],
      server: {
        middlewareMode: true,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(
      express.static(distDir, {
        maxAge: '1h',
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html') || filePath.endsWith('sw.js')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
          } else {
            res.setHeader('Cache-Control', 'public, max-age=3600');
          }
        },
      })
    );
    app.get('/{*splat}', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  await cleanupTempVideos({ purgeIdle: false });
  const cleanupInterval = setInterval(() => {
    void cleanupTempVideos({ purgeIdle: true });
  }, 5 * 60 * 1000);
  cleanupInterval.unref();

  const port = Number(process.env.PORT || 3000);
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`CutFlow Studio server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
