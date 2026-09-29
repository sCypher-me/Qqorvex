import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  [index: number]: { transcript: string };
}

interface SpeechRecognitionEventLike extends Event {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function recognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const browserWindow = window as Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null;
}

function errorMessage(error: string): string | null {
  switch (error) {
    case "aborted":
      return null;
    case "audio-capture":
      return "Não consegui acessar o microfone. Confira a permissão e se outro aplicativo não está usando o áudio.";
    case "network":
      return "O reconhecimento de voz perdeu a conexão. Verifique a internet e tente de novo.";
    case "no-speech":
      return "Não detectei fala. Toque no microfone e fale logo em seguida.";
    case "not-allowed":
    case "service-not-allowed":
      return "O acesso ao microfone foi bloqueado. Libere a permissão nas configurações do navegador ou do app.";
    case "language-not-supported":
    case "language-unavailable":
      return "O ditado em português não está disponível neste dispositivo.";
    default:
      return "O ditado foi interrompido. Confira o microfone e tente de novo.";
  }
}

/**
 * Ditado por voz (Web Speech API) em pt-BR. Mantém a escuta contínua mesmo quando o navegador
 * encerra a sessão depois de um silêncio, e junta o que foi dito ao texto que já estava no campo.
 */
export function useSpeechInput({ getBaseText, onText, onError }: { getBaseText: () => string; onText: (text: string) => void; onError: (message: string) => void }) {
  const [listening, setListening] = useState(false);
  const supported = recognitionConstructor() !== null;
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const wantsRef = useRef(false);
  const restartTimer = useRef<number | null>(null);
  const baseRef = useRef("");
  const latestRef = useRef("");
  const callbacks = useRef({ onText, onError });
  callbacks.current = { onText, onError };

  const stopAll = useCallback(() => {
    wantsRef.current = false;
    if (restartTimer.current !== null) window.clearTimeout(restartTimer.current);
    restartTimer.current = null;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {
        /* já encerrada */
      }
    }
    setListening(false);
  }, []);

  useEffect(() => stopAll, [stopAll]);

  const start = useCallback(() => {
    const Recognition = recognitionConstructor();
    if (!Recognition) {
      callbacks.current.onError("O ditado por voz não está disponível neste navegador. No celular, o microfone do teclado também funciona.");
      return;
    }
    wantsRef.current = true;
    baseRef.current = getBaseText().trim();
    latestRef.current = baseRef.current;

    const launch = (attempt = 0) => {
      if (!wantsRef.current) return;
      const recognition = new Recognition();
      recognitionRef.current = recognition;
      recognition.lang = "pt-BR";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        if (recognitionRef.current !== recognition) return;
        const transcript = Array.from(event.results, (result) => result[0]?.transcript ?? "").join(" ").replace(/\s+/g, " ").trim();
        if (!transcript) return;
        latestRef.current = [baseRef.current, transcript].filter(Boolean).join(" ");
        callbacks.current.onText(latestRef.current);
      };
      const scheduleRestart = () => {
        if (!wantsRef.current || restartTimer.current !== null) return;
        baseRef.current = latestRef.current;
        restartTimer.current = window.setTimeout(() => {
          restartTimer.current = null;
          launch();
        }, 320);
      };
      recognition.onerror = (event) => {
        if (recognitionRef.current !== recognition) return;
        recognitionRef.current = null;
        if (event.error === "no-speech" && wantsRef.current) return scheduleRestart();
        const manual = !wantsRef.current;
        stopAll();
        if (manual && event.error === "aborted") return;
        const message = errorMessage(event.error);
        if (message) callbacks.current.onError(message);
      };
      recognition.onend = () => {
        if (recognitionRef.current !== recognition) return;
        recognitionRef.current = null;
        if (wantsRef.current) scheduleRestart();
        else setListening(false);
      };
      try {
        recognition.start();
        setListening(true);
      } catch (error) {
        recognitionRef.current = null;
        const name = typeof error === "object" && error && "name" in error ? String(error.name) : "";
        if (name === "InvalidStateError" && attempt < 3) {
          restartTimer.current = window.setTimeout(() => {
            restartTimer.current = null;
            launch(attempt + 1);
          }, 500);
          return;
        }
        stopAll();
        callbacks.current.onError(name === "NotAllowedError" || name === "SecurityError" ? errorMessage("not-allowed")! : "Não foi possível iniciar o ditado. Confira o microfone e tente de novo.");
      }
    };
    launch();
  }, [getBaseText, stopAll]);

  const toggle = useCallback(() => {
    if (wantsRef.current || recognitionRef.current) stopAll();
    else start();
  }, [start, stopAll]);

  return { supported, listening, toggle, stop: stopAll };
}
