import type { ReactNode } from "react";
import { BRAND_ASSETS } from "../app/shell/navigation";

/**
 * Layout de autenticação (Design System v1.0): painel da marca à esquerda (símbolo + wordmark,
 * slogan, Vex recortada com brilho cyan) e formulário à direita. Em telas estreitas vira uma coluna.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <section className="relative overflow-hidden hidden lg:flex flex-col justify-between p-12 border-r border-border bg-[linear-gradient(160deg,#101318_0%,#090B0E_70%)]">
        <div className="absolute -right-[140px] top-[60px] w-[520px] h-[520px] pointer-events-none bg-[radial-gradient(circle,rgba(67,185,210,.10),transparent_68%)]" />
        <div className="relative z-[2] flex items-center gap-3">
          <img src={BRAND_ASSETS.symbol} alt="" className="w-[26px] h-[26px] object-contain" />
          <img src={BRAND_ASSETS.wordmark} alt="Qqorvex" className="h-[22px] object-contain" />
        </div>
        <div className="relative z-[2] flex flex-col gap-[18px] max-w-[420px] pr-3">
          <h2 className="font-display text-[40px] font-semibold leading-[1.1] tracking-[-0.01em] m-0">Veja além dos números</h2>
          <p className="text-[15px] leading-[1.6] text-text-secondary m-0">
            Tarefas, agenda, estudos, biblioteca, finanças e vida pessoal em um só sistema. A Vex lê o contexto e responde
            quando você chama.
          </p>
          <div className="flex gap-2 flex-wrap pt-1">
            {["Supabase Auth", "Passkey", "2FA TOTP"].map((label) => (
              <span
                key={label}
                className="text-[11px] font-medium tracking-[0.06em] uppercase text-text-muted border border-border rounded-full px-[11px] py-[5px]"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
        <img
          src={BRAND_ASSETS.vexCutout}
          alt="Vex"
          className="absolute -right-[70px] bottom-0 h-[52%] max-w-[46%] object-contain object-[bottom_right] opacity-90 drop-shadow-[0_0_60px_rgba(67,185,210,.18)]"
        />
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(90deg,#090B0E_30%,rgba(9,11,14,.72)_52%,transparent_78%)]" />
        <span className="relative z-[2] font-mono text-xs text-text-muted">v1.0</span>
      </section>

      <section className="relative flex items-center justify-center p-12">
        <div className="w-full max-w-[392px] flex flex-col gap-[22px]">
          <div className="flex lg:hidden items-center gap-3">
            <img src={BRAND_ASSETS.symbol} alt="" className="w-[26px] h-[26px] object-contain" />
            <img src={BRAND_ASSETS.wordmark} alt="Qqorvex" className="h-[22px] object-contain" />
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
