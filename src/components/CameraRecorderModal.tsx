import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Square, SwitchCamera, Video, X } from './Icons';
import { formatTimecode } from '../utils/audioEngine';

interface CameraRecorderModalProps {
  onClose: () => void;
  onUseVideo: (file: File) => void;
}

function pickCameraMimeType(): { mimeType?: string; extension: 'mp4' | 'webm' } {
  const candidates: Array<{ mimeType: string; extension: 'mp4' | 'webm' }> = [
    { mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', extension: 'mp4' },
    { mimeType: 'video/mp4', extension: 'mp4' },
    { mimeType: 'video/webm;codecs=vp9,opus', extension: 'webm' },
    { mimeType: 'video/webm;codecs=vp8,opus', extension: 'webm' },
    { mimeType: 'video/webm', extension: 'webm' },
  ];
  for (const item of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(item.mimeType)) {
      return item;
    }
  }
  return { extension: 'webm' };
}

export const CameraRecorderModal: React.FC<CameraRecorderModalProps> = ({
  onClose,
  onUseVideo,
}) => {
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const isCancellingRef = useRef(false);

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCameraStream = useCallback(
    async (targetFacing: 'user' | 'environment') => {
      stopTracks();
      setIsInitializing(true);
      setErrorMsg(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorMsg('Este navegador no permite acceso directo a la cámara.');
        setIsInitializing(false);
        return;
      }

      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: targetFacing },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: true,
          });
        } catch (primaryErr) {
          const primaryName = primaryErr instanceof DOMException ? primaryErr.name : '';
          if (primaryName === 'NotAllowedError' || primaryName === 'PermissionDeniedError') {
            throw primaryErr;
          }
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true,
            });
          } catch (secondaryErr) {
            const secName = secondaryErr instanceof DOMException ? secondaryErr.name : '';
            if (secName === 'NotAllowedError' || secName === 'PermissionDeniedError') {
              throw secondaryErr;
            }
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          }
        }

        streamRef.current = stream;
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = stream;
          liveVideoRef.current.play().catch(() => {});
        }
      } catch (err) {
        const name = err instanceof DOMException ? err.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setErrorMsg(
            'Permiso de cámara o micrófono denegado. Habilita los permisos en tu navegador.'
          );
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setErrorMsg('No se encontró ninguna cámara disponible en este dispositivo.');
        } else {
          setErrorMsg('No se pudo iniciar la cámara para grabar.');
        }
      } finally {
        setIsInitializing(false);
      }
    },
    [stopTracks]
  );

  useEffect(() => {
    startCameraStream(facingMode);
  }, [facingMode, startCameraStream]);

  useEffect(() => {
    return () => {
      isCancellingRef.current = true;
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
      stopTracks();
    };
  }, [stopTracks]);

  const handleToggleFacing = () => {
    if (isRecording) return;
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleStartRecording = () => {
    if (!streamRef.current || isRecording) return;
    setErrorMsg(null);
    isCancellingRef.current = false;
    chunksRef.current = [];

    if (typeof MediaRecorder === 'undefined') {
      setErrorMsg('Este navegador no soporta grabación directa de video (MediaRecorder).');
      return;
    }

    const { mimeType: preferredMime, extension: preferredExt } = pickCameraMimeType();
    try {
      let recorder: MediaRecorder;
      try {
        recorder = preferredMime
          ? new MediaRecorder(streamRef.current, { mimeType: preferredMime })
          : new MediaRecorder(streamRef.current);
      } catch {
        recorder = new MediaRecorder(streamRef.current);
      }
      const actualMime = recorder.mimeType || preferredMime || 'video/webm';
      const extension = actualMime.includes('mp4') ? 'mp4' : preferredExt;
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setIsRecording(false);

        if (isCancellingRef.current) {
          return;
        }

        const blob = new Blob(chunksRef.current, { type: actualMime });
        if (blob.size === 0) {
          setErrorMsg('La grabación resultó vacía. Intenta grabar nuevamente.');
          return;
        }

        const fileName = `grabacion-${Date.now()}.${extension}`;
        const file = new File([blob], fileName, { type: actualMime });
        stopTracks();
        onUseVideo(file);
      };

      recorder.start(250);
      setElapsedSec(0);
      setIsRecording(true);
      const startedAt = Date.now();
      timerRef.current = window.setInterval(() => {
        setElapsedSec((Date.now() - startedAt) / 1000);
      }, 150);
    } catch {
      setErrorMsg('No se pudo iniciar la grabación de video en este navegador.');
    }
  };

  const handleStopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  };

  const handleClose = () => {
    isCancellingRef.current = true;
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    stopTracks();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Grabar video con cámara"
      className="fixed inset-0 z-50 flex flex-col bg-[#09090B]/95 backdrop-blur-md"
    >
      {/* Top Bar */}
      <header className="flex h-[56px] w-full max-w-full shrink-0 items-center justify-between gap-2 border-b border-zinc-800 bg-[#09090B] px-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Camera className="h-4 w-4 shrink-0 text-[#FF453A]" aria-hidden="true" />
          <h2 className="font-display truncate text-sm font-semibold text-white sm:text-base">
            Grabar video
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {!isRecording && (
            <button
              type="button"
              onClick={handleToggleFacing}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-zinc-700 bg-[#131316] px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white whitespace-nowrap sm:min-h-[40px] sm:px-3"
            >
              <SwitchCamera className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Cambiar cámara</span>
              <span className="sm:hidden">Cámara</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleClose}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-zinc-700 bg-[#131316] px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white whitespace-nowrap sm:min-h-[40px] sm:px-3"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Cerrar</span>
          </button>
        </div>
      </header>

      {/* Camera Viewport & Controls */}
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-5 p-4 sm:p-6">
        <div className="relative flex w-full flex-1 max-h-[64vh] items-center justify-center overflow-hidden rounded-2xl border border-zinc-800 bg-black">
          <video
            ref={liveVideoRef}
            autoPlay
            muted
            playsInline
            className={`h-full w-full object-cover ${
              facingMode === 'user' ? '-scale-x-100' : ''
            }`}
          />

          {isInitializing && !errorMsg && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-xs text-zinc-300">
              Iniciando cámara...
            </div>
          )}

          {errorMsg && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#09090B]/90 p-6 text-center">
              <p className="max-w-sm text-xs leading-relaxed text-[#FF453A]">{errorMsg}</p>
              <button
                type="button"
                onClick={() => startCameraStream(facingMode)}
                className="min-h-[40px] rounded-lg border border-zinc-700 bg-[#1C1C21] px-4 text-xs font-medium text-white hover:border-zinc-500"
              >
                Reintentar acceso a cámara
              </button>
            </div>
          )}

          {isRecording && (
            <div className="absolute top-3 left-3 flex items-center gap-2 rounded-lg bg-black/75 px-3 py-1.5 font-mono text-xs font-semibold text-white tabular-nums backdrop-blur-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FF453A] animate-pulse" />
              <span>REC {formatTimecode(elapsedSec)}</span>
            </div>
          )}
        </div>

        {/* Action Strip */}
        <div className="flex w-full items-center justify-center">
          {isRecording ? (
            <button
              type="button"
              onClick={handleStopRecording}
              className="flex min-h-[52px] w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-[#FF453A] px-6 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98]"
            >
              <Square className="h-4 w-4 fill-current" aria-hidden="true" />
              <span>Detener grabación ({formatTimecode(elapsedSec)})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartRecording}
              disabled={isInitializing || Boolean(errorMsg)}
              className="flex min-h-[52px] w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-[#FAFAFA] px-6 text-sm font-semibold text-[#09090B] transition hover:bg-zinc-200 active:scale-[0.98] disabled:opacity-50"
            >
              <Video className="h-4 w-4 text-[#FF453A]" aria-hidden="true" />
              <span>Iniciar grabación</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
