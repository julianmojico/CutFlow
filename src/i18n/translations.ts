export type UILanguage = 'es' | 'pt' | 'en';

export const SUPPORTED_LANGUAGES: Array<{
  code: UILanguage;
  shortLabel: string;
  nativeName: string;
  ogLocale: string;
}> = [
  { code: 'es', shortLabel: 'ES', nativeName: 'Español', ogLocale: 'es_ES' },
  { code: 'pt', shortLabel: 'PT', nativeName: 'Português', ogLocale: 'pt_BR' },
  { code: 'en', shortLabel: 'EN', nativeName: 'English', ogLocale: 'en_US' },
];

export function detectBrowserLanguage(): UILanguage {
  if (typeof navigator === 'undefined') return 'es';
  const candidates: string[] = [];
  if (Array.isArray(navigator.languages)) {
    candidates.push(...navigator.languages);
  }
  if (navigator.language) {
    candidates.push(navigator.language);
  }

  for (const raw of candidates) {
    const base = raw.toLowerCase().trim().split(/[-_]/)[0];
    if (base === 'es' || base === 'pt' || base === 'en') {
      return base;
    }
  }
  return 'es';
}

export interface TranslationDictionary {
  seo: {
    title: string;
    description: string;
    ogImageAlt: string;
  };
  languageSwitcher: {
    ariaLabel: string;
    menuLabel: string;
  };
  topBar: {
    cuts: (count: number) => string;
    recordVideo: string;
    recordShort: string;
    changeVideo: string;
    videoShort: string;
    export: string;
    uploadVideo: string;
    uploadShort: string;
  };
  pwa: {
    installApp: string;
    installShort: string;
    iosModalTitle: string;
    close: string;
    iosStep1Prefix: string;
    iosStep1Bold: string;
    iosStep1Suffix: string;
    iosStep2Prefix: string;
    iosStep2Bold: string;
    iosStep2Suffix: string;
    understood: string;
  };
  upload: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    feature1Title: string;
    feature1Desc: string;
    feature2Title: string;
    feature2Desc: string;
    feature3Title: string;
    feature3Desc: string;
    feature4Title: string;
    feature4Desc: string;
    dropTitle: string;
    dropDesc: string;
    chooseFile: string;
    recordCamera: string;
    supportedFormats: string;
  };
  tabs: {
    desktopNavAria: string;
    mobileNavAria: string;
    audio: string;
    subtitles: string;
    style: string;
    effects: string;
    export: string;
  };
  footer: {
    developedBy: string;
  };
  offline: {
    status: string;
  };
  importSnack: {
    message: (resolution: string, ratio: string) => string;
    closeAria: string;
  };
  errors: {
    fileTooLarge: (sizeLabel: string) => string;
    decodeVideoFailed: string;
    loadVideoFailed: string;
    previewDecodeFailed: string;
    audioExtractFailed: string;
    offlineAudioUnsupported: string;
  };
  cuts: {
    silencePause: (sec: string) => string;
    finalPause: (sec: string) => string;
    possibleFiller: (sec: string) => string;
    manualCut: (sec: string) => string;
    deletedBlockWithText: (preview: string, truncated: boolean) => string;
    deletedBlock: (sec: string) => string;
  };
  preview: {
    fit: string;
    fill: string;
    switchToFill: string;
    switchToFit: string;
    blurBorders: string;
    blurBordersTitle: string;
    noEffects: string;
    compareNoEffectsTitle: string;
    sampleSubtitle: string;
    dragSubtitleTitle: string;
    rewind2s: string;
    pause: string;
    play: string;
    forward2s: string;
    skippingCuts: string;
    uncutVideo: string;
  };
  timeline: {
    title: string;
    analyzing: string;
    cutHere: string;
    segmentClickHint: (label: string, enabled: boolean) => string;
    legendSilence: string;
    legendFiller: string;
    tapRegionHint: string;
  };
  audioPanel: {
    title: string;
    summary: (activeCount: number, savedSeconds: string) => string;
    analyzing: string;
    analyze: string;
    silenceThreshold: string;
    minPauseDuration: string;
    detectHesitationsTitle: string;
    detectHesitationsDesc: string;
    hesitationSensitivity: string;
    detectedSegments: (count: number) => string;
    cutAll: string;
    keepAll: string;
    emptyState: string;
    keepSegmentTitle: string;
    cutSegmentTitle: string;
    deleteMarkerTitle: string;
    nextStep: string;
  };
  subtitlesPanel: {
    title: string;
    linesCount: (count: number) => string;
    detectedLanguageSuffix: (lang: string) => string;
    addLine: string;
    transcribingBtn: string;
    autoTranscribeBtn: string;
    stageExtracting: string;
    stageNoAudio: string;
    stageChunk: (current: number, total: number) => string;
    stageTranscribing: string;
    stageRetryNetwork: (attempt: number, max: number) => string;
    stageRetryBusy: (attempt: number, max: number) => string;
    stageDone: string;
    errorDefault: string;
    errorUnexpected: string;
    unknownLanguage: string;
    noSpeechDetected: string;
    detectedLanguageLabel: string;
    emptyState: string;
    splitCueTitle: string;
    deleteCueTitle: string;
    newSubtitleDefault: string;
    nextStep: string;
  };
  stylePanel: {
    title: string;
    subtitle: string;
    entranceAnimation: string;
    testBtn: string;
    animations: {
      none: string;
      fade: string;
      'slide-up': string;
      pop: string;
      karaoke: string;
      typewriter: string;
    };
    canvasPosition: string;
    positions: {
      top: string;
      middle: string;
      bottom: string;
    };
    axisX: string;
    axisY: string;
    typography: string;
    fontSize: string;
    bold: string;
    uppercase: string;
    textColor: string;
    textColorAria: (hex: string) => string;
    customColorAria: string;
    highlightColor: string;
    highlightColorAria: (hex: string) => string;
    stroke: string;
    shadow: string;
    bgBox: string;
    bgColor: string;
    bgColorAria: (hex: string) => string;
    opacity: string;
    nextStep: string;
  };
  effectsPanel: {
    title: string;
    subtitle: string;
    reset: string;
    blurBordersTitle: string;
    blurBordersDesc: string;
    active: string;
    activate: string;
    presets: {
      original: string;
      highContrast: string;
      warmCinema: string;
      blackAndWhite: string;
      softPortrait: string;
    };
    sliders: {
      brightness: string;
      contrast: string;
      exposure: string;
      saturation: string;
      vignette: string;
      blur: string;
      warmth: string;
    };
    nextStep: string;
  };
  exportPanel: {
    title: string;
    canvasFormat: string;
    resolution: string;
    quality1080p: string;
    quality720p: string;
    qualityNative: string;
    framing: string;
    fit: string;
    fill: string;
    blur: string;
    blurTitle: string;
    preparingRender: string;
    cancelRender: string;
    renderAndExport: string;
    downloadAgain: string;
    exportErrorDefault: string;
    srtTitle: string;
    srtLines: (count: number) => string;
    adjustSrtTiming: string;
    downloadSrt: string;
    copied: string;
    copy: string;
    fileSuffix: string;
  };
  exportEngine: {
    allSegmentsCut: string;
    canvasInitFailed: string;
    videoLoadFailed: string;
    captureUnsupported: string;
    recorderUnsupported: string;
    startingRender: string;
    cancelledByUser: string;
    renderingSegment: (current: number, total: number) => string;
    finalizingCapture: string;
    noFramesCaptured: string;
    captureTooLarge: string;
    preparingMp4: string;
    mp4ConvertFailed: (detail: string) => string;
    uploadingChunk: (current: number, total: number) => string;
    uploadingSingle: string;
    encodingMp4: string;
    emptyMp4Server: string;
    mp4Ready: string;
  };
  camera: {
    dialogAria: string;
    title: string;
    switchCamera: string;
    cameraShort: string;
    close: string;
    initializing: string;
    retryAccess: string;
    stopRecording: (timecode: string) => string;
    startRecording: string;
    errNoMediaDevices: string;
    errPermissionDenied: string;
    errNotFound: string;
    errInitFailed: string;
    errNoRecorder: string;
    errEmptyRecording: string;
    errStartFailed: string;
  };
}

export const TRANSLATIONS: Record<UILanguage, TranslationDictionary> = {
  es: {
    seo: {
      title: 'CutFlow Studio — Editor de Video y Subtítulos Online',
      description:
        'Edita videos gratis en tu navegador: elimina silencios y muletillas, crea subtítulos animados tipo karaoke, aplica efectos y exporta en MP4 o SRT sin cuenta.',
      ogImageAlt: 'CutFlow Studio — Editor de video, corte de silencios y subtítulos animados',
    },
    languageSwitcher: {
      ariaLabel: 'Cambiar idioma de la interfaz',
      menuLabel: 'Idioma de la aplicación',
    },
    topBar: {
      cuts: (n) => `${n} cortes`,
      recordVideo: 'Grabar video',
      recordShort: 'Grabar',
      changeVideo: 'Cambiar video',
      videoShort: 'Video',
      export: 'Exportar',
      uploadVideo: 'Subir video',
      uploadShort: 'Subir',
    },
    pwa: {
      installApp: 'Instalar App',
      installShort: 'Instalar',
      iosModalTitle: 'Instalar en pantalla de inicio',
      close: 'Cerrar',
      iosStep1Prefix: '1. Toca el botón ',
      iosStep1Bold: 'Compartir',
      iosStep1Suffix: ' en la barra del navegador.',
      iosStep2Prefix: '2. Selecciona ',
      iosStep2Bold: 'Agregar a inicio',
      iosStep2Suffix: ' para usar CutFlow como app nativa.',
      understood: 'Entendido',
    },
    upload: {
      eyebrow: 'Estudio móvil de edición local · Android PWA',
      headline:
        'Limpia silencios, anima subtítulos y exporta sin límites. Sin registrarte. Gratis por siempre.',
      subheadline:
        'Sube cualquier video desde tu dispositivo. Analizamos la forma de onda localmente para detectar pausas y muletillas como «emm» o «err», sincronizar subtítulos animados y renderizar el resultado con efectos visuales en cualquier relación de aspecto.',
      feature1Title: 'Cortes por señal',
      feature1Desc: 'Detección local en decibelios para pausas largas y vacilaciones vocales.',
      feature2Title: 'SRT y Karaoke',
      feature2Desc: 'Transcripción automática con detección de idioma y subtítulos animados.',
      feature3Title: 'Etalonaje directo',
      feature3Desc: 'Brillo, contraste, niveles, saturación, viñeta y desenfoque en vivo.',
      feature4Title: 'Cualquier formato',
      feature4Desc: 'MP4, WebM, MOV o MKV hacia lienzos 9:16, 16:9, 1:1, 4:5, 21:9 o nativo.',
      dropTitle: 'Selecciona o arrastra un video',
      dropDesc:
        'Todo el análisis de audio y renderizado ocurre dentro de tu navegador sin subir archivos a la nube.',
      chooseFile: 'Elegir video del dispositivo',
      recordCamera: 'Grabar video con cámara',
      supportedFormats: 'MP4 · WebM · MOV · MKV · M4V · OGV · Máx. 500 MB',
    },
    tabs: {
      desktopNavAria: 'Herramientas de edición',
      mobileNavAria: 'Navegación móvil',
      audio: 'Audio',
      subtitles: 'Transcripción',
      style: 'Estilo',
      effects: 'Efectos',
      export: 'Exportar',
    },
    footer: {
      developedBy: 'Desarrollo: Julian Mojico ·',
    },
    offline: {
      status: 'Modo sin conexión · Edición local activa',
    },
    importSnack: {
      message: (resolution, ratio) =>
        `Video importado en resolución ${resolution} · relación ${ratio} detectada`,
      closeAria: 'Cerrar notificación',
    },
    errors: {
      fileTooLarge: (size) => `El video pesa ${size} y supera el límite máximo de 500 MB.`,
      decodeVideoFailed: 'El navegador no pudo decodificar este archivo de video.',
      loadVideoFailed: 'No se pudo cargar el video seleccionado.',
      previewDecodeFailed: 'El navegador no pudo decodificar la imagen de este video.',
      audioExtractFailed:
        'No se pudo extraer una pista de audio legible de este video en el navegador.',
      offlineAudioUnsupported: 'Tu navegador no soporta procesamiento de audio sin conexión.',
    },
    cuts: {
      silencePause: (sec) => `Silencio / Pausa (${sec}s)`,
      finalPause: (sec) => `Pausa final (${sec}s)`,
      possibleFiller: (sec) => `Posible muletilla "emm / err" (${sec}s)`,
      manualCut: (sec) => `Corte manual (${sec}s)`,
      deletedBlockWithText: (preview, truncated) =>
        `Bloque borrado: «${preview}${truncated ? '…' : ''}»`,
      deletedBlock: (sec) => `Bloque borrado (${sec}s)`,
    },
    preview: {
      fit: 'Ajustar',
      fill: 'Rellenar',
      switchToFill: 'Cambiar a Rellenar',
      switchToFit: 'Cambiar a Ajustar',
      blurBorders: 'Bordes blur',
      blurBordersTitle: 'Completar los bordes vacíos con desenfoque',
      noEffects: 'Sin efectos',
      compareNoEffectsTitle: 'Comparar video sin efectos',
      sampleSubtitle: 'Vista previa de subtítulo animado',
      dragSubtitleTitle: 'Arrastra para mover la ubicación del subtítulo',
      rewind2s: 'Retroceder 2 segundos',
      pause: 'Pausar',
      play: 'Reproducir',
      forward2s: 'Avanzar 2 segundos',
      skippingCuts: 'Saltando cortes',
      uncutVideo: 'Video sin cortes',
    },
    timeline: {
      title: 'Línea de tiempo de audio',
      analyzing: 'Analizando señal...',
      cutHere: 'Cortar 0.8s aquí',
      segmentClickHint: (label, enabled) =>
        `${label} — Clic para ${enabled ? 'conservar' : 'cortar'}`,
      legendSilence: 'Silencio / pausa',
      legendFiller: 'Posible «emm / err»',
      tapRegionHint: 'Toca una región para activar o conservar',
    },
    audioPanel: {
      title: 'Silencios y pausas',
      summary: (count, sec) => `${count} cortes activos · ${sec}s removidos del montaje`,
      analyzing: 'Analizando...',
      analyze: 'Analizar',
      silenceThreshold: 'Umbral de silencio',
      minPauseDuration: 'Duración mínima de pausa',
      detectHesitationsTitle: 'Detectar vacilaciones acústicas («emm / err»)',
      detectHesitationsDesc: 'Marca ráfagas cortas aisladas con tono estable entre pausas',
      hesitationSensitivity: 'Sensibilidad a vacilaciones',
      detectedSegments: (count) => `Segmentos detectados (${count})`,
      cutAll: 'Cortar todos',
      keepAll: 'Conservar todos',
      emptyState:
        'No se detectaron silencios con el umbral actual. Prueba subir el umbral en dB o reducir la duración mínima.',
      keepSegmentTitle: 'Conservar segmento',
      cutSegmentTitle: 'Cortar segmento',
      deleteMarkerTitle: 'Eliminar marcador',
      nextStep: 'Editar transcripción',
    },
    subtitlesPanel: {
      title: 'Transcripción y subtítulos',
      linesCount: (count) => `${count} líneas`,
      detectedLanguageSuffix: (lang) => ` · Idioma detectado: ${lang}`,
      addLine: 'Añadir línea',
      transcribingBtn: 'Transcribiendo audio...',
      autoTranscribeBtn: 'Transcripción automática',
      stageExtracting: 'Extrayendo pista de audio...',
      stageNoAudio: 'No se encontró contenido de audio para transcribir.',
      stageChunk: (i, total) => `Transcribiendo audio (tramo ${i} de ${total})...`,
      stageTranscribing: 'Transcribiendo y detectando idioma...',
      stageRetryNetwork: (attempt, max) => `Conexión inestable, reintentando (${attempt}/${max})...`,
      stageRetryBusy: (attempt, max) =>
        `Modelo con alta demanda, reintentando (${attempt}/${max})...`,
      stageDone: 'Transcripción completada',
      errorDefault: 'No se pudo completar la transcripción automática.',
      errorUnexpected: 'Error inesperado al transcribir el audio.',
      unknownLanguage: 'Desconocido',
      noSpeechDetected: 'Sin voz detectada',
      detectedLanguageLabel: 'Idioma detectado',
      emptyState:
        'Pulsa «Transcripción automática» para generar los subtítulos del video o usa «Añadir línea».',
      splitCueTitle: 'Dividir bloque en dos',
      deleteCueTitle: 'Eliminar bloque y cortar fragmento de video',
      newSubtitleDefault: 'Nuevo subtítulo',
      nextStep: 'Personalizar estilo',
    },
    stylePanel: {
      title: 'Ubicación, fuente y animación',
      subtitle: 'También puedes arrastrar el texto directo sobre el video',
      entranceAnimation: 'Animación de entrada',
      testBtn: 'Probar',
      animations: {
        none: 'Estático',
        fade: 'Aparición',
        'slide-up': 'Deslizar',
        pop: 'Pop',
        karaoke: 'Karaoke',
        typewriter: 'Máquina',
      },
      canvasPosition: 'Ubicación en lienzo',
      positions: {
        top: 'Superior',
        middle: 'Centro',
        bottom: 'Inferior',
      },
      axisX: 'Eje X',
      axisY: 'Eje Y',
      typography: 'Tipografía',
      fontSize: 'Tamaño de fuente',
      bold: 'Negrita (700)',
      uppercase: 'MAYÚSCULAS',
      textColor: 'Color de texto',
      textColorAria: (hex) => `Color de texto ${hex}`,
      customColorAria: 'Color personalizado',
      highlightColor: 'Color activo (Karaoke)',
      highlightColorAria: (hex) => `Color activo karaoke ${hex}`,
      stroke: 'Contorno / Trazo',
      shadow: 'Sombra',
      bgBox: 'Caja de fondo',
      bgColor: 'Color de caja',
      bgColorAria: (hex) => `Color de caja ${hex}`,
      opacity: 'Opacidad',
      nextStep: 'Aplicar efectos',
    },
    effectsPanel: {
      title: 'Efectos y color de video',
      subtitle: 'Ajustes en tiempo real incrustados al exportar',
      reset: 'Restablecer',
      blurBordersTitle: 'Completar bordes vacíos con desenfoque',
      blurBordersDesc: 'Rellena las franjas laterales o superior/inferior en modo Ajustar',
      active: 'Activo',
      activate: 'Activar',
      presets: {
        original: 'Original',
        highContrast: 'Alto Contraste',
        warmCinema: 'Cine Cálido',
        blackAndWhite: 'Blanco y Negro',
        softPortrait: 'Suave Retrato',
      },
      sliders: {
        brightness: 'Brillo',
        contrast: 'Contraste',
        exposure: 'Niveles / Exposición',
        saturation: 'Saturación',
        vignette: 'Viñeta',
        blur: 'Desenfoque (Blur)',
        warmth: 'Temperatura',
      },
      nextStep: 'Ir a exportar',
    },
    exportPanel: {
      title: 'Exportar video MP4 con subtítulos',
      canvasFormat: 'Formato de lienzo',
      resolution: 'Resolución',
      quality1080p: 'Full HD (1080p)',
      quality720p: 'Rápido (720p)',
      qualityNative: 'Nativa del clip',
      framing: 'Encuadre',
      fit: 'Ajustar',
      fill: 'Rellenar',
      blur: 'Blur',
      blurTitle: 'Completar bordes vacíos con desenfoque',
      preparingRender: 'Preparando motor de renderizado...',
      cancelRender: 'Cancelar renderizado',
      renderAndExport: 'Renderizar y exportar MP4',
      downloadAgain: 'Descargar MP4 de nuevo',
      exportErrorDefault: 'Error al exportar el video.',
      srtTitle: 'Exportar subtítulos (.SRT)',
      srtLines: (count) => `${count} líneas`,
      adjustSrtTiming: 'Ajustar tiempos tras cortes de silencio',
      downloadSrt: 'Descargar .SRT',
      copied: 'Copiado',
      copy: 'Copiar',
      fileSuffix: 'subtitulado',
    },
    exportEngine: {
      allSegmentsCut:
        'Todos los segmentos del video están cortados. Activa al menos un segmento para exportar.',
      canvasInitFailed: 'No se pudo inicializar el lienzo 2D de exportación.',
      videoLoadFailed: 'No se pudo cargar el archivo de video para renderizar.',
      captureUnsupported: 'Tu navegador no soporta captura de lienzo para exportar video.',
      recorderUnsupported: 'Tu navegador no soporta grabación de exportación (MediaRecorder).',
      startingRender: 'Iniciando renderizado...',
      cancelledByUser: 'Exportación cancelada por el usuario.',
      renderingSegment: (i, total) => `Renderizando segmento ${i} de ${total}...`,
      finalizingCapture: 'Finalizando captura de video...',
      noFramesCaptured: 'No se capturaron fotogramas durante la exportación.',
      captureTooLarge:
        'La captura renderizada supera el límite de 500 MB. Selecciona calidad 720p o recorta el clip.',
      preparingMp4: 'Preparando conversión a MP4...',
      mp4ConvertFailed: (detail) => `No se pudo convertir el video a MP4 (${detail}).`,
      uploadingChunk: (i, total) => `Subiendo video (${i}/${total})...`,
      uploadingSingle: 'Subiendo video para MP4...',
      encodingMp4: 'Codificando MP4 universal (H.264)...',
      emptyMp4Server: 'El servidor devolvió un archivo MP4 vacío.',
      mp4Ready: 'MP4 listo para descargar',
    },
    camera: {
      dialogAria: 'Grabar video con cámara',
      title: 'Grabar video',
      switchCamera: 'Cambiar cámara',
      cameraShort: 'Cámara',
      close: 'Cerrar',
      initializing: 'Iniciando cámara...',
      retryAccess: 'Reintentar acceso a cámara',
      stopRecording: (tc) => `Detener grabación (${tc})`,
      startRecording: 'Iniciar grabación',
      errNoMediaDevices: 'Este navegador no permite acceso directo a la cámara.',
      errPermissionDenied:
        'Permiso de cámara o micrófono denegado. Habilita los permisos en tu navegador.',
      errNotFound: 'No se encontró ninguna cámara disponible en este dispositivo.',
      errInitFailed: 'No se pudo iniciar la cámara para grabar.',
      errNoRecorder: 'Este navegador no soporta grabación directa de video (MediaRecorder).',
      errEmptyRecording: 'La grabación resultó vacía. Intenta grabar nuevamente.',
      errStartFailed: 'No se pudo iniciar la grabación de video en este navegador.',
    },
  },

  pt: {
    seo: {
      title: 'CutFlow Studio — Editor de Vídeo e Legendas Online',
      description:
        'Edite vídeos grátis no navegador: remova silêncios e vícios de fala, crie legendas animadas estilo karaokê, aplique efeitos e exporte em MP4 ou SRT sem cadastro.',
      ogImageAlt: 'CutFlow Studio — Editor de vídeo, corte de silêncios e legendas animadas',
    },
    languageSwitcher: {
      ariaLabel: 'Alterar idioma da interface',
      menuLabel: 'Idioma do aplicativo',
    },
    topBar: {
      cuts: (n) => `${n} cortes`,
      recordVideo: 'Gravar vídeo',
      recordShort: 'Gravar',
      changeVideo: 'Trocar vídeo',
      videoShort: 'Vídeo',
      export: 'Exportar',
      uploadVideo: 'Enviar vídeo',
      uploadShort: 'Enviar',
    },
    pwa: {
      installApp: 'Instalar App',
      installShort: 'Instalar',
      iosModalTitle: 'Instalar na tela inicial',
      close: 'Fechar',
      iosStep1Prefix: '1. Toque no botão ',
      iosStep1Bold: 'Compartilhar',
      iosStep1Suffix: ' na barra do navegador.',
      iosStep2Prefix: '2. Selecione ',
      iosStep2Bold: 'Adicionar à Tela de Início',
      iosStep2Suffix: ' para usar o CutFlow como app nativo.',
      understood: 'Entendi',
    },
    upload: {
      eyebrow: 'Estúdio móvel de edição local · Android PWA',
      headline:
        'Corte silêncios, anime legendas e exporte sem limites. Sem cadastro. Grátis para sempre.',
      subheadline:
        'Envie qualquer vídeo do seu dispositivo. Analisamos a forma de onda localmente para detectar pausas e hesitações como «éé» ou «hã», sincronizar legendas animadas e renderizar o resultado com efeitos visuais em qualquer proporção.',
      feature1Title: 'Cortes por sinal',
      feature1Desc: 'Detecção local em decibéis para pausas longas e hesitações vocais.',
      feature2Title: 'SRT e Karaokê',
      feature2Desc: 'Transcrição automática com detecção de idioma e legendas animadas.',
      feature3Title: 'Cor e efeitos',
      feature3Desc: 'Brilho, contraste, exposição, saturação, vinheta e desfoque ao vivo.',
      feature4Title: 'Qualquer formato',
      feature4Desc: 'MP4, WebM, MOV ou MKV para telas 9:16, 16:9, 1:1, 4:5, 21:9 ou nativo.',
      dropTitle: 'Selecione ou arraste um vídeo',
      dropDesc:
        'Toda a análise de áudio e renderização acontece no seu navegador sem enviar arquivos para a nuvem.',
      chooseFile: 'Escolher vídeo do dispositivo',
      recordCamera: 'Gravar vídeo com câmera',
      supportedFormats: 'MP4 · WebM · MOV · MKV · M4V · OGV · Máx. 500 MB',
    },
    tabs: {
      desktopNavAria: 'Ferramentas de edição',
      mobileNavAria: 'Navegação móvel',
      audio: 'Áudio',
      subtitles: 'Transcrição',
      style: 'Estilo',
      effects: 'Efeitos',
      export: 'Exportar',
    },
    footer: {
      developedBy: 'Desenvolvimento: Julian Mojico ·',
    },
    offline: {
      status: 'Modo offline · Edição local ativa',
    },
    importSnack: {
      message: (resolution, ratio) =>
        `Vídeo importado em resolução ${resolution} · proporção ${ratio} detectada`,
      closeAria: 'Fechar notificação',
    },
    errors: {
      fileTooLarge: (size) => `O vídeo tem ${size} e ultrapassa o limite máximo de 500 MB.`,
      decodeVideoFailed: 'O navegador não conseguiu decodificar este arquivo de vídeo.',
      loadVideoFailed: 'Não foi possível carregar o vídeo selecionado.',
      previewDecodeFailed: 'O navegador não conseguiu decodificar a imagem deste vídeo.',
      audioExtractFailed:
        'Não foi possível extrair uma faixa de áudio legível deste vídeo no navegador.',
      offlineAudioUnsupported: 'Seu navegador não suporta processamento de áudio offline.',
    },
    cuts: {
      silencePause: (sec) => `Silêncio / Pausa (${sec}s)`,
      finalPause: (sec) => `Pausa final (${sec}s)`,
      possibleFiller: (sec) => `Possível hesitação "éé / hã" (${sec}s)`,
      manualCut: (sec) => `Corte manual (${sec}s)`,
      deletedBlockWithText: (preview, truncated) =>
        `Bloco removido: «${preview}${truncated ? '…' : ''}»`,
      deletedBlock: (sec) => `Bloco removido (${sec}s)`,
    },
    preview: {
      fit: 'Ajustar',
      fill: 'Preencher',
      switchToFill: 'Mudar para Preencher',
      switchToFit: 'Mudar para Ajustar',
      blurBorders: 'Bordas blur',
      blurBordersTitle: 'Preencher bordas vazias com desfoque',
      noEffects: 'Sem efeitos',
      compareNoEffectsTitle: 'Comparar vídeo sem efeitos',
      sampleSubtitle: 'Prévia de legenda animada',
      dragSubtitleTitle: 'Arraste para mover a posição da legenda',
      rewind2s: 'Voltar 2 segundos',
      pause: 'Pausar',
      play: 'Reproduzir',
      forward2s: 'Avançar 2 segundos',
      skippingCuts: 'Pulando cortes',
      uncutVideo: 'Vídeo sem cortes',
    },
    timeline: {
      title: 'Linha do tempo de áudio',
      analyzing: 'Analisando sinal...',
      cutHere: 'Cortar 0.8s aqui',
      segmentClickHint: (label, enabled) =>
        `${label} — Clique para ${enabled ? 'manter' : 'cortar'}`,
      legendSilence: 'Silêncio / pausa',
      legendFiller: 'Possível «éé / hã»',
      tapRegionHint: 'Toque em uma região para cortar ou manter',
    },
    audioPanel: {
      title: 'Silêncios e pausas',
      summary: (count, sec) => `${count} cortes ativos · ${sec}s removidos da edição`,
      analyzing: 'Analisando...',
      analyze: 'Analisar',
      silenceThreshold: 'Limite de silêncio',
      minPauseDuration: 'Duração mínima da pausa',
      detectHesitationsTitle: 'Detectar hesitações acústicas («éé / hã»)',
      detectHesitationsDesc: 'Marca sons curtos isolados com tom estável entre pausas',
      hesitationSensitivity: 'Sensibilidade a hesitações',
      detectedSegments: (count) => `Segmentos detectados (${count})`,
      cutAll: 'Cortar todos',
      keepAll: 'Manter todos',
      emptyState:
        'Nenhum silêncio detectado com o limite atual. Tente aumentar o limite em dB ou reduzir a duração mínima.',
      keepSegmentTitle: 'Manter segmento',
      cutSegmentTitle: 'Cortar segmento',
      deleteMarkerTitle: 'Excluir marcador',
      nextStep: 'Editar transcrição',
    },
    subtitlesPanel: {
      title: 'Transcrição e legendas',
      linesCount: (count) => `${count} linhas`,
      detectedLanguageSuffix: (lang) => ` · Idioma detectado: ${lang}`,
      addLine: 'Adicionar linha',
      transcribingBtn: 'Transcrevendo áudio...',
      autoTranscribeBtn: 'Transcrição automática',
      stageExtracting: 'Extraindo faixa de áudio...',
      stageNoAudio: 'Nenhum conteúdo de áudio encontrado para transcrever.',
      stageChunk: (i, total) => `Transcrevendo áudio (trecho ${i} de ${total})...`,
      stageTranscribing: 'Transcrevendo e detectando idioma...',
      stageRetryNetwork: (attempt, max) => `Conexão instável, tentando novamente (${attempt}/${max})...`,
      stageRetryBusy: (attempt, max) =>
        `Modelo com alta demanda, tentando novamente (${attempt}/${max})...`,
      stageDone: 'Transcrição concluída',
      errorDefault: 'Não foi possível concluir a transcrição automática.',
      errorUnexpected: 'Erro inesperado ao transcrever o áudio.',
      unknownLanguage: 'Desconhecido',
      noSpeechDetected: 'Nenhuma voz detectada',
      detectedLanguageLabel: 'Idioma detectado',
      emptyState:
        'Clique em «Transcrição automática» para gerar legendas do vídeo ou use «Adicionar linha».',
      splitCueTitle: 'Dividir bloco em dois',
      deleteCueTitle: 'Excluir bloco e cortar trecho do vídeo',
      newSubtitleDefault: 'Nova legenda',
      nextStep: 'Personalizar estilo',
    },
    stylePanel: {
      title: 'Posição, fonte e animação',
      subtitle: 'Você também pode arrastar o texto diretamente sobre o vídeo',
      entranceAnimation: 'Animação de entrada',
      testBtn: 'Testar',
      animations: {
        none: 'Estático',
        fade: 'Surgimento',
        'slide-up': 'Deslizar',
        pop: 'Pop',
        karaoke: 'Karaokê',
        typewriter: 'Máquina',
      },
      canvasPosition: 'Posição na tela',
      positions: {
        top: 'Superior',
        middle: 'Centro',
        bottom: 'Inferior',
      },
      axisX: 'Eixo X',
      axisY: 'Eixo Y',
      typography: 'Tipografia',
      fontSize: 'Tamanho da fonte',
      bold: 'Negrito (700)',
      uppercase: 'MAIÚSCULAS',
      textColor: 'Cor do texto',
      textColorAria: (hex) => `Cor do texto ${hex}`,
      customColorAria: 'Cor personalizada',
      highlightColor: 'Cor ativa (Karaokê)',
      highlightColorAria: (hex) => `Cor ativa karaokê ${hex}`,
      stroke: 'Contorno / Traço',
      shadow: 'Sombra',
      bgBox: 'Caixa de fundo',
      bgColor: 'Cor da caixa',
      bgColorAria: (hex) => `Cor da caixa ${hex}`,
      opacity: 'Opacidade',
      nextStep: 'Aplicar efeitos',
    },
    effectsPanel: {
      title: 'Efeitos e cor do vídeo',
      subtitle: 'Ajustes em tempo real incorporados ao exportar',
      reset: 'Redefinir',
      blurBordersTitle: 'Preencher bordas vazias com desfoque',
      blurBordersDesc: 'Preenche faixas laterais ou superior/inferior no modo Ajustar',
      active: 'Ativo',
      activate: 'Ativar',
      presets: {
        original: 'Original',
        highContrast: 'Alto Contraste',
        warmCinema: 'Cinema Quente',
        blackAndWhite: 'Preto e Branco',
        softPortrait: 'Retrato Suave',
      },
      sliders: {
        brightness: 'Brilho',
        contrast: 'Contraste',
        exposure: 'Níveis / Exposição',
        saturation: 'Saturação',
        vignette: 'Vinheta',
        blur: 'Desfoque (Blur)',
        warmth: 'Temperatura',
      },
      nextStep: 'Ir para exportar',
    },
    exportPanel: {
      title: 'Exportar vídeo MP4 com legendas',
      canvasFormat: 'Formato da tela',
      resolution: 'Resolução',
      quality1080p: 'Full HD (1080p)',
      quality720p: 'Rápido (720p)',
      qualityNative: 'Nativa do clipe',
      framing: 'Enquadramento',
      fit: 'Ajustar',
      fill: 'Preencher',
      blur: 'Blur',
      blurTitle: 'Preencher bordas vazias com desfoque',
      preparingRender: 'Preparando motor de renderização...',
      cancelRender: 'Cancelar renderização',
      renderAndExport: 'Renderizar e exportar MP4',
      downloadAgain: 'Baixar MP4 novamente',
      exportErrorDefault: 'Erro ao exportar o vídeo.',
      srtTitle: 'Exportar legendas (.SRT)',
      srtLines: (count) => `${count} linhas`,
      adjustSrtTiming: 'Ajustar tempos após cortes de silêncio',
      downloadSrt: 'Baixar .SRT',
      copied: 'Copiado',
      copy: 'Copiar',
      fileSuffix: 'legendado',
    },
    exportEngine: {
      allSegmentsCut:
        'Todos os segmentos do vídeo estão cortados. Ative ao menos um segmento para exportar.',
      canvasInitFailed: 'Não foi possível inicializar o canvas 2D de exportação.',
      videoLoadFailed: 'Não foi possível carregar o arquivo de vídeo para renderizar.',
      captureUnsupported: 'Seu navegador não suporta captura de canvas para exportar vídeo.',
      recorderUnsupported: 'Seu navegador não suporta gravação de exportação (MediaRecorder).',
      startingRender: 'Iniciando renderização...',
      cancelledByUser: 'Exportação cancelada pelo usuário.',
      renderingSegment: (i, total) => `Renderizando segmento ${i} de ${total}...`,
      finalizingCapture: 'Finalizando captura de vídeo...',
      noFramesCaptured: 'Nenhum quadro foi capturado durante a exportação.',
      captureTooLarge:
        'A captura renderizada excede o limite de 500 MB. Selecione 720p ou corte o clipe.',
      preparingMp4: 'Preparando conversão para MP4...',
      mp4ConvertFailed: (detail) => `Não foi possível converter o vídeo para MP4 (${detail}).`,
      uploadingChunk: (i, total) => `Enviando vídeo (${i}/${total})...`,
      uploadingSingle: 'Enviando vídeo para MP4...',
      encodingMp4: 'Codificando MP4 universal (H.264)...',
      emptyMp4Server: 'O servidor retornou um arquivo MP4 vazio.',
      mp4Ready: 'MP4 pronto para baixar',
    },
    camera: {
      dialogAria: 'Gravar vídeo com câmera',
      title: 'Gravar vídeo',
      switchCamera: 'Trocar câmera',
      cameraShort: 'Câmera',
      close: 'Fechar',
      initializing: 'Iniciando câmera...',
      retryAccess: 'Tentar acessar câmera novamente',
      stopRecording: (tc) => `Parar gravação (${tc})`,
      startRecording: 'Iniciar gravação',
      errNoMediaDevices: 'Este navegador não permite acesso direto à câmera.',
      errPermissionDenied:
        'Permissão de câmera ou microfone negada. Ative as permissões no seu navegador.',
      errNotFound: 'Nenhuma câmera disponível foi encontrada neste dispositivo.',
      errInitFailed: 'Não foi possível iniciar a câmera para gravar.',
      errNoRecorder: 'Este navegador não suporta gravação direta de vídeo (MediaRecorder).',
      errEmptyRecording: 'A gravação ficou vazia. Tente gravar novamente.',
      errStartFailed: 'Não foi possível iniciar a gravação de vídeo neste navegador.',
    },
  },

  en: {
    seo: {
      title: 'CutFlow Studio — Online Video & Subtitle Editor',
      description:
        'Edit videos free in your browser: auto-cut silences and filler words, create animated karaoke subtitles, apply live effects, and export MP4 or SRT with no signup.',
      ogImageAlt: 'CutFlow Studio — Online video editor, silence cutter, and animated subtitles',
    },
    languageSwitcher: {
      ariaLabel: 'Change interface language',
      menuLabel: 'Application language',
    },
    topBar: {
      cuts: (n) => `${n} cuts`,
      recordVideo: 'Record video',
      recordShort: 'Record',
      changeVideo: 'Change video',
      videoShort: 'Video',
      export: 'Export',
      uploadVideo: 'Upload video',
      uploadShort: 'Upload',
    },
    pwa: {
      installApp: 'Install App',
      installShort: 'Install',
      iosModalTitle: 'Install to Home Screen',
      close: 'Close',
      iosStep1Prefix: '1. Tap the ',
      iosStep1Bold: 'Share',
      iosStep1Suffix: ' button in your browser bar.',
      iosStep2Prefix: '2. Select ',
      iosStep2Bold: 'Add to Home Screen',
      iosStep2Suffix: ' to use CutFlow like a native app.',
      understood: 'Got it',
    },
    upload: {
      eyebrow: 'Local mobile editing studio · Android PWA',
      headline:
        'Remove silences, animate subtitles, and export without limits. No signup. Free forever.',
      subheadline:
        'Upload any video from your device. We analyze the waveform locally to detect pauses and filler hesitations like "um" or "uh", sync animated subtitles, and render with visual effects in any aspect ratio.',
      feature1Title: 'Signal-based cuts',
      feature1Desc: 'Local decibel detection for long pauses and vocal hesitations.',
      feature2Title: 'SRT & Karaoke',
      feature2Desc: 'Automatic transcription with language detection and animated captions.',
      feature3Title: 'Live color grading',
      feature3Desc: 'Real-time brightness, contrast, exposure, saturation, vignette, and blur.',
      feature4Title: 'Any format',
      feature4Desc: 'MP4, WebM, MOV, or MKV into 9:16, 16:9, 1:1, 4:5, 21:9, or native canvases.',
      dropTitle: 'Select or drag a video',
      dropDesc:
        'All audio analysis and rendering run right in your browser without uploading files to the cloud.',
      chooseFile: 'Choose video from device',
      recordCamera: 'Record video with camera',
      supportedFormats: 'MP4 · WebM · MOV · MKV · M4V · OGV · Max. 500 MB',
    },
    tabs: {
      desktopNavAria: 'Editing tools',
      mobileNavAria: 'Mobile navigation',
      audio: 'Audio',
      subtitles: 'Transcription',
      style: 'Style',
      effects: 'Effects',
      export: 'Export',
    },
    footer: {
      developedBy: 'Built by: Julian Mojico ·',
    },
    offline: {
      status: 'Offline mode · Local editing active',
    },
    importSnack: {
      message: (resolution, ratio) =>
        `Video imported at ${resolution} resolution · ${ratio} aspect ratio detected`,
      closeAria: 'Dismiss notification',
    },
    errors: {
      fileTooLarge: (size) => `The video is ${size} and exceeds the 500 MB maximum limit.`,
      decodeVideoFailed: 'Your browser could not decode this video file.',
      loadVideoFailed: 'Could not load the selected video.',
      previewDecodeFailed: 'Your browser could not decode the image frames of this video.',
      audioExtractFailed: 'Could not extract a readable audio track from this video in the browser.',
      offlineAudioUnsupported: 'Your browser does not support offline audio processing.',
    },
    cuts: {
      silencePause: (sec) => `Silence / Pause (${sec}s)`,
      finalPause: (sec) => `Ending pause (${sec}s)`,
      possibleFiller: (sec) => `Possible filler "um / uh" (${sec}s)`,
      manualCut: (sec) => `Manual cut (${sec}s)`,
      deletedBlockWithText: (preview, truncated) =>
        `Deleted block: "${preview}${truncated ? '…' : ''}"`,
      deletedBlock: (sec) => `Deleted block (${sec}s)`,
    },
    preview: {
      fit: 'Fit',
      fill: 'Fill',
      switchToFill: 'Switch to Fill',
      switchToFit: 'Switch to Fit',
      blurBorders: 'Blur borders',
      blurBordersTitle: 'Fill empty borders with blurred video',
      noEffects: 'No effects',
      compareNoEffectsTitle: 'Compare video without effects',
      sampleSubtitle: 'Animated subtitle preview',
      dragSubtitleTitle: 'Drag to move subtitle position',
      rewind2s: 'Rewind 2 seconds',
      pause: 'Pause',
      play: 'Play',
      forward2s: 'Forward 2 seconds',
      skippingCuts: 'Skipping cuts',
      uncutVideo: 'Uncut video',
    },
    timeline: {
      title: 'Audio timeline',
      analyzing: 'Analyzing signal...',
      cutHere: 'Cut 0.8s here',
      segmentClickHint: (label, enabled) => `${label} — Click to ${enabled ? 'keep' : 'cut'}`,
      legendSilence: 'Silence / pause',
      legendFiller: 'Possible "um / uh"',
      tapRegionHint: 'Tap a region to cut or keep',
    },
    audioPanel: {
      title: 'Silences & pauses',
      summary: (count, sec) => `${count} active cuts · ${sec}s removed from edit`,
      analyzing: 'Analyzing...',
      analyze: 'Analyze',
      silenceThreshold: 'Silence threshold',
      minPauseDuration: 'Minimum pause duration',
      detectHesitationsTitle: 'Detect vocal hesitations ("um / uh")',
      detectHesitationsDesc: 'Flags short isolated bursts with steady tone between pauses',
      hesitationSensitivity: 'Hesitation sensitivity',
      detectedSegments: (count) => `Detected segments (${count})`,
      cutAll: 'Cut all',
      keepAll: 'Keep all',
      emptyState:
        'No silences detected at the current threshold. Try raising the dB threshold or lowering minimum duration.',
      keepSegmentTitle: 'Keep segment',
      cutSegmentTitle: 'Cut segment',
      deleteMarkerTitle: 'Delete marker',
      nextStep: 'Edit transcription',
    },
    subtitlesPanel: {
      title: 'Transcription & subtitles',
      linesCount: (count) => `${count} lines`,
      detectedLanguageSuffix: (lang) => ` · Detected language: ${lang}`,
      addLine: 'Add line',
      transcribingBtn: 'Transcribing audio...',
      autoTranscribeBtn: 'Auto-transcribe',
      stageExtracting: 'Extracting audio track...',
      stageNoAudio: 'No audio content found to transcribe.',
      stageChunk: (i, total) => `Transcribing audio (part ${i} of ${total})...`,
      stageTranscribing: 'Transcribing and detecting language...',
      stageRetryNetwork: (attempt, max) => `Unstable connection, retrying (${attempt}/${max})...`,
      stageRetryBusy: (attempt, max) => `Model under high demand, retrying (${attempt}/${max})...`,
      stageDone: 'Transcription complete',
      errorDefault: 'Could not complete automatic transcription.',
      errorUnexpected: 'Unexpected error while transcribing audio.',
      unknownLanguage: 'Unknown',
      noSpeechDetected: 'No speech detected',
      detectedLanguageLabel: 'Detected language',
      emptyState:
        'Click "Auto-transcribe" to generate video captions or use "Add line".',
      splitCueTitle: 'Split block in two',
      deleteCueTitle: 'Delete block and cut video segment',
      newSubtitleDefault: 'New subtitle',
      nextStep: 'Customize style',
    },
    stylePanel: {
      title: 'Position, font & animation',
      subtitle: 'You can also drag the text directly on the video',
      entranceAnimation: 'Entrance animation',
      testBtn: 'Preview',
      animations: {
        none: 'Static',
        fade: 'Fade',
        'slide-up': 'Slide up',
        pop: 'Pop',
        karaoke: 'Karaoke',
        typewriter: 'Typewriter',
      },
      canvasPosition: 'Canvas position',
      positions: {
        top: 'Top',
        middle: 'Center',
        bottom: 'Bottom',
      },
      axisX: 'X Axis',
      axisY: 'Y Axis',
      typography: 'Typography',
      fontSize: 'Font size',
      bold: 'Bold (700)',
      uppercase: 'UPPERCASE',
      textColor: 'Text color',
      textColorAria: (hex) => `Text color ${hex}`,
      customColorAria: 'Custom color',
      highlightColor: 'Active color (Karaoke)',
      highlightColorAria: (hex) => `Active karaoke color ${hex}`,
      stroke: 'Outline / Stroke',
      shadow: 'Shadow',
      bgBox: 'Background box',
      bgColor: 'Box color',
      bgColorAria: (hex) => `Box color ${hex}`,
      opacity: 'Opacity',
      nextStep: 'Apply effects',
    },
    effectsPanel: {
      title: 'Video effects & color',
      subtitle: 'Real-time adjustments burned in on export',
      reset: 'Reset',
      blurBordersTitle: 'Fill empty borders with blur',
      blurBordersDesc: 'Fills side or top/bottom bars when using Fit mode',
      active: 'Active',
      activate: 'Enable',
      presets: {
        original: 'Original',
        highContrast: 'High Contrast',
        warmCinema: 'Warm Cinema',
        blackAndWhite: 'Black & White',
        softPortrait: 'Soft Portrait',
      },
      sliders: {
        brightness: 'Brightness',
        contrast: 'Contrast',
        exposure: 'Levels / Exposure',
        saturation: 'Saturation',
        vignette: 'Vignette',
        blur: 'Blur',
        warmth: 'Temperature',
      },
      nextStep: 'Go to export',
    },
    exportPanel: {
      title: 'Export MP4 video with subtitles',
      canvasFormat: 'Canvas aspect ratio',
      resolution: 'Resolution',
      quality1080p: 'Full HD (1080p)',
      quality720p: 'Fast (720p)',
      qualityNative: 'Clip native',
      framing: 'Framing',
      fit: 'Fit',
      fill: 'Fill',
      blur: 'Blur',
      blurTitle: 'Fill empty borders with blur',
      preparingRender: 'Preparing rendering engine...',
      cancelRender: 'Cancel rendering',
      renderAndExport: 'Render & export MP4',
      downloadAgain: 'Download MP4 again',
      exportErrorDefault: 'Error exporting the video.',
      srtTitle: 'Export subtitles (.SRT)',
      srtLines: (count) => `${count} lines`,
      adjustSrtTiming: 'Adjust timestamps after silence cuts',
      downloadSrt: 'Download .SRT',
      copied: 'Copied',
      copy: 'Copy',
      fileSuffix: 'subtitled',
    },
    exportEngine: {
      allSegmentsCut: 'All video segments are cut. Enable at least one segment to export.',
      canvasInitFailed: 'Could not initialize the 2D export canvas.',
      videoLoadFailed: 'Could not load the video file for rendering.',
      captureUnsupported: 'Your browser does not support canvas capture for video export.',
      recorderUnsupported: 'Your browser does not support export recording (MediaRecorder).',
      startingRender: 'Starting render...',
      cancelledByUser: 'Export cancelled by user.',
      renderingSegment: (i, total) => `Rendering segment ${i} of ${total}...`,
      finalizingCapture: 'Finalizing video capture...',
      noFramesCaptured: 'No video frames were captured during export.',
      captureTooLarge:
        'Rendered capture exceeds the 500 MB limit. Select 720p quality or trim the clip.',
      preparingMp4: 'Preparing MP4 conversion...',
      mp4ConvertFailed: (detail) => `Could not convert video to MP4 (${detail}).`,
      uploadingChunk: (i, total) => `Uploading video (${i}/${total})...`,
      uploadingSingle: 'Uploading video for MP4...',
      encodingMp4: 'Encoding universal MP4 (H.264)...',
      emptyMp4Server: 'The server returned an empty MP4 file.',
      mp4Ready: 'MP4 ready to download',
    },
    camera: {
      dialogAria: 'Record video with camera',
      title: 'Record video',
      switchCamera: 'Switch camera',
      cameraShort: 'Camera',
      close: 'Close',
      initializing: 'Starting camera...',
      retryAccess: 'Retry camera access',
      stopRecording: (tc) => `Stop recording (${tc})`,
      startRecording: 'Start recording',
      errNoMediaDevices: 'This browser does not allow direct camera access.',
      errPermissionDenied:
        'Camera or microphone permission denied. Enable permissions in your browser.',
      errNotFound: 'No available camera was found on this device.',
      errInitFailed: 'Could not start the camera for recording.',
      errNoRecorder: 'This browser does not support direct video recording (MediaRecorder).',
      errEmptyRecording: 'The recording was empty. Please try recording again.',
      errStartFailed: 'Could not start video recording in this browser.',
    },
  },
};
