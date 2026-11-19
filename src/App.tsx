import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Captions, Download, ExternalLink, Film, Scissors, Sliders, Type, X } from './components/Icons';
import { CameraRecorderModal } from './components/CameraRecorderModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { TopBar } from './components/TopBar';
import { UploadStage } from './components/UploadStage';
import { VideoPreviewStage } from './components/VideoPreviewStage';
import { WaveformTimeline } from './components/WaveformTimeline';
import { AudioCutsPanel } from './components/panels/AudioCutsPanel';
import { DEFAULT_VIDEO_EFFECTS, EffectsPanel } from './components/panels/EffectsPanel';
import { ExportPanel } from './components/panels/ExportPanel';
import { StyleAnimationPanel } from './components/panels/StyleAnimationPanel';
import { SubtitlesPanel } from './components/panels/SubtitlesPanel';
import type {
  AspectRatioPreset,
  AudioAnalysisConfig,
  CutSegment,
  EditorTab,
  FitMode,
  SubtitleCue,
  SubtitleStyleConfig,
  TimeRegion,
  VideoAsset,
  VideoEffectsConfig,
} from './types/editor';
import { useI18n } from './i18n/I18nContext';
import { gtmProps, trackEvent, trackPageView } from './utils/analytics';
import {
  analyzeVideoAudio,
  formatBytes,
  getEditedDuration,
  getEnabledCutIntervals,
  mapOriginalToEditedTime,
  mergeSortedCuts,
} from './utils/audioEngine';
import { detectVideoAspectRatio } from './utils/subtitleRenderer';

const MAX_VIDEO_FILE_BYTES = 500 * 1024 * 1024; // 500 MB input video limit

const DEFAULT_SUBTITLE_STYLE: SubtitleStyleConfig = {
  fontFamily: 'DM Sans',
  fontSize: 54,
  fontWeight: 700,
  uppercase: false,
  textColor: '#FAFAFA',
  highlightColor: '#FF453A',
  strokeColor: '#09090B',
  strokeWidth: 3,
  shadowEnabled: true,
  bgEnabled: true,
  bgColor: '#09090B',
  bgOpacity: 0.72,
  bgRadius: 12,
  positionPreset: 'bottom',
  xPercent: 50,
  yPercent: 82,
  maxWidthPercent: 86,
  animation: 'karaoke',
};

const DEFAULT_AUDIO_CONFIG: AudioAnalysisConfig = {
  silenceThresholdDb: -34,
  minSilenceMs: 360,
  detectHesitations: true,
  hesitationSensitivity: 60,
};

const MAX_RETENTION_MS = 60 * 60 * 1000; // Strict 1-hour maximum retention

export default function App() {
  const { language, t } = useI18n();
  const [asset, setAsset] = useState<VideoAsset | null>(null);
  const [sourceBlob, setSourceBlob] = useState<Blob | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  const [activeTab, setActiveTab] = useState<EditorTab>('audio');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioPreset>('16:9');
  const [nativeAspectLabel, setNativeAspectLabel] = useState<string | null>(null);
  const [fitMode, setFitMode] = useState<FitMode>('contain');

  const [audioConfig, setAudioConfig] = useState<AudioAnalysisConfig>(DEFAULT_AUDIO_CONFIG);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [speechRegions, setSpeechRegions] = useState<TimeRegion[]>([]);
  const [cuts, setCuts] = useState<CutSegment[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [cues, setCues] = useState<SubtitleCue[]>([]);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyleConfig>(DEFAULT_SUBTITLE_STYLE);
  const [animPreviewTrigger, setAnimPreviewTrigger] = useState(0);
  const [effects, setEffects] = useState<VideoEffectsConfig>(DEFAULT_VIDEO_EFFECTS);

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [skipCuts, setSkipCuts] = useState(true);
  const [importSnack, setImportSnack] = useState<{
    width: number;
    height: number;
    ratioLabel: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const userSelectedAspectRef = useRef(false);
  const snackTimerRef = useRef<number | null>(null);
  const lastTrackedPathRef = useRef<string | null>(null);

  useEffect(() => {
    const viewPath = showCamera
      ? '/camera'
      : asset
        ? `/editor/${activeTab}`
        : '/upload';

    // Skip duplicating the initial landing page_view already sent by gtag('config', ...) on load
    if (lastTrackedPathRef.current === null && viewPath === '/upload') {
      lastTrackedPathRef.current = viewPath;
      return;
    }

    if (lastTrackedPathRef.current === viewPath) return;
    lastTrackedPathRef.current = viewPath;

    const viewTitle = showCamera
      ? `CutFlow Studio — ${t.camera.title}`
      : asset
        ? `CutFlow Studio — ${t.tabs[activeTab]}`
        : t.seo.title;

    trackPageView(viewPath, viewTitle, {
      ui_language: language,
      has_video: Boolean(asset),
    });
  }, [activeTab, asset, language, showCamera, t.camera.title, t.seo.title, t.tabs]);

  const showImportSnack = useCallback((width: number, height: number, ratioLabel: string) => {
    setImportSnack({ width, height, ratioLabel });
    if (snackTimerRef.current) {
      window.clearTimeout(snackTimerRef.current);
    }
    snackTimerRef.current = window.setTimeout(() => {
      setImportSnack(null);
      snackTimerRef.current = null;
    }, 6000);
  }, []);

  const dismissImportSnack = useCallback(() => {
    if (snackTimerRef.current) {
      window.clearTimeout(snackTimerRef.current);
      snackTimerRef.current = null;
    }
    setImportSnack(null);
  }, []);

  const handleChangeAspectRatio = useCallback((next: AspectRatioPreset) => {
    userSelectedAspectRef.current = true;
    setAspectRatio(next);
  }, []);

  useEffect(() => {
    return () => {
      if (snackTimerRef.current) {
        window.clearTimeout(snackTimerRef.current);
      }
    };
  }, []);

  const goToTab = useCallback((tab: EditorTab, scrollToPanel = true) => {
    setActiveTab(tab);
    trackEvent('tab_change', { tab });
    if (scrollToPanel) {
      requestAnimationFrame(() => {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.removeItem('cutflow_studio_prefs_v2');
    } catch {
      // ignore storage access errors
    }
  }, []);

  useEffect(() => {
    const revokeCurrent = () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
    window.addEventListener('pagehide', revokeCurrent);
    return () => {
      window.removeEventListener('pagehide', revokeCurrent);
      revokeCurrent();
    };
  }, []);

  useEffect(() => {
    if (!asset) return;
    const expireVideoTimer = window.setTimeout(() => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setAsset(null);
      setSourceBlob(null);
      setPeaks([]);
      setSpeechRegions([]);
      setCuts([]);
      setCues([]);
      setDetectedLanguage(null);
      setIsPlaying(false);
    }, MAX_RETENTION_MS);
    return () => window.clearTimeout(expireVideoTimer);
  }, [asset]);

  const runAudioAnalysis = useCallback(
    async (blob: Blob, config: AudioAnalysisConfig, fallbackDuration?: number) => {
      setIsAnalyzing(true);
      try {
        const res = await analyzeVideoAudio(blob, config, fallbackDuration, language);
        setPeaks(res.peaks);
        setSpeechRegions(res.speechRegions);
        setCuts((prev) => {
          const manualCuts = prev.filter((c) => c.kind === 'manual');
          return mergeSortedCuts([...res.detectedCuts, ...manualCuts]);
        });
        return res;
      } catch {
        setPeaks([]);
        setSpeechRegions([]);
        return null;
      } finally {
        setIsAnalyzing(false);
      }
    },
    [language]
  );

  const loadVideoBlob = useCallback(
    async (blob: Blob, fileName: string, mimeType: string) => {
      setUploadError(null);
      if (blob.size > MAX_VIDEO_FILE_BYTES) {
        throw new Error(t.errors.fileTooLarge(formatBytes(blob.size)));
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;

      const probe = document.createElement('video');
      probe.muted = true;
      probe.playsInline = true;
      probe.preload = 'auto';
      probe.src = url;

      const meta = await new Promise<{ duration: number; width: number; height: number }>(
        (resolve, reject) => {
          let settled = false;
          let metaFallbackTimer: number | null = null;
          let hardTimeoutTimer: number | null = null;

          const finish = () => {
            if (settled) return;
            settled = true;
            // Read intrinsic dimensions & duration BEFORE clearing probe src/load!
            const duration = Number.isFinite(probe.duration) ? probe.duration : 0;
            const width = probe.videoWidth || 1280;
            const height = probe.videoHeight || 720;
            cleanup();
            resolve({ duration, width, height });
          };

          const onLoadedData = () => {
            if (probe.videoWidth > 0 && probe.videoHeight > 0) {
              finish();
            }
          };

          const onMeta = () => {
            if (probe.videoWidth > 0 && probe.videoHeight > 0) {
              if (probe.readyState >= 2) {
                finish();
              } else if (!metaFallbackTimer) {
                // Allow a brief window for loadeddata to apply rotation metadata if needed
                metaFallbackTimer = window.setTimeout(finish, 350);
              }
            }
          };

          const onErr = () => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(new Error(t.errors.decodeVideoFailed));
          };

          const cleanup = () => {
            if (metaFallbackTimer) {
              window.clearTimeout(metaFallbackTimer);
              metaFallbackTimer = null;
            }
            if (hardTimeoutTimer) {
              window.clearTimeout(hardTimeoutTimer);
              hardTimeoutTimer = null;
            }
            probe.removeEventListener('loadedmetadata', onMeta);
            probe.removeEventListener('loadeddata', onLoadedData);
            probe.removeEventListener('canplay', onLoadedData);
            probe.removeEventListener('resize', onLoadedData);
            probe.removeEventListener('error', onErr);
            probe.removeAttribute('src');
            probe.load();
          };

          probe.addEventListener('loadedmetadata', onMeta);
          probe.addEventListener('loadeddata', onLoadedData);
          probe.addEventListener('canplay', onLoadedData);
          probe.addEventListener('resize', onLoadedData);
          probe.addEventListener('error', onErr);
          hardTimeoutTimer = window.setTimeout(finish, 4000);
          probe.load();
        }
      );

      const detectedRatio = detectVideoAspectRatio(meta.width, meta.height);
      userSelectedAspectRef.current = false;
      setSourceBlob(blob);
      setAsset({
        url,
        fileName,
        fileSize: blob.size,
        mimeType: mimeType || 'video/mp4',
        duration: meta.duration,
        width: meta.width,
        height: meta.height,
      });
      setAspectRatio(detectedRatio.preset);
      setNativeAspectLabel(detectedRatio.nativeLabel);
      showImportSnack(meta.width, meta.height, detectedRatio.displayLabel);
      setCurrentTime(0);
      setIsPlaying(false);
      setCuts([]);
      setCues([]);
      setDetectedLanguage(null);
      trackEvent('video_loaded', {
        source: fileName.startsWith('grabacion-') ? 'camera' : 'upload',
        detected_aspect_ratio: detectedRatio.displayLabel,
        width: meta.width,
        height: meta.height,
      });

      const analysis = await runAudioAnalysis(blob, audioConfig, meta.duration);
      if ((!meta.duration || !Number.isFinite(meta.duration)) && analysis?.duration) {
        setAsset((prev) => (prev ? { ...prev, duration: analysis.duration } : prev));
      }
    },
    [audioConfig, runAudioAnalysis, showImportSnack, t.errors]
  );

  const handleSelectFile = async (file: File) => {
    try {
      await loadVideoBlob(file, file.name, file.type);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : t.errors.loadVideoFailed);
    }
  };

  const enabledCutIntervals = useMemo(() => getEnabledCutIntervals(cuts), [cuts]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const syncDecodedDimensions = () => {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (vw > 0 && vh > 0 && asset && (vw !== asset.width || vh !== asset.height)) {
        const detected = detectVideoAspectRatio(vw, vh);
        setAsset((prev) =>
          prev
            ? {
                ...prev,
                width: vw,
                height: vh,
                duration:
                  prev.duration > 0
                    ? prev.duration
                    : Number.isFinite(video.duration)
                      ? video.duration
                      : prev.duration,
              }
            : prev
        );
        setNativeAspectLabel(detected.nativeLabel);
        if (!userSelectedAspectRef.current) {
          setAspectRatio(detected.preset);
        }
        showImportSnack(vw, vh, detected.displayLabel);
      }
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', syncDecodedDimensions);
    video.addEventListener('loadeddata', syncDecodedDimensions);
    video.addEventListener('resize', syncDecodedDimensions);
    syncDecodedDimensions();

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', syncDecodedDimensions);
      video.removeEventListener('loadeddata', syncDecodedDimensions);
      video.removeEventListener('resize', syncDecodedDimensions);
    };
  }, [asset, showImportSnack]);

  useEffect(() => {
    if (!isPlaying) return;
    let rafId = 0;
    const tick = () => {
      const video = videoRef.current;
      if (video) {
        const t = video.currentTime;
        if (skipCuts && enabledCutIntervals.length > 0) {
          const hit = enabledCutIntervals.find((c) => t >= c.startTime && t < c.endTime - 0.03);
          if (hit) {
            if (hit.endTime >= (asset?.duration || video.duration) - 0.05) {
              video.pause();
            } else {
              video.currentTime = hit.endTime;
            }
          }
        }
        setCurrentTime(video.currentTime);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [asset?.duration, enabledCutIntervals, isPlaying, skipCuts]);

  const handleSeek = (time: number) => {
    const clamped = Math.max(0, Math.min(asset?.duration || time, time));
    setCurrentTime(clamped);
    if (videoRef.current) {
      videoRef.current.currentTime = clamped;
    }
  };

  const handleTogglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const handleToggleCut = (id: string) => {
    setCuts((prev) => prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c)));
  };

  const handleDeleteCut = (id: string) => {
    setCuts((prev) => prev.filter((c) => c.id !== id));
  };

  const handleEnableAllCuts = (enabled: boolean) => {
    setCuts((prev) => prev.map((c) => ({ ...c, enabled })));
  };

  const handleAddManualCutAtPlayhead = () => {
    if (!asset) return;
    const start = Number(currentTime.toFixed(2));
    const end = Number(Math.min(asset.duration, start + 0.8).toFixed(2));
    if (end - start < 0.1) return;
    const cut: CutSegment = {
      id: `cut-man-${Date.now()}`,
      startTime: start,
      endTime: end,
      kind: 'manual',
      enabled: true,
      label: t.cuts.manualCut((end - start).toFixed(1)),
    };
    setCuts((prev) => mergeSortedCuts([...prev, cut]));
  };

  const handleDeleteCue = (cue: SubtitleCue) => {
    setCues((prev) => prev.filter((c) => c.id !== cue.id));

    const span = cue.endTime - cue.startTime;
    if (span >= 0.05) {
      const trimmed = cue.text.trim();
      const preview = trimmed.slice(0, 26);
      const cut: CutSegment = {
        id: `cut-cue-${Date.now()}-${Math.round(cue.startTime * 100)}`,
        startTime: cue.startTime,
        endTime: cue.endTime,
        kind: 'manual',
        enabled: true,
        label: trimmed
          ? t.cuts.deletedBlockWithText(preview, trimmed.length > 26)
          : t.cuts.deletedBlock(span.toFixed(1)),
      };
      setCuts((prev) => mergeSortedCuts([...prev, cut]));

      if (
        currentTime >= cue.startTime &&
        currentTime < cue.endTime &&
        asset &&
        cue.endTime < asset.duration - 0.05
      ) {
        handleSeek(cue.endTime);
      }
    }
  };

  const editedDuration = useMemo(
    () => (asset ? getEditedDuration(asset.duration, cuts) : 0),
    [asset, cuts]
  );

  const editedCurrentTime = useMemo(
    () => mapOriginalToEditedTime(currentTime, cuts),
    [currentTime, cuts]
  );

  const activeCue = useMemo(
    () => cues.find((c) => currentTime >= c.startTime && currentTime <= c.endTime) || null,
    [cues, currentTime]
  );

  const firstCue = useMemo(() => cues[0] || null, [cues]);

  const activeCutCount = useMemo(() => cuts.filter((c) => c.enabled).length, [cuts]);

  const TABS: Array<{ id: EditorTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'audio', label: t.tabs.audio, icon: Scissors },
    { id: 'subtitles', label: t.tabs.subtitles, icon: Captions },
    { id: 'style', label: t.tabs.style, icon: Type },
    { id: 'effects', label: t.tabs.effects, icon: Sliders },
    { id: 'export', label: t.tabs.export, icon: Download },
  ];

  const handleToggleBlurBorders = useCallback(() => {
    setEffects((prev) => {
      const nextValue = !(prev.blurBorders && fitMode === 'contain');
      if (nextValue && fitMode !== 'contain') {
        setFitMode('contain');
      }
      return { ...prev, blurBorders: nextValue };
    });
  }, [fitMode]);

  return (
    <div className="flex min-h-screen w-full max-w-full flex-col overflow-x-clip bg-[#09090B] text-[#FAFAFA]">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,.mp4,.webm,.mov,.m4v,.mkv,.ogv"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleSelectFile(file);
          e.target.value = '';
        }}
      />

      <TopBar
        asset={asset}
        editedDuration={editedDuration}
        activeCutCount={activeCutCount}
        onTriggerUpload={() => fileInputRef.current?.click()}
        onTriggerRecord={() => setShowCamera(true)}
        onJumpToExport={() => goToTab('export', true)}
      />

      {!asset ? (
        <UploadStage
          onSelectFile={handleSelectFile}
          onOpenCamera={() => setShowCamera(true)}
          errorMessage={uploadError}
        />
      ) : (
        <main className="mx-auto flex w-full max-w-7xl min-w-0 flex-1 flex-col gap-4 px-3 pt-3 pb-6 sm:px-6 sm:pt-5 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6 lg:pb-8">
          {/* Left Studio Column */}
          <div className="flex min-w-0 flex-col gap-4 lg:col-span-7 lg:sticky lg:top-[72px]">
            <VideoPreviewStage
              asset={asset}
              videoRef={videoRef}
              currentTime={currentTime}
              editedCurrentTime={editedCurrentTime}
              editedDuration={editedDuration}
              isPlaying={isPlaying}
              skipCuts={skipCuts}
              onToggleSkipCuts={() => setSkipCuts((p) => !p)}
              onTogglePlay={handleTogglePlay}
              onSeek={handleSeek}
              activeCue={activeCue}
              firstCue={firstCue}
              subtitleStyle={subtitleStyle}
              animPreviewTrigger={animPreviewTrigger}
              onUpdateSubtitlePosition={(xPercent, yPercent) =>
                setSubtitleStyle((prev) => ({
                  ...prev,
                  positionPreset: 'custom',
                  xPercent,
                  yPercent,
                }))
              }
              effects={effects}
              aspectRatio={aspectRatio}
              nativeAspectLabel={nativeAspectLabel}
              onChangeAspectRatio={handleChangeAspectRatio}
              fitMode={fitMode}
              onToggleFitMode={() =>
                setFitMode((prev) => (prev === 'contain' ? 'cover' : 'contain'))
              }
              onToggleBlurBorders={handleToggleBlurBorders}
            />

            {activeTab !== 'subtitles' && (
              <WaveformTimeline
                peaks={peaks}
                duration={asset.duration}
                currentTime={currentTime}
                cuts={cuts}
                cues={cues}
                isAnalyzing={isAnalyzing}
                onSeek={handleSeek}
                onToggleCut={handleToggleCut}
                onAddManualCutAtPlayhead={handleAddManualCutAtPlayhead}
              />
            )}
          </div>

          {/* Right Studio Column */}
          <aside
            ref={panelRef}
            className="min-w-0 scroll-mt-[68px] flex flex-col rounded-2xl border border-zinc-800 bg-[#131316] lg:col-span-5"
          >
            <nav
              aria-label={t.tabs.desktopNavAria}
              className="hidden lg:flex lg:items-center border-b border-zinc-800/80 p-1.5 gap-1"
            >
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => goToTab(tab.id, false)}
                    {...gtmProps(`tab_desktop_${tab.id}`, 'navigation', tab.label)}
                    className={`flex min-h-[40px] flex-1 items-center justify-center gap-1 rounded-lg px-2 text-[11px] xl:text-xs font-medium transition whitespace-nowrap ${
                      active
                        ? 'bg-[#FAFAFA] text-[#09090B]'
                        : 'text-zinc-400 hover:bg-[#1C1C21] hover:text-zinc-100'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="p-4 sm:p-5">
              {activeTab === 'audio' && (
                <AudioCutsPanel
                  config={audioConfig}
                  cuts={cuts}
                  isAnalyzing={isAnalyzing}
                  onChangeConfig={setAudioConfig}
                  onReanalyze={() => {
                    if (sourceBlob) {
                      runAudioAnalysis(sourceBlob, audioConfig, asset.duration);
                    }
                  }}
                  onToggleCut={handleToggleCut}
                  onDeleteCut={handleDeleteCut}
                  onEnableAllCuts={handleEnableAllCuts}
                  onSeek={handleSeek}
                  onNextStep={() => goToTab('subtitles', true)}
                />
              )}

              {activeTab === 'subtitles' && (
                <SubtitlesPanel
                  sourceBlob={sourceBlob}
                  cues={cues}
                  speechRegions={speechRegions}
                  detectedLanguage={detectedLanguage}
                  currentTime={currentTime}
                  duration={asset.duration}
                  onChangeCues={setCues}
                  onDeleteCue={handleDeleteCue}
                  onChangeDetectedLanguage={setDetectedLanguage}
                  onSeek={handleSeek}
                  onNextStep={() => goToTab('style', true)}
                />
              )}

              {activeTab === 'style' && (
                <StyleAnimationPanel
                  style={subtitleStyle}
                  onChangeStyle={setSubtitleStyle}
                  onReplayAnimation={() => setAnimPreviewTrigger((n) => n + 1)}
                  onNextStep={() => goToTab('effects', true)}
                />
              )}

              {activeTab === 'effects' && (
                <EffectsPanel
                  effects={effects}
                  fitMode={fitMode}
                  onChangeEffects={setEffects}
                  onToggleBlurBorders={handleToggleBlurBorders}
                  onNextStep={() => goToTab('export', true)}
                />
              )}

              {activeTab === 'export' && (
                <ExportPanel
                  asset={asset}
                  cuts={cuts}
                  cues={cues}
                  subtitleStyle={subtitleStyle}
                  effects={effects}
                  aspectRatio={aspectRatio}
                  nativeAspectLabel={nativeAspectLabel}
                  fitMode={fitMode}
                  onChangeAspectRatio={handleChangeAspectRatio}
                  onToggleFitMode={() =>
                    setFitMode((prev) => (prev === 'contain' ? 'cover' : 'contain'))
                  }
                  onToggleBlurBorders={handleToggleBlurBorders}
                />
              )}
            </div>
          </aside>
        </main>
      )}

      {asset && (
        <nav
          aria-label={t.tabs.mobileNavAria}
          className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-800 bg-[#09090B]/95 backdrop-blur-md pb-safe lg:hidden"
        >
          <div className="grid h-16 grid-cols-5 items-center">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => goToTab(tab.id, true)}
                  {...gtmProps(`tab_mobile_${tab.id}`, 'navigation', tab.label)}
                  className={`flex min-h-[44px] min-w-0 flex-col items-center justify-center gap-1 px-0.5 transition ${
                    active ? 'text-[#FAFAFA]' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 shrink-0 ${active ? 'text-[#FF453A]' : ''}`}
                    aria-hidden="true"
                  />
                  <span className="max-w-full truncate text-[10px] font-medium tracking-tight leading-none whitespace-nowrap">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      <footer
        className={`border-t border-zinc-800/80 bg-[#09090B] px-4 py-4 text-center text-xs text-zinc-400 sm:px-6 ${
          asset ? 'pb-20 lg:pb-4' : ''
        }`}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <span>{t.footer.developedBy}</span>
          <a
            href="https://www.linkedin.com/in/julianmojico/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('outbound_click', { destination: 'linkedin' })}
            {...gtmProps('footer_linkedin_link', 'footer', 'LinkedIn')}
            className="inline-flex items-center gap-1 font-medium text-zinc-200 underline decoration-zinc-700 underline-offset-4 transition hover:text-white hover:decoration-white"
          >
            <span>LinkedIn</span>
            <ExternalLink className="h-3 w-3 text-zinc-400" aria-hidden="true" />
          </a>
        </div>
      </footer>

      {showCamera && (
        <CameraRecorderModal
          onClose={() => setShowCamera(false)}
          onUseVideo={(file) => {
            setShowCamera(false);
            handleSelectFile(file);
          }}
        />
      )}

      {importSnack && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between gap-3 rounded-xl border border-zinc-700 bg-[#131316]/95 px-3.5 py-2.5 text-xs text-zinc-100 shadow-2xl backdrop-blur-md lg:bottom-6"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#FF453A]/15 text-[#FF453A]">
              <Film className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <p className="leading-snug text-zinc-100">
              {t.importSnack.message(
                `${importSnack.width}×${importSnack.height}`,
                importSnack.ratioLabel
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              trackEvent('import_snack_dismiss');
              dismissImportSnack();
            }}
            {...gtmProps('import_snack_dismiss', 'notification', 'close')}
            aria-label={t.importSnack.closeAria}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      <OfflineIndicator />
    </div>
  );
}
