import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { ArrowUpIcon, MicrophoneIcon, StopIcon } from "@phosphor-icons/react";
import { IconButton, cx } from "@qqorvex/ui";
import { useSpeechInput } from "./useSpeechInput";

export interface VexComposerHandle {
  focus: () => void;
  setText: (text: string) => void;
}

export interface VexComposerProps {
  variant: "panel" | "page";
  busy: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  ref?: Ref<VexComposerHandle>;
}

const MAX_HEIGHT = 200;

/** Campo de mensagem: cresce com o texto, Enter envia, Shift+Enter quebra linha, ditado por voz. */
export function VexComposer({ variant, busy, onSend, onStop, ref }: VexComposerProps) {
  const [text, setText] = useState("");
  const [speechError, setSpeechError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
    if (!value || busy) return;
    speech.stop();
    onSend(value);
    setText("");
  }

  const canSend = text.trim().length > 0 && !busy;

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
      <label htmlFor={`vex-input-${variant}`} className="sr-only">
        Mensagem para a Vex
      </label>
      <textarea
        id={`vex-input-${variant}`}
        ref={textareaRef}
        rows={1}
        value={text}
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
        placeholder={speech.listening ? "Ouvindo… fale à vontade" : "Pergunte ou peça algo à Vex"}
        className={cx(
          "block w-full resize-none bg-transparent px-4 pt-3 text-fg outline-none placeholder:text-fg-4",
          variant === "page" ? "min-h-[52px] text-[15px] leading-relaxed" : "min-h-[44px] text-[14px] leading-relaxed",
        )}
        style={{ maxHeight: MAX_HEIGHT }}
      />
      {speechError && (
        <p role="alert" className="px-4 pt-1 text-xs text-warning">
          {speechError}
        </p>
      )}
      <div className="flex items-center gap-1 px-2 pb-2 pt-1">
        <span className="hidden truncate px-2 text-[11px] text-fg-4 sm:block">{speech.listening ? "Ouvindo — toque no microfone para parar" : "Enter envia · Shift + Enter quebra a linha"}</span>
        <span className="flex-1" />
        {speech.supported && (
          <IconButton
            label={speech.listening ? "Parar ditado" : "Ditar por voz"}
            size="md"
            active={speech.listening}
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
