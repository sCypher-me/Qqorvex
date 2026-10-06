import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { ArrowUpIcon, FileTextIcon, MicrophoneIcon, PaperclipIcon, StopIcon, XIcon } from "@phosphor-icons/react";
import { IconButton, cx } from "@qqorvex/ui";
import { useSpeechInput } from "./useSpeechInput";
import { validateVexFileSelection, VEX_FILE_LIMIT_BYTES } from "./fileAttachments";

export interface VexComposerHandle {
  focus: () => void;
  setText: (text: string) => void;
}

export interface VexComposerProps {
  variant: "panel" | "page";
  busy: boolean;
  onSend: (text: string, attachment?: File) => void;
  onStop: () => void;
  ref?: Ref<VexComposerHandle>;
}

const MAX_HEIGHT = 200;

/** Campo de mensagem: cresce com o texto, Enter envia, Shift+Enter quebra linha, ditado por voz. */
export function VexComposer({ variant, busy, onSend, onStop, ref }: VexComposerProps) {
  const [text, setText] = useState("");
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef(text);
  textRef.current = text;

  const resize = useCallback(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT)}px`;
  }, []);

  useEffect(resize, [text, resize]);

  const speech = useSpeechInput({ getBaseText: () => textRef.current, onText: setText, onError: setSpeechError });

  useEffect(() => {
    if (!busy) setSubmitting(false);
  }, [busy]);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    setText: (value: string) => {
      setText(value);
      window.requestAnimationFrame(() => {
        const element = textareaRef.current;
        if (!element) return;
        element.focus();
        element.setSelectionRange(value.length, value.length);
      });
    },
  }));

  function submit() {
    const value = text.trim();
    if ((!value && !attachment) || busy || submitting) return;
    speech.stop();
    setSubmitting(true);
    onSend(value, attachment ?? undefined);
    setText("");
    setAttachment(null);
    setFileError(null);
  }

  const isBusy = busy || submitting;
  const canSend = (text.trim().length > 0 || Boolean(attachment)) && !isBusy;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className={cx(
        "rounded-2xl border border-line bg-raised shadow-sm transition-[border-color,box-shadow] duration-150 focus-within:border-gold-line focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--q-gold)_14%,transparent)]",
        speech.listening && "border-ai-line",
      )}
    >
      {attachment && (
        <div className="mx-3 mt-3 flex min-w-0 items-center gap-2 rounded-xl border border-line-soft bg-surface px-2.5 py-2" aria-label={`Arquivo anexado: ${attachment.name}`}>
          <FileTextIcon size={18} className="shrink-0 text-ai-fg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-fg">{attachment.name}</p>
            <p className="text-[11px] text-fg-4">{(attachment.size / (1024 * 1024)).toFixed(1)} MB · .txt, .pdf ou .docx</p>
          </div>
          <IconButton label="Remover arquivo" size="sm" disabled={isBusy} onClick={() => { setAttachment(null); setFileError(null); }}>
            <XIcon />
          </IconButton>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="sr-only"
        tabIndex={-1}
        aria-label="Escolher arquivo para enviar à Vex"
        onChange={(event) => {
          const selected = event.currentTarget.files?.[0] ?? null;
          event.currentTarget.value = "";
          if (!selected) return;
          const error = validateVexFileSelection(selected);
          if (error) {
            setAttachment(null);
            setFileError(error);
            return;
          }
          setAttachment(selected);
          setFileError(null);
          setSpeechError(null);
        }}
      />
      <label htmlFor={`vex-input-${variant}`} className="sr-only">
        Mensagem para a Vex
      </label>
      <textarea
        id={`vex-input-${variant}`}
        ref={textareaRef}
        rows={1}
        value={text}
        disabled={isBusy}
        data-vex-initial-focus={variant === "panel" ? true : undefined}
        onChange={(event) => {
          setText(event.target.value);
          setSpeechError(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            submit();
          }
        }}
        placeholder={speech.listening ? "Ouvindo… fale à vontade" : attachment ? "O que você quer fazer com este arquivo?" : "Pergunte ou peça algo à Vex"}
        className={cx(
          "block w-full resize-none bg-transparent px-4 pt-3 text-fg outline-none placeholder:text-fg-4",
          variant === "page" ? "min-h-[52px] text-[15px] leading-relaxed" : "min-h-[44px] text-[14px] leading-relaxed",
        )}
        style={{ maxHeight: MAX_HEIGHT }}
      />
      {(speechError || fileError) && (
        <p role="alert" className="px-4 pt-1 text-xs text-warning">
          {fileError ?? speechError}
        </p>
      )}
      {attachment && <p className="px-4 pt-1 text-[11px] leading-relaxed text-fg-4">O texto extraído será enviado à Vex e ficará nesta conversa. Até {(VEX_FILE_LIMIT_BYTES / (1024 * 1024)).toFixed(0)} MB.</p>}
      <div className="flex items-center gap-1 px-2 pb-2 pt-1">
        <span className="hidden truncate px-2 text-[11px] text-fg-4 sm:block">{speech.listening ? "Ouvindo — toque no microfone para parar" : "Enter envia · Shift + Enter quebra a linha"}</span>
        <span className="flex-1" />
        <IconButton
          label="Anexar arquivo à Vex"
          size="md"
          disabled={isBusy}
          onClick={() => { setFileError(null); fileInputRef.current?.click(); }}
          className="rounded-full"
        >
          <PaperclipIcon />
        </IconButton>
        {speech.supported && (
          <IconButton
            label={speech.listening ? "Parar ditado" : "Ditar por voz"}
            size="md"
            active={speech.listening}
            disabled={isBusy}
            onClick={() => {
              setSpeechError(null);
              speech.toggle();
            }} className={cx("rounded-full", speech.listening && "bg-ai-soft text-ai-fg")}>
            <MicrophoneIcon weight={speech.listening ? "fill" : "regular"} />
          </IconButton>
        )}
        {busy ? (
          <IconButton label="Parar resposta" size="md" variant="secondary" onClick={onStop} className="rounded-full">
            <StopIcon weight="fill" />
          </IconButton>
        ) : (
          <IconButton label="Enviar mensagem" size="md" variant="primary" type="submit" disabled={!canSend} className="rounded-full disabled:bg-selected disabled:text-fg-4 disabled:opacity-100">
            <ArrowUpIcon weight="bold" />
          </IconButton>
        )}
      </div>
    </form>
  );
}
