import { CalendarBlankIcon, CheckIcon, ReceiptIcon, ShieldCheckIcon, SparkleIcon, StackIcon } from "@phosphor-icons/react";
import { useState } from "react";
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
  const [selected, setSelected] = useState(0);
  const [outcome, setOutcome] = useState<"pending" | "confirmed" | "cancelled">("pending");
  const example = EXAMPLES[selected]!;
  const ExampleIcon = example.Icon;

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
      <p className="mt-1 text-xs leading-relaxed text-fg-3">Escolha um exemplo. Nenhum dado real será alterado.</p>
      <div role="group" aria-label="Exemplos da Vex" className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((item, index) => (
          <button
            key={item.label}
            type="button"
            aria-pressed={selected === index}
            onClick={() => { setSelected(index); setOutcome("pending"); }}
            className={`min-h-11 rounded-xl border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--q-focus)] ${selected === index ? "border-ai-line bg-ai-soft text-ai-fg" : "border-line bg-raised text-fg-3 hover:border-line-strong hover:text-fg"}`}
          >{item.label}</button>
        ))}
      </div>
      <div className="mt-5 flex flex-col gap-4">
        <div className="flex justify-end">
          <p className="max-w-[92%] rounded-2xl rounded-tr-md bg-gold px-4 py-3 text-sm font-medium leading-relaxed text-on-gold">{example.request}</p>
        </div>
        <div className="rounded-2xl rounded-tl-md border border-line bg-raised px-4 py-3 text-sm leading-relaxed text-fg-2">{example.response}</div>
        <div className="rounded-2xl border border-ai-line bg-ai-soft p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ai-fg">
            <ShieldCheckIcon size={16} weight="bold" aria-hidden="true" /> {outcome === "confirmed" ? "Ação confirmada" : outcome === "cancelled" ? "Ação cancelada" : "Você decide"}
          </p>
          <p className="mt-2 text-sm font-medium text-fg">{example.action}</p>
          <div className="mt-3 flex items-start gap-3 rounded-xl border border-ai-line bg-surface/60 p-3">
            <ExampleIcon size={22} className="mt-0.5 shrink-0 text-ai-fg" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-fg">{example.title}</p>
              <p className="mt-1 text-xs text-fg-3">{example.detail}</p>
            </div>
          </div>
          {outcome === "pending" ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="ai" className="min-h-11" onClick={() => setOutcome("confirmed")}>Confirmar</Button>
              <Button variant="ghost" className="min-h-11" onClick={() => setOutcome("cancelled")}>Agora não</Button>
            </div>
          ) : (
            <Button variant="ghost" className="mt-3 min-h-11" onClick={() => setOutcome("pending")}>Experimentar novamente</Button>
          )}
        </div>
        <div role="status" aria-live="polite" aria-atomic="true" className="min-h-12 text-sm leading-relaxed">
          {outcome === "confirmed" && <p className="flex items-start gap-2 text-success"><CheckIcon size={18} weight="bold" className="mt-0.5 shrink-0" aria-hidden="true" />{example.result}</p>}
          {outcome === "cancelled" && <p className="text-fg-3">Tudo bem. Nada foi alterado na demonstração.</p>}
        </div>
      </div>
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
