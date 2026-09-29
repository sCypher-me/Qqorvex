import type { ReactNode } from "react";
import { CalendarCheckIcon, SparkleIcon, WalletIcon } from "@phosphor-icons/react";
import { BrandSymbol, Wordmark } from "@qqorvex/ui";
import { ThemeToggle } from "../app/shell/ThemeToggle";

const HIGHLIGHTS = [
  { icon: <CalendarCheckIcon />, title: "Seu dia em um só painel", text: "Tarefas, agenda, hábitos e prazos organizados pela manhã." },
  { icon: <WalletIcon />, title: "Dinheiro sob controle", text: "Gastos, orçamento e cartões com uma leitura clara do mês." },
  { icon: <SparkleIcon />, title: "A Vex trabalha com você", text: "Uma assistente que conhece suas telas e age com a sua confirmação." },
];

/** Moldura das telas públicas (entrar, criar conta, recuperar senha, 2FA). */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative grid min-h-svh grid-cols-1 bg-canvas lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <section className="relative flex min-w-0 flex-col px-5 pb-10 pt-6 sm:px-10 lg:px-16">
        <div className="flex items-center gap-2.5">
          <BrandSymbol size={26} />
          <Wordmark size={20} />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[420px] animate-fade-up">{children}</div>
        </div>
        <p className="text-center text-xs text-fg-4 lg:text-left">© {new Date().getFullYear()} Qqorvex · Seus dados são privados e protegidos.</p>
      </section>

      <section aria-hidden="true" className="relative hidden overflow-hidden border-l border-line-soft bg-sidebar lg:flex lg:flex-col lg:justify-center lg:px-16 xl:px-20">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,var(--q-gold-soft),transparent_65%)]" />
        <BrandSymbol size={420} className="pointer-events-none absolute -bottom-24 -right-24 text-gold opacity-[0.07]" />
        <div className="relative max-w-[520px]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gold-fg">Organização pessoal, sem ruído</p>
          <h2 className="mt-4 font-display text-[44px] font-semibold leading-[1.05] tracking-[-0.03em] text-fg xl:text-[52px]">
            Clareza para o que importa na sua vida.
          </h2>
          <ul className="mt-10 flex flex-col gap-6">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-gold-fg [&_svg]:size-5">{item.icon}</span>
                <span>
                  <span className="block text-[15px] font-semibold text-fg">{item.title}</span>
                  <span className="mt-0.5 block text-[14px] leading-relaxed text-fg-3">{item.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
