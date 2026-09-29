import { useEffect, useRef, useState } from "react";

interface AudioTrack {
  id: string;
  name: string;
  file: Blob;
  addedAt: number;
}

const DATABASE_NAME = "qqorvex-focus-audio";
const STORE_NAME = "tracks";
const SELECTED_TRACK_KEY = "qqorvex:focus-audio:selected-track";
let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Este navegador não oferece armazenamento local de áudio."));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Não foi possível abrir sua biblioteca de áudio."));
    request.onblocked = () => reject(new Error("Feche outra aba do Qqorvex para atualizar a biblioteca de áudio."));
  });
  return databasePromise;
}

async function listTracks(): Promise<AudioTrack[]> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result as AudioTrack[]).sort((a, b) => a.addedAt - b.addedAt));
    request.onerror = () => reject(request.error ?? new Error("Não foi possível carregar as faixas."));
  });
}

async function saveTrack(track: AudioTrack): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(track);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Não foi possível guardar este arquivo."));
    transaction.onabort = () => reject(transaction.error ?? new Error("O armazenamento local está cheio ou indisponível."));
  });
}

async function removeTrack(id: string): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Não foi possível remover esta faixa."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Não foi possível remover esta faixa."));
  });
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function PlayIcon({ playing }: { playing: boolean }) {
  return playing ? (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M7 5.5A1.5 1.5 0 0 1 8.5 4h1A1.5 1.5 0 0 1 11 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-1A1.5 1.5 0 0 1 7 18.5v-13Zm6 0A1.5 1.5 0 0 1 14.5 4h1A1.5 1.5 0 0 1 17 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5v-13Z" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M8 5.8c0-1.17 1.28-1.9 2.28-1.3l9.1 5.45a2.38 2.38 0 0 1 0 4.1l-9.1 5.45A1.52 1.52 0 0 1 8 18.2V5.8Z" /></svg>
  );
}

function SkipIcon({ backward = false }: { backward?: boolean }) {
  return <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 ${backward ? "rotate-180" : ""}`} fill="currentColor" aria-hidden="true"><path d="M5 5.8c0-1.17 1.28-1.9 2.28-1.3l9.1 5.45a2.38 2.38 0 0 1 0 4.1l-9.1 5.45A1.52 1.52 0 0 1 5 18.2V5.8Zm13 0a1 1 0 0 1 2 0v12.4a1 1 0 1 1-2 0V5.8Z" /></svg>;
}

export function FocusAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const loadedTrackIdRef = useRef<string | null>(null);
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const selectedTrack = tracks.find((track) => track.id === selectedTrackId) ?? null;

  function releaseCurrentSource() {
    const audio = audioRef.current;
    audio?.pause();
    if (audio) audio.removeAttribute("src");
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    loadedTrackIdRef.current = null;
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }

  function setTrackSource(track: AudioTrack, play: boolean) {
    const audio = audioRef.current;
    if (!audio) return;
    if (loadedTrackIdRef.current !== track.id) {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = URL.createObjectURL(track.file);
      loadedTrackIdRef.current = track.id;
      audio.src = objectUrlRef.current;
      audio.load();
      setCurrentTime(0);
      setDuration(0);
    }
    setSelectedTrackId(track.id);
    setError(null);
    if (play) void audio.play().catch(() => setError("Não foi possível reproduzir este formato de áudio neste dispositivo."));
  }

  useEffect(() => {
    let cancelled = false;
    void listTracks().then((savedTracks) => {
      if (cancelled) return;
      setTracks(savedTracks);
      const savedId = window.localStorage.getItem(SELECTED_TRACK_KEY);
      if (savedId && savedTracks.some((track) => track.id === savedId)) setSelectedTrackId(savedId);
    }).catch((cause: unknown) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : "Não foi possível acessar a biblioteca de áudio.");
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (selectedTrack && loadedTrackIdRef.current !== selectedTrack.id) setTrackSource(selectedTrack, false);
    if (!selectedTrack && loadedTrackIdRef.current) releaseCurrentSource();
    try {
      if (selectedTrackId) window.localStorage.setItem(SELECTED_TRACK_KEY, selectedTrackId);
      else window.localStorage.removeItem(SELECTED_TRACK_KEY);
    } catch {
      // A faixa continua selecionada nesta sessão se a persistência de preferências estiver bloqueada.
    }
  }, [selectedTrack, selectedTrackId]);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);
  useEffect(() => () => { if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); }, []);

  async function handleFilesSelected(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    let firstAdded: AudioTrack | null = null;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("audio/")) {
        setError(`${file.name} não parece ser um arquivo de áudio compatível.`);
        continue;
      }
      const track: AudioTrack = {
        id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name.replace(/\.[^.]+$/, "") || file.name,
        file,
        addedAt: Date.now(),
      };
      try {
        await saveTrack(track);
        setTracks((current) => [...current, track]);
        firstAdded ??= track;
      } catch {
        setError("Não foi possível guardar o áudio. Verifique o espaço disponível neste dispositivo.");
        break;
      }
    }
    if (firstAdded && !selectedTrackId) setSelectedTrackId(firstAdded.id);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleRemoveTrack(track: AudioTrack) {
    try {
      await removeTrack(track.id);
      if (loadedTrackIdRef.current === track.id) releaseCurrentSource();
      setTracks((current) => current.filter((item) => item.id !== track.id));
      if (selectedTrackId === track.id) setSelectedTrackId(null);
      setError(null);
    } catch {
      setError("Não foi possível remover esta faixa do dispositivo.");
    }
  }

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); return; }
    const track = selectedTrack ?? tracks[0];
    if (track) setTrackSource(track, true);
    else fileInputRef.current?.click();
  }

  function playAdjacentTrack(direction: -1 | 1) {
    if (!tracks.length) return;
    const index = tracks.findIndex((track) => track.id === selectedTrackId);
    const nextIndex = index < 0 ? 0 : (index + direction + tracks.length) % tracks.length;
    setTrackSource(tracks[nextIndex]!, true);
  }

  function handleTrackEnded() {
    const index = tracks.findIndex((track) => track.id === selectedTrackId);
    if (index >= 0 && index < tracks.length - 1) setTrackSource(tracks[index + 1]!, true);
    else { setIsPlaying(false); setCurrentTime(0); if (audioRef.current) audioRef.current.currentTime = 0; }
  }

  return (
    <section className="w-full min-w-0 border-t border-line pt-3" aria-labelledby="focus-audio-title">
      <audio ref={audioRef} className="hidden" preload="metadata" onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)} onEnded={handleTrackEnded} onError={() => setError("Este arquivo não pôde ser reproduzido. Tente MP3, M4A, WAV ou OGG.")} />

      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gold-soft text-gold-fg" aria-hidden="true"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none"><path d="M9 18V5l11-2v13" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /><circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.8" /><circle cx="17" cy="16" r="3" stroke="currentColor" strokeWidth="1.8" /></svg></span>
        <div className="min-w-0 flex-1"><h2 id="focus-audio-title" className="text-sm font-semibold text-fg">Trilha do foco</h2><p className="text-[10px] text-fg-3">Áudio neste dispositivo</p></div>
        {tracks.length > 0 && <button type="button" onClick={() => setShowLibrary((shown) => !shown)} className="shrink-0 rounded-md px-2 py-1.5 text-[10px] text-fg-3 hover:bg-surface hover:text-fg" aria-expanded={showLibrary}>{tracks.length} {tracks.length === 1 ? "faixa" : "faixas"}</button>}
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="shrink-0 rounded-md border border-line px-2 py-1.5 text-[10px] font-medium text-gold-fg hover:border-gold-line disabled:opacity-60" aria-label="Adicionar arquivos de áudio">＋ Adicionar</button>
      </div>

      <div className="min-w-0 rounded-lg border border-line-soft bg-canvas/40 mt-2.5 rounded-xl px-2.5 py-2">
        {selectedTrack ? (
          <>
            <div className="flex min-w-0 items-center gap-1.5">
              <button type="button" onClick={togglePlayback} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold text-vex-obsidian" aria-label={isPlaying ? "Pausar" : "Reproduzir"}><PlayIcon playing={isPlaying} /></button>
              <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold text-fg" title={selectedTrack.name}>{selectedTrack.name}</p><p className="text-[9px] text-fg-3">{isPlaying ? "Tocando" : "Pausado"}</p></div>
              <button type="button" onClick={() => playAdjacentTrack(-1)} disabled={tracks.length < 2} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-fg-3 hover:bg-surface hover:text-fg disabled:opacity-30" aria-label="Faixa anterior"><SkipIcon backward /></button>
              <button type="button" onClick={() => playAdjacentTrack(1)} disabled={tracks.length < 2} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-fg-3 hover:bg-surface hover:text-fg disabled:opacity-30" aria-label="Próxima faixa"><SkipIcon /></button>
              <button type="button" onClick={() => setShowVolume((shown) => !shown)} className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${showVolume ? "text-gold-fg" : "text-fg-3"}`} aria-label="Ajustar volume" aria-expanded={showVolume}><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Zm4 4a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" /></svg></button>
            </div>
            <div className="ml-9 mt-1 flex items-center gap-1.5 font-mono text-[9px] tabular-nums text-fg-3"><span>{formatTime(currentTime)}</span><input type="range" min={0} max={duration || 0} step={0.1} value={Math.min(currentTime, duration || 0)} onChange={(event) => { const time = Number(event.target.value); if (audioRef.current) audioRef.current.currentTime = time; setCurrentTime(time); }} disabled={!duration} aria-label="Posição da reprodução" className="h-1 min-w-0 flex-1 cursor-pointer accent-[#73d7e4] disabled:cursor-default" /><span>{formatTime(duration)}</span></div>
            {showVolume && <div className="mt-2 flex items-center justify-end gap-2 border-t border-line/70 pt-2"><span className="text-[10px] text-fg-3">Volume</span><input type="range" min={0} max={1} step={0.05} value={volume} onChange={(event) => setVolume(Number(event.target.value))} aria-label="Volume" className="h-1 w-24 cursor-pointer accent-[#73d7e4]" /><span className="w-7 text-right font-mono text-[9px] tabular-nums text-fg-3">{Math.round(volume * 100)}%</span></div>}
          </>
        ) : tracks.length ? (
          <button type="button" onClick={() => setTrackSource(tracks[0]!, false)} className="flex min-h-8 w-full items-center justify-between gap-2 text-left text-[11px] text-fg-3"><span>Nenhuma faixa selecionada</span><span className="text-gold-fg">Selecionar →</span></button>
        ) : (
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="flex min-h-8 w-full items-center justify-between gap-2 text-left text-[11px] text-fg-3 disabled:opacity-60"><span>{isLoading ? "Carregando biblioteca…" : "Nenhuma música adicionada"}</span><span className="text-gold-fg">Adicionar áudio →</span></button>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="audio/*" multiple className="hidden" aria-label="Selecionar arquivos de áudio" onChange={(event) => void handleFilesSelected(event.currentTarget.files)} />
      {showLibrary && tracks.length > 0 && <ul className="mt-2 max-h-28 space-y-0.5 overflow-y-auto rounded-lg border border-line p-1">{tracks.map((track, index) => { const active = track.id === selectedTrackId; return <li key={track.id} className={`flex min-w-0 items-center gap-2 rounded-md px-2 py-1 ${active ? "bg-gold-soft/60" : "hover:bg-vex-graphite/70"}`}><button type="button" onClick={() => setTrackSource(track, true)} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-current={active ? "true" : undefined}><span className="w-4 shrink-0 text-center font-mono text-[9px] text-fg-3">{active && isPlaying ? "♪" : index + 1}</span><span className={`truncate text-[10px] ${active ? "font-semibold text-fg" : "text-fg-2"}`} title={track.name}>{track.name}</span></button><button type="button" onClick={() => void handleRemoveTrack(track)} className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-fg-3 hover:bg-error/10 hover:text-danger" aria-label={`Remover ${track.name}`}>×</button></li>; })}</ul>}
      {error && <p className="mt-1.5 text-[10px] leading-relaxed text-danger" role="alert">{error}</p>}
      <p className="mt-1.5 text-[9px] text-fg-3">Áudios salvos apenas neste dispositivo.</p>
    </section>
  );
}
