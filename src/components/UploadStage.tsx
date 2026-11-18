import React, { useState } from 'react';
import { Camera, Captions, Film, Sliders, Upload, VolumeX } from './Icons';
import { CameraRecorderModal } from './CameraRecorderModal';

interface UploadStageProps {
  onSelectFile: (file: File) => void;
  onOpenCamera?: () => void;
  errorMessage: string | null;
}

export const UploadStage: React.FC<UploadStageProps> = ({
  onSelectFile,
  onOpenCamera,
  errorMessage,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onSelectFile(file);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl min-w-0 flex-1 flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid min-w-0 grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
        {/* Left editorial intro */}
        <div className="flex min-w-0 flex-col justify-between lg:col-span-6 lg:py-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-zinc-400">
              Estudio móvil de edición local · Android PWA
            </p>
            <h1 className="mt-3 break-words font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Limpia silencios, anima subtítulos y exporta sin límites. Sin registrarte. Gratis por siempre.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
              Sube cualquier video desde tu dispositivo. Analizamos la forma de onda localmente para
              detectar pausas y muletillas como «emm» o «err», sincronizar subtítulos animados y
              renderizar el resultado con efectos visuales en cualquier relación de aspecto.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-5 border-t border-zinc-800/80 pt-6 sm:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <VolumeX className="h-4 w-4 text-[#FF453A]" aria-hidden="true" />
                <span>Cortes por señal</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                Detección local en decibelios para pausas largas y vacilaciones vocales.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Captions className="h-4 w-4 text-zinc-200" aria-hidden="true" />
                <span>SRT y Karaoke</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                Transcripción automática con detección de idioma y subtítulos animados.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Sliders className="h-4 w-4 text-zinc-200" aria-hidden="true" />
                <span>Etalonaje directo</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                Brillo, contraste, niveles, saturación, viñeta y desenfoque en vivo.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Film className="h-4 w-4 text-zinc-200" aria-hidden="true" />
                <span>Cualquier formato</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                MP4, WebM, MOV o MKV hacia lienzos 9:16, 16:9, 1:1, 4:5 u original.
              </p>
            </div>
          </div>
        </div>

        {/* Right primary upload focal anchor */}
        <div className="flex flex-col lg:col-span-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex flex-1 flex-col items-center justify-center rounded-2xl border p-6 text-center transition sm:p-10 ${
              isDragging
                ? 'border-white bg-zinc-900'
                : 'border-zinc-800 bg-[#131316]'
            }`}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-[#1C1C21]">
              <Upload className="h-6 w-6 text-white" aria-hidden="true" />
            </div>

            <h2 className="mt-5 font-display text-xl font-semibold text-white">
              Selecciona o arrastra un video
            </h2>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-zinc-400">
              Todo el análisis de audio y renderizado ocurre dentro de tu navegador sin subir archivos a la nube.
            </p>

            {errorMessage && (
              <p className="mt-4 rounded-lg border border-[#FF453A]/40 bg-[#FF453A]/10 px-3 py-2 text-xs text-[#FF453A]">
                {errorMessage}
              </p>
            )}

            <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
              <label className="flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FAFAFA] px-5 py-3 text-sm font-semibold text-[#09090B] transition hover:bg-zinc-200 active:scale-[0.98]">
                <Upload className="h-4 w-4" aria-hidden="true" />
                <span>Elegir video del dispositivo</span>
                <input
                  type="file"
                  accept="video/*,.mp4,.webm,.mov,.m4v,.mkv,.ogv"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onSelectFile(file);
                    e.target.value = '';
                  }}
                />
              </label>

              <button
                type="button"
                onClick={() => (onOpenCamera ? onOpenCamera() : setShowCamera(true))}
                className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-[#1C1C21] px-4 py-2.5 text-xs font-semibold text-white transition hover:border-zinc-500 hover:bg-zinc-800 active:scale-[0.98]"
              >
                <Camera className="h-4 w-4 text-[#FF453A]" aria-hidden="true" />
                <span>Grabar video con cámara</span>
              </button>
            </div>

            <p className="mt-6 font-mono text-[11px] text-zinc-500 tabular-nums">
              MP4 · WebM · MOV · MKV · M4V · OGV · Máx. 500 MB
            </p>
          </div>
        </div>
      </div>

      {showCamera && (
        <CameraRecorderModal
          onClose={() => setShowCamera(false)}
          onUseVideo={(file) => {
            setShowCamera(false);
            onSelectFile(file);
          }}
        />
      )}
    </main>
  );
};
