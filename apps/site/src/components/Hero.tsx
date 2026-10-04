import { ArrowRightIcon, CheckSquareIcon, ClockIcon, DownloadSimpleIcon, SparkleIcon } from "@phosphor-icons/react";
import { ProgressBar, buttonClasses } from "@qqorvex/ui";
import { APK_URL } from "../config";

/** Prévia estática da tela Hoje: mostra o produto sem depender de captura de tela. */
function AppPreview() {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)]">
      <div className="flex items-center gap-2 border-b border-line-soft px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="ml-3 text-xs text-fg-4">Hoje</span>
      </div>
      <div className="flex flex-col gap-3 p-4 sm:p-5">
        <div>
          <p className="text-xs text-fg-3">Sábado, 3 de outubro</p>
          <p className="font-display text-[22px] font-semibold text-fg">Boa tarde, Ana.</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-line bg-canvas/40 p-3">
            <p className="text-[11px] text-fg-3">Tarefas de hoje</p>
            <p className="font-display text-lg font-semibold tabular-nums text-fg">
              3<span className="text-fg-4">/5</span>
            </p>
            <ProgressBar value={60} height={4} />
          </div>
          <div className="rounded-xl border border-line bg-canvas/40 p-3">
            <p className="text-[11px] text-fg-3">Próximo compromisso</p>
            <p className="font-display text-lg font-semibold text-fg">14:00</p>
            <p className="truncate text-[11px] text-fg-3">Reunião do projeto</p>
          </div>
        </div>
        <ul className="flex flex-col gap-1.5 text-[13px]">
          <li className="flex items-center gap-2 rounded-lg bg-raised px-3 py-2 text-fg-2">
            <CheckSquareIcon size={15} className="text-gold-fg" /> Revisar resumo de Biologia
          </li>
          <li className="flex items-center gap-2 rounded-lg bg-raised px-3 py-2 text-fg-2">
            <ClockIcon size={15} className="text-fg-3" /> Pagar a fatura do cartão
          </li>
          <li className="flex items-start gap-2 rounded-lg border border-ai-line bg-ai-soft px-3 py-2 text-fg-2">
            <SparkleIcon size={15} weight="fill" className="mt-0.5 shrink-0 text-ai-fg" />
            <span>
              <span className="font-medium text-ai-fg">Vex:</span> criei 5 flashcards do seu resumo para revisar hoje.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section id="inicio" className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 sm:px-8 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:pt-24">
      <div className="animate-fade-up">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-3 py-1 text-xs font-medium text-gold-fg">Beta em breve</span>
        <h1 className="mt-5 font-display text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] text-fg sm:text-[52px]">
          Sua vida organizada, com uma assistente que faz junto.
        </h1>
        <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-fg-2">
          Tarefas, agenda, estudos, finanças e muito mais num lugar só. A <span className="text-ai-fg">Vex</span> consulta seus dados e age por você — sempre pedindo
          confirmação antes de mudar qualquer coisa.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#lista" className={buttonClasses({ size: "lg" })}>
            Entrar na lista de espera <ArrowRightIcon size={16} weight="bold" />
          </a>
          <a href={APK_URL} className={buttonClasses({ variant: "secondary", size: "lg" })}>
            Baixar APK para Android <DownloadSimpleIcon size={18} aria-hidden="true" />
          </a>
        </div>
        <p className="mt-3 text-sm text-fg-3">Versão beta para Android 7 ou superior. O acesso ao app requer convite.</p>
      </div>
      <AppPreview />
    </section>
  );
}
