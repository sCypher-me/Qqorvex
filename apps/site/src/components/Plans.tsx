import { CheckIcon } from "@phosphor-icons/react";
import { buttonClasses, cx } from "@qqorvex/ui";

/** Valores espelhados de docs/assinaturas.md — ao mudar um limite no banco, atualize aqui também. */
const PLANS = [
  {
    name: "Free",
    price: "Grátis",
    period: "",
    note: "Todos os módulos, para começar sem cartão.",
    features: ["5 metas, 10 hábitos e 5 cadernos ativos", "5 mapas mentais", "50 conversas com a Vex por mês", "10 buscas na web pela Vex", "25 MB para documentos"],
    highlight: false,
  },
  {
    name: "Plus",
    price: "R$ 19,90",
    period: "/mês",
    note: "ou R$ 214,90 por ano (cerca de 10% a menos).",
    features: ["Metas, hábitos, cadernos e mapas ilimitados", "300 conversas com a Vex por mês", "60 buscas na web pela Vex", "100 MB para documentos", "Arquivos de até 50 MB"],
    highlight: true,
  },
];

export function Plans() {
  return (
    <section id="planos" className="border-t border-line-soft">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <p className="text-sm font-medium text-gold-fg">Planos</p>
        <h2 className="mt-2 font-display text-[32px] font-semibold leading-tight tracking-[-0.02em] text-fg sm:text-[38px]">Comece grátis. Cresça quando quiser.</h2>
        <div className="mt-10 grid max-w-4xl gap-4 md:grid-cols-2">
          {PLANS.map((plan) => (
            <article
              key={plan.name}
              className={cx("flex flex-col rounded-3xl border p-6 sm:p-7", plan.highlight ? "border-gold-line bg-gold-soft" : "border-line bg-surface")}
            >
              <h3 className="font-display text-xl font-semibold text-fg">{plan.name}</h3>
              <p className="mt-3">
                <span className="font-display text-[34px] font-semibold tracking-[-0.02em] text-fg">{plan.price}</span>
                <span className="text-fg-3">{plan.period}</span>
              </p>
              <p className="mt-1 text-sm text-fg-3">{plan.note}</p>
              <ul className="mt-6 flex flex-1 flex-col gap-2.5 text-[15px] text-fg-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <CheckIcon size={16} weight="bold" className="mt-1 shrink-0 text-gold-fg" />
                    {feature}
                  </li>
                ))}
              </ul>
              <a href="#lista" className={cx(buttonClasses({ variant: plan.highlight ? "primary" : "secondary", fullWidth: true }), "mt-7")}>
                Entrar na lista de espera
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
