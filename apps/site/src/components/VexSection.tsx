import { CheckIcon, ShieldCheckIcon, SparkleIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

/** Etapas da conversa, na ordem em que aparecem. O índice de cada etapa define quando ela entra. */
const STEPS = ["user", "typing", "plan", "confirm", "done"] as const;
const STEP_DELAY_MS = [0, 900, 1900, 1600, 2200];

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Avança as etapas quando a seção entra na tela; com movimento reduzido, mostra tudo de uma vez. */
function useConversation() {
  const ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(-1);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setStep(STEPS.length - 1);
      return;
    }
    const node = ref.current;
    if (!node) return;
    const timers: number[] = [];
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        let elapsed = 0;
        STEP_DELAY_MS.forEach((delay, index) => {
          elapsed += delay;
          timers.push(window.setTimeout(() => setStep(index), elapsed));
        });
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const shown = (name: (typeof STEPS)[number]) => step >= STEPS.indexOf(name);
  return { ref, shown, typing: step === STEPS.indexOf("typing") };
}

function VexBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex animate-fade-up items-start gap-2.5">
      <img src="/vex-avatar.webp" alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-full object-cover" />
      <div className="min-w-0 max-w-[85%] rounded-2xl rounded-tl-md border border-line bg-raised px-4 py-3 text-[14px] leading-relaxed text-fg-2">{children}</div>
    </div>
  );
}

function Conversation() {
  const { ref, shown, typing } = useConversation();
  return (
    <div ref={ref} aria-hidden="true" className="flex min-h-[460px] flex-col gap-3 rounded-3xl border border-line bg-surface p-4 sm:p-6">
      <div className="flex items-center gap-2 border-b border-line-soft pb-3">
        <SparkleIcon size={16} weight="fill" className="text-ai-fg" />
        <span className="text-sm font-medium text-fg">Vex</span>
        <span className="ml-auto text-xs text-fg-4">agora</span>
      </div>

      {shown("user") && (
        <div className="flex animate-fade-up justify-end">
          <p className="max-w-[80%] rounded-2xl rounded-tr-md bg-gold px-4 py-2.5 text-[14px] font-medium text-on-gold">Organize meu dia, tenho prova de Química sexta.</p>
        </div>
      )}

      {typing && (
        <VexBubble>
          <span className="inline-flex gap-1 py-1" aria-label="digitando">
            {[0, 150, 300].map((delay) => (
              <span key={delay} className="h-1.5 w-1.5 animate-typing rounded-full bg-fg-3" style={{ animationDelay: `${delay}ms` }} />
            ))}
          </span>
        </VexBubble>
      )}

      {shown("plan") && (
        <VexBubble>
          Olhei sua agenda: você tem reunião às 14h e duas tarefas atrasadas. Proposta para hoje:
          <ul className="mt-2 flex flex-col gap-1 text-fg">
            <li>• 09:00 — revisar Química (45 min, com flashcards)</li>
            <li>• 11:00 — terminar as duas tarefas atrasadas</li>
            <li>• 16:00 — quiz de Química para fixar</li>
          </ul>
        </VexBubble>
      )}

      {shown("confirm") && (
        <div className="ml-10 animate-fade-up rounded-2xl border border-ai-line bg-ai-soft p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ai-fg">
            <ShieldCheckIcon size={14} weight="bold" /> Confirmar ação
          </p>
          <p className="mt-1.5 text-[14px] text-fg">Criar 3 blocos na agenda de hoje</p>
          <div className="mt-3 flex gap-2">
            <span className={`rounded-lg px-3 py-1.5 text-[13px] font-medium ${shown("done") ? "bg-success-soft text-success" : "bg-ai text-on-ai"}`}>
              {shown("done") ? "Confirmado" : "Confirmar"}
            </span>
            {!shown("done") && <span className="rounded-lg border border-line px-3 py-1.5 text-[13px] text-fg-3">Agora não</span>}
          </div>
        </div>
      )}

      {shown("done") && (
        <VexBubble>
          <span className="flex items-center gap-1.5">
            <CheckIcon size={15} weight="bold" className="text-success" /> Pronto! Os três blocos já estão na sua agenda. Boa revisão!
          </span>
        </VexBubble>
      )}
    </div>
  );
}

const POINTS = [
  { title: "Conhece o app inteiro", text: "Cria tarefas, eventos, metas, notas, flashcards e quizzes — e sabe onde cada coisa fica." },
  { title: "Você no controle", text: "Toda mudança aparece como um cartão de confirmação. Nada acontece sem o seu toque." },
  { title: "Lembra do contexto", text: "Consulta seus dados na hora da conversa e não repete ações que você já confirmou." },
];

export function VexSection() {
  return (
    <section id="vex" className="border-t border-line-soft bg-[radial-gradient(ellipse_at_top_right,var(--color-ai-soft),transparent_60%)]">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 sm:px-8 md:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-ai-fg">Conheça a Vex</p>
          <h2 className="mt-2 font-display text-[32px] font-semibold leading-tight tracking-[-0.02em] text-fg sm:text-[38px]">
            Peça em uma frase. Ela monta o plano.
          </h2>
          <p className="mt-4 text-fg-2">A Vex é a assistente do Qqorvex. Ela entende o que você precisa, olha seus dados e propõe o que fazer — você só confirma.</p>
          <ul className="mt-8 flex flex-col gap-5">
            {POINTS.map((point) => (
              <li key={point.title} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ai-soft text-ai-fg">
                  <CheckIcon size={13} weight="bold" />
                </span>
                <span>
                  <span className="block font-medium text-fg">{point.title}</span>
                  <span className="text-sm text-fg-3">{point.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <Conversation />
      </div>
    </section>
  );
}
