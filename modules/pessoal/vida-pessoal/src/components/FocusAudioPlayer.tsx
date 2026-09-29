import { useEffect, useRef, useState } from "react";
import { MusicNotesIcon, PauseIcon, PlayIcon, PlusIcon, SkipBackIcon, SkipForwardIcon, SpeakerHighIcon, XIcon } from "@phosphor-icons/react";
import { IconButton, cx } from "@qqorvex/ui";

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
    <section className="w-full min-w-0" aria-labelledby="focus-audio-title">
      <audio ref={audioRef} className="hidden" preload="metadata" onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)} onEnded={handleTrackEnded} onError={() => setError("Este arquivo não pôde ser reproduzido. Tente MP3, M4A, WAV ou OGG.")} />

      <div className="flex min-w-0 items-center gap-2">
        <MusicNotesIcon size={15} className="shrink-0 text-fg-3" aria-hidden="true" />
        <h3 id="focus-audio-title" className="min-w-0 flex-1 text-xs font-semibold text-fg-2">Trilha do foco</h3>
        {tracks.length > 0 && (
          <button type="button" onClick={() => setShowLibrary((shown) => !shown)} className="shrink-0 rounded-md px-1.5 py-1 text-xs text-fg-3 hover:bg-hover hover:text-fg" aria-expanded={showLibrary}>
            {tracks.length} {tracks.length === 1 ? "faixa" : "faixas"}
          </button>
        )}
        <IconButton label="Adicionar arquivos de áudio" size="xs" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
          <PlusIcon weight="bold" />
        </IconButton>
      </div>

      <div className="mt-2 min-w-0 rounded-lg border border-line-soft bg-canvas/40 px-2.5 py-2">
        {selectedTrack ? (
          <>
            <div className="flex min-w-0 items-center gap-1.5">
              <button type="button" onClick={togglePlayback} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold text-on-gold hover:bg-gold-hover" aria-label={isPlaying ? "Pausar" : "Reproduzir"}>
                {isPlaying ? <PauseIcon size={14} weight="fill" /> : <PlayIcon size={14} weight="fill" />}
              </button>
              <div className="min-w-0 flex-1 pl-1">
                <p className="truncate text-[13px] font-medium text-fg" title={selectedTrack.name}>{selectedTrack.name}</p>
                <p className="text-[11px] text-fg-3">{isPlaying ? "Tocando" : "Pausado"}</p>
              </div>
              <IconButton label="Faixa anterior" size="xs" onClick={() => playAdjacentTrack(-1)} disabled={tracks.length < 2}>
                <SkipBackIcon weight="fill" />
              </IconButton>
              <IconButton label="Próxima faixa" size="xs" onClick={() => playAdjacentTrack(1)} disabled={tracks.length < 2}>
                <SkipForwardIcon weight="fill" />
              </IconButton>
              <IconButton label="Ajustar volume" size="xs" active={showVolume} onClick={() => setShowVolume((shown) => !shown)} aria-expanded={showVolume}>
                <SpeakerHighIcon />
              </IconButton>
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-[11px] tabular-nums text-fg-3">
              <span>{formatTime(currentTime)}</span>
              <input type="range" min={0} max={duration || 0} step={0.1} value={Math.min(currentTime, duration || 0)} onChange={(event) => { const time = Number(event.target.value); if (audioRef.current) audioRef.current.currentTime = time; setCurrentTime(time); }} disabled={!duration} aria-label="Posição da reprodução" className="h-1 min-w-0 flex-1 cursor-pointer accent-[var(--q-gold)] disabled:cursor-default" />
              <span>{formatTime(duration)}</span>
            </div>
            {showVolume && (
              <div className="mt-2 flex items-center justify-end gap-2 border-t border-line-soft pt-2 text-[11px] text-fg-3">
                <span>Volume</span>
                <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(event) => setVolume(Number(event.target.value))} aria-label="Volume" className="h-1 w-28 cursor-pointer accent-[var(--q-gold)]" />
                <span className="w-8 text-right tabular-nums">{Math.round(volume * 100)}%</span>
              </div>
            )}
          </>
        ) : tracks.length ? (
          <button type="button" onClick={() => setTrackSource(tracks[0]!, false)} className="flex min-h-8 w-full items-center justify-between gap-2 text-left text-[13px] text-fg-3">
            <span>Nenhuma faixa selecionada</span>
            <span className="text-gold-fg">Selecionar</span>
          </button>
        ) : (
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="flex min-h-8 w-full items-center justify-between gap-2 text-left text-[13px] text-fg-3 disabled:opacity-60">
            <span>{isLoading ? "Carregando…" : "Sua música ou ruído branco para focar"}</span>
            <span className="shrink-0 text-gold-fg">Adicionar</span>
          </button>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="audio/*" multiple className="hidden" aria-label="Selecionar arquivos de áudio" onChange={(event) => void handleFilesSelected(event.currentTarget.files)} />
      {showLibrary && tracks.length > 0 && (
        <ul className="mt-2 max-h-36 overflow-y-auto rounded-lg border border-line-soft p-1">
          {tracks.map((track, index) => {
            const active = track.id === selectedTrackId;
            return (
              <li key={track.id} className={cx("flex min-w-0 items-center gap-2 rounded-md px-2 py-1", active ? "bg-gold-soft" : "hover:bg-hover")}>
                <button type="button" onClick={() => setTrackSource(track, true)} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-current={active ? "true" : undefined}>
                  <span className="w-4 shrink-0 text-center text-[11px] tabular-nums text-fg-3">{active && isPlaying ? "♪" : index + 1}</span>
                  <span className={cx("truncate text-xs", active ? "font-medium text-fg" : "text-fg-2")} title={track.name}>{track.name}</span>
                </button>
                <IconButton label={`Remover ${track.name}`} variant="danger" size="xs" onClick={() => void handleRemoveTrack(track)}>
                  <XIcon />
                </IconButton>
              </li>
            );
          })}
        </ul>
      )}
      {error && <p className="mt-1.5 text-xs leading-relaxed text-danger" role="alert">{error}</p>}
      <p className="mt-1.5 text-[11px] text-fg-4">Os áudios ficam só neste dispositivo.</p>
    </section>
  );
}
