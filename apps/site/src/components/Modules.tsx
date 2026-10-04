import type { Icon } from "@phosphor-icons/react";
import { BookOpenTextIcon, BrainIcon, CalendarBlankIcon, CheckSquareIcon, FilesIcon, GraduationCapIcon, TargetIcon, WalletIcon } from "@phosphor-icons/react";

const MODULES: { icon: Icon; title: string; text: string }[] = [
  { icon: CheckSquareIcon, title: "Tarefas", text: "Listas, prioridades, subtarefas e o que vence hoje sempre à vista." },
  { icon: CalendarBlankIcon, title: "Agenda", text: "Compromissos e recorrências, com sincronização do Google Agenda." },
  { icon: TargetIcon, title: "Metas e hábitos", text: "Acompanhe sequências, marcos e o progresso de cada objetivo." },
  { icon: GraduationCapIcon, title: "Estudos", text: "Matérias, sessões de foco, flashcards com revisão espaçada e quizzes." },
  { icon: BrainIcon, title: "Segundo cérebro", text: "Cadernos, notas ligadas entre si e mapas mentais." },
  { icon: BookOpenTextIcon, title: "Biblioteca", text: "Livros, filmes e séries — o que você está vendo e o que vem depois." },
  { icon: WalletIcon, title: "Finanças", text: "Gastos, receitas, orçamentos por categoria e contas a pagar." },
  { icon: FilesIcon, title: "Documentos", text: "Arquivos importantes e garantias guardados com segurança." },
];

export function Modules() {
  return (
    <section id="recursos" className="border-t border-line-soft">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <p className="text-sm font-medium text-gold-fg">Tudo num lugar só</p>
        <h2 className="mt-2 max-w-2xl font-display text-[32px] font-semibold leading-tight tracking-[-0.02em] text-fg sm:text-[38px]">
          Oito áreas da sua rotina, conectadas.
        </h2>
        <p className="mt-4 max-w-2xl text-fg-2">
          Cada módulo funciona sozinho, mas eles conversam: a tarefa de estudo aparece no Hoje, a conta a pagar vira lembrete, e a Vex enxerga tudo.
        </p>
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.map(({ icon: ModuleIcon, title, text }) => (
            <li key={title} className="rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-soft text-gold-fg">
                <ModuleIcon size={20} weight="duotone" />
              </span>
              <h3 className="mt-4 font-display text-[17px] font-semibold text-fg">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-fg-3">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
