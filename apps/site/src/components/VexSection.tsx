import { ArrowRightIcon, CalendarBlankIcon, CheckIcon, ReceiptIcon, ShieldCheckIcon, SparkleIcon, StackIcon } from "@phosphor-icons/react";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@qqorvex/ui";

const EXAMPLES = [
  {
    label: "Organizar meu dia",
    request: "Tenho prova de Química sexta. Reserve 45 minutos para revisar amanhã.",
    response: "Na sua agenda de exemplo, amanhã às 9h está livre. Posso reservar esse horário para sua revisão de Química.",
    action: "Criar evento na agenda",
    title: "Revisão de Química",
    detail: "Amanhã · 09:00–09:45",
    result: "Evento criado na agenda de exemplo.",
    Icon: CalendarBlankIcon,
  },
  {
    label: "Preparar uma revisão",
    request: "Crie flashcards sobre ligações químicas para eu revisar.",
    response: "Preparei três perguntas sobre ligações iônicas, covalentes e metálicas. Posso adicionar os flashcards ao caderno de Química.",
    action: "Adicionar flashcards ao caderno",
    title: "Ligações químicas",
    detail: "Química · 3 flashcards",
    result: "Flashcards adicionados ao caderno de exemplo.",
    Icon: StackIcon,
  },
  {
    label: "Registrar um gasto",
    request: "Gastei R$ 32 no almoço hoje. Registre em alimentação.",
    response: "Preparei uma saída de R$ 32,00 na categoria Alimentação, com a data de hoje. Posso registrar esse gasto?",
    action: "Registrar movimentação em Finanças",
    title: "Almoço",
    detail: "Hoje · Alimentação · R$ 32,00",
    result: "Gasto registrado nas finanças de exemplo.",
    Icon: ReceiptIcon,
  },
] as const;

function Conversation() {
  const [draft, setDraft] = useState("");
  const [request, setRequest] = useState<string | null>(null);
  const [preset, setPreset] = useState<(typeof EXAMPLES)[number] | null>(null);
  const [stage, setStage] = useState<"idle" | "thinking" | "typing" | "proposal" | "confirmed" | "cancelled">("idle");
  const [visibleResponseLength, setVisibleResponseLength] = useState(0);
  const response = preset?.response ?? "Entendi. Para responder com contexto, eu consultaria suas informações no app. Nesta prévia, você pode experimentar os exemplos guiados acima; nenhuma alteração real será feita.";
  const isResponding = stage === "thinking" || stage === "typing";
  const isIdle = stage === "idle";
  const ExampleIcon = preset?.Icon;
  const selectedExample = EXAMPLES.find((item) => item.request === draft.trim());

  useEffect(() => {
    if (stage !== "thinking") return;
    const timer = window.setTimeout(() => setStage("typing"), 650);
    return () => window.clearTimeout(timer);
  }, [stage]);

  useEffect(() => {
    if (stage !== "typing") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisibleResponseLength(response.length);
      setStage(preset ? "proposal" : "confirmed");
      return;
    }

    let nextLength = 0;
    const timer = window.setInterval(() => {
      nextLength += 1;
      setVisibleResponseLength(nextLength);
      if (nextLength >= response.length) {
        window.clearInterval(timer);
        setStage(preset ? "proposal" : "confirmed");
      }
    }, 24);
    return () => window.clearInterval(timer);
  }, [preset, response, stage]);

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || !isIdle) return;
    const match = EXAMPLES.find((item) => item.request.toLocaleLowerCase("pt-BR") === message.toLocaleLowerCase("pt-BR")) ?? null;
    setRequest(message);
    setPreset(match);
    setVisibleResponseLength(0);
    setDraft("");
    setStage("thinking");
  }

  function startOver() {
    setRequest(null);
    setPreset(null);
    setVisibleResponseLength(0);
    setStage("idle");
  }

  return (
    <div className="min-w-0 rounded-3xl border border-line bg-surface p-4 sm:p-6">
      <div className="flex items-center gap-3 border-b border-line-soft pb-4">
        <img src="/vex-avatar.webp" alt="" width={64} height={64} className="h-14 w-14 shrink-0 rounded-full border border-ai-line object-cover sm:h-16 sm:w-16" />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-display text-xl font-semibold text-fg">Vex <SparkleIcon size={16} weight="fill" className="text-ai-fg" aria-hidden="true" /></p>
          <p className="text-sm text-fg-3">Sua assistente no Qqorvex</p>
        </div>
      </div>
      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-ai-fg">Demonstração interativa</p>
      <p className="mt-1 text-xs leading-relaxed text-fg-3">Envie uma mensagem e veja a Vex preparar uma ação. Nenhum dado real será alterado.</p>
      <div role="group" aria-label="Exemplos da Vex" className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((item) => (
          <button
            key={item.label}
            type="button"
            aria-pressed={selectedExample?.label === item.label}
            disabled={!isIdle}
            onClick={() => setDraft(item.request)}
            className={`min-h-11 rounded-xl border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--q-focus)] disabled:cursor-not-allowed disabled:opacity-50 ${selectedExample?.label === item.label ? "border-ai-line bg-ai-soft text-ai-fg" : "border-line bg-raised text-fg-3 hover:border-line-strong hover:text-fg"}`}
          >{item.label}</button>
        ))}
      </div>
      <div className="mt-5 flex min-h-24 flex-col gap-4" aria-live="polite" aria-relevant="additions text">
        {!request && <p className="my-auto py-5 text-center text-sm text-fg-4">Sua conversa começa aqui. Escolha um exemplo ou escreva um pedido.</p>}
        {request && <div className="flex justify-end"><p className="max-w-[92%] rounded-2xl rounded-tr-md bg-gold px-4 py-3 text-sm font-medium leading-relaxed text-on-gold">{request}</p></div>}
        {request && (stage === "thinking" ? (
          <div className="flex items-center gap-2 self-start rounded-2xl rounded-tl-md border border-line bg-raised px-4 py-3 text-sm text-fg-3" role="status" aria-label="Vex está digitando">
            <span>Vex está pensando</span><span className="flex gap-1" aria-hidden="true"><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-ai-fg [animation-delay:-.2s]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-ai-fg [animation-delay:-.1s]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-ai-fg" /></span>
          </div>
        ) : (
          <div className="max-w-[96%] self-start rounded-2xl rounded-tl-md border border-line bg-raised px-4 py-3 text-sm leading-relaxed text-fg-2" aria-label={stage === "typing" ? "Vex está digitando" : "Resposta da Vex"}>
            <span>{response.slice(0, visibleResponseLength)}</span>
            {stage === "typing" && <><span className="ml-0.5 inline-block h-4 w-px animate-pulse bg-ai-fg align-middle" aria-hidden="true" /><span className="sr-only">Vex está digitando</span></>}
          </div>
        ))}
        {stage === "proposal" && preset && ExampleIcon && <div className="rounded-2xl border border-ai-line bg-ai-soft p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ai-fg">
            <ShieldCheckIcon size={16} weight="bold" aria-hidden="true" /> Você decide
          </p>
          <p className="mt-2 text-sm font-medium text-fg">{preset.action}</p>
          <div className="mt-3 flex items-start gap-3 rounded-xl border border-ai-line bg-surface/60 p-3">
            <ExampleIcon size={22} className="mt-0.5 shrink-0 text-ai-fg" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-fg">{preset.title}</p>
              <p className="mt-1 text-xs text-fg-3">{preset.detail}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="ai" className="min-h-11" onClick={() => setStage("confirmed")}>Confirmar</Button>
            <Button variant="ghost" className="min-h-11" onClick={() => setStage("cancelled")}>Agora não</Button>
          </div>
        </div>}
        {stage === "confirmed" && <div role="status" className="rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          {preset ? <p className="flex items-start gap-2"><CheckIcon size={18} weight="bold" className="mt-0.5 shrink-0" aria-hidden="true" />{preset.result}</p> : <p>A prévia guiada terminou. No app, a Vex pode consultar seus dados e preparar ações para você revisar.</p>}
        </div>}
        {stage === "cancelled" && <p role="status" className="rounded-xl border border-line-soft px-4 py-3 text-sm text-fg-3">Tudo bem. Nada foi alterado na demonstração.</p>}
      </div>
      {request && !isResponding && <Button variant="ghost" className="mt-3 min-h-10" onClick={startOver}>Nova conversa</Button>}
      <form onSubmit={sendMessage} className="mt-4 flex items-end gap-2 rounded-2xl border border-line bg-canvas/50 p-2 focus-within:border-ai-line">
        <label className="sr-only" htmlFor="vex-demo-message">Escreva uma mensagem para a Vex</label>
        <textarea
          id="vex-demo-message"
          rows={2}
          maxLength={280}
          value={draft}
          disabled={!isIdle}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }}
          placeholder="Escreva um pedido para a Vex…"
          className="q-input min-h-11 min-w-0 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm focus-visible:outline-none focus-visible:ring-0 disabled:opacity-50"
        />
        <Button type="submit" variant="ai" className="min-h-11 shrink-0" leadingIcon={<ArrowRightIcon size={16} weight="bold" />} disabled={!draft.trim() || !isIdle}>Enviar</Button>
      </form>
      <p className="mt-2 text-[11px] text-fg-4">A demonstração é guiada e não altera dados reais.</p>
    </div>
  );
}

const POINTS = [
  { title: "Entende seu contexto", text: "Consulta os dados disponíveis para preparar uma sugestão útil." },
  { title: "Conecta as áreas da sua vida", text: "Da agenda aos estudos e às finanças, tudo no mesmo lugar." },
  { title: "Pede confirmação antes de alterar", text: "Você revisa a ação e escolhe se quer continuar." },
];

export function VexSection() {
  return (
    <section id="vex" aria-labelledby="vex-title" className="border-t border-line-soft bg-[radial-gradient(ellipse_at_top_right,var(--color-ai-soft),transparent_60%)]">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 sm:px-8 md:grid-cols-2 md:gap-12">
        <div>
          <p className="text-sm font-medium text-ai-fg">Conheça a Vex</p>
          <h2 id="vex-title" className="mt-2 font-display text-[32px] font-semibold leading-tight tracking-[-0.02em] text-fg sm:text-[38px]">Peça em uma frase. A Vex prepara o próximo passo.</h2>
          <p className="mt-4 leading-relaxed text-fg-2">A Vex consulta sua agenda, conecta suas tarefas e prepara o próximo passo. Você decide o que acontece.</p>
          <ul className="mt-8 flex flex-col gap-5">
            {POINTS.map((point) => (
              <li key={point.title} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ai-soft text-ai-fg"><CheckIcon size={13} weight="bold" aria-hidden="true" /></span>
                <span><span className="block font-medium text-fg">{point.title}</span><span className="mt-1 block text-sm text-fg-3">{point.text}</span></span>
              </li>
            ))}
          </ul>
        </div>
        <Conversation />
      </div>
    </section>
  );
}
