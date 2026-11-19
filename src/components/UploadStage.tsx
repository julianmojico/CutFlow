import React, { useState } from 'react';
import { Camera, Captions, Film, Sliders, Upload, VolumeX } from './Icons';
import { CameraRecorderModal } from './CameraRecorderModal';
import { useI18n } from '../i18n/I18nContext';
import { gtmProps, trackEvent } from '../utils/analytics';

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
  const { t } = useI18n();
  const [isDragging, setIsDragging] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      trackEvent('video_drop', { file_type: file.type || 'unknown' });
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
              {t.upload.eyebrow}
            </p>
            <h1 className="mt-3 break-words font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">
              {t.upload.headline}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
              {t.upload.subheadline}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-5 border-t border-zinc-800/80 pt-6 sm:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <VolumeX className="h-4 w-4 text-[#FF453A]" aria-hidden="true" />
                <span>{t.upload.feature1Title}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                {t.upload.feature1Desc}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Captions className="h-4 w-4 text-zinc-200" aria-hidden="true" />
                <span>{t.upload.feature2Title}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                {t.upload.feature2Desc}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Sliders className="h-4 w-4 text-zinc-200" aria-hidden="true" />
                <span>{t.upload.feature3Title}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                {t.upload.feature3Desc}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Film className="h-4 w-4 text-zinc-200" aria-hidden="true" />
                <span>{t.upload.feature4Title}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                {t.upload.feature4Desc}
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
              {t.upload.dropTitle}
            </h2>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-zinc-400">
              {t.upload.dropDesc}
            </p>

            {errorMessage && (
              <p className="mt-4 rounded-lg border border-[#FF453A]/40 bg-[#FF453A]/10 px-3 py-2 text-xs text-[#FF453A]">
                {errorMessage}
              </p>
            )}

            <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
              <label
                onClick={() => trackEvent('trigger_video_upload', { location: 'upload_stage' })}
                {...gtmProps('upload_choose_file', 'upload', t.upload.chooseFile)}
                className="flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FAFAFA] px-5 py-3 text-sm font-semibold text-[#09090B] transition hover:bg-zinc-200 active:scale-[0.98]"
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                <span>{t.upload.chooseFile}</span>
                <input
                  type="file"
                  accept="video/*,.mp4,.webm,.mov,.m4v,.mkv,.ogv"
                  className="sr-only"
                  {...gtmProps('upload_file_input', 'upload', 'input')}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onSelectFile(file);
                    e.target.value = '';
                  }}
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  trackEvent('open_camera_modal', { location: 'upload_stage' });
                  if (onOpenCamera) {
                    onOpenCamera();
                  } else {
                    setShowCamera(true);
                  }
                }}
                {...gtmProps('upload_record_camera', 'upload', t.upload.recordCamera)}
                className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-[#1C1C21] px-4 py-2.5 text-xs font-semibold text-white transition hover:border-zinc-500 hover:bg-zinc-800 active:scale-[0.98]"
              >
                <Camera className="h-4 w-4 text-[#FF453A]" aria-hidden="true" />
                <span>{t.upload.recordCamera}</span>
              </button>
            </div>

            <p className="mt-6 font-mono text-[11px] text-zinc-500 tabular-nums">
              {t.upload.supportedFormats}
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
