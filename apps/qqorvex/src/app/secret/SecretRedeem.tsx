import { createContext, useCallback, useContext, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { FlaskIcon, HandshakeIcon, InfinityIcon, SparkleIcon } from "@phosphor-icons/react";
import { useRedeemCode, type RedeemResult } from "@qqorvex/module-manager";
import { Button, Input, Modal, Notice, triggerHaptic } from "@qqorvex/ui";
import { supabase } from "../supabase";
import { INITIAL_SECRET_TAPS, registerSecretTap } from "./secretTaps";

/** Clique na estrela do Qqorvex: conta os toques e, no 7º, gira a estrela e abre o resgate. */
type BrandTapHandler = (event: MouseEvent<HTMLElement>) => void;

const SecretRedeemContext = createContext<BrandTapHandler | null>(null);

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function spinStar(target: HTMLElement) {
  const star = target.querySelector("svg");
  if (!star || prefersReducedMotion() || typeof star.animate !== "function") return;
  star.animate(
    [
      { transform: "rotate(0deg) scale(1)", filter: "drop-shadow(0 0 0 rgba(217, 170, 90, 0))" },
      { transform: "rotate(200deg) scale(1.45)", filter: "drop-shadow(0 0 10px rgba(217, 170, 90, 0.95))", offset: 0.55 },
      { transform: "rotate(360deg) scale(1)", filter: "drop-shadow(0 0 0 rgba(217, 170, 90, 0))" },
    ],
    { duration: 900, easing: "cubic-bezier(.2,.8,.2,1)" },
  );
}

/**
 * Resgate de códigos Lifetime/Parceiro/Beta. Não aparece em nenhum menu de propósito: só quem
 * recebeu um código (e o segredo) chega aqui. A segurança não depende do segredo — os códigos são
 * únicos, de uso único e o servidor limita tentativas erradas.
 */
export function SecretRedeemProvider({ children }: { children: ReactNode }) {
  const taps = useRef(INITIAL_SECRET_TAPS);
  const [open, setOpen] = useState(false);

  const onBrandTap = useCallback<BrandTapHandler>((event) => {
    const result = registerSecretTap(taps.current, Date.now());
    taps.current = result.state;
    if (!result.unlocked) return;
    event.preventDefault();
    const target = event.currentTarget;
    spinStar(target);
    triggerHaptic("success");
    window.setTimeout(() => setOpen(true), prefersReducedMotion() ? 0 : 650);
  }, []);

  return (
    <SecretRedeemContext.Provider value={onBrandTap}>
      {children}
      {open && <SecretRedeemDialog onClose={() => setOpen(false)} />}
    </SecretRedeemContext.Provider>
  );
}

export function useSecretBrandTap(): BrandTapHandler | undefined {
  return useContext(SecretRedeemContext) ?? undefined;
}

const untilFormat = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });

function SecretRedeemDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const redeem = useRedeemCode(supabase);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<RedeemResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!code.trim() || redeem.isPending) return;
    setFailure(null);
    redeem.mutate(code, {
      onSuccess: (outcome) => {
        if (outcome.ok) {
          triggerHaptic("success");
          setResult(outcome);
        } else {
          triggerHaptic("error");
          setFailure(outcome.error);
        }
      },
      onError: (error) => setFailure(error instanceof Error && error.message ? error.message : "Não foi possível ativar o código agora."),
    });
  }

  if (result?.ok) {
    const isLifetime = result.tier === "lifetime";
    const success =
      isLifetime
        ? {
            icon: <InfinityIcon size={30} weight="bold" />,
            title: "Bem-vindo ao Lifetime",
            text: "Acesso ilimitado para sempre: nada de cotas em metas, hábitos, cadernos, mapas, Vex, buscas ou armazenamento. Você também recebe automaticamente as insígnias Amigo Lifetime e Beta Tester.",
            badge: true,
            badgeLabel: "Ver insígnias",
          }
        : result.tier === "parceiro"
          ? {
              icon: <HandshakeIcon size={30} weight="fill" />,
              title: "Você é Parceiro",
              text: `Acesso ilimitado durante a campanha${result.partnerCampaign ? ` “${result.partnerCampaign}”` : ""}${result.partnerUntil ? `, até ${untilFormat.format(new Date(result.partnerUntil))}` : ""}. Depois, sua conta volta ao plano que tinha, com tudo o que você criou.`,
              badge: false,
              badgeLabel: "Ver insígnia",
            }
          : {
              icon: <FlaskIcon size={30} weight="fill" />,
              title: "Você é Beta Tester",
              text: "Obrigado por testar o Qqorvex antes de todo mundo. A insígnia Beta Tester já é sua.",
              badge: true,
              badgeLabel: "Ver insígnia",
            };
    return (
      <Modal isOpen onClose={onClose} ariaLabel={isLifetime ? "Uma carta do Júlio para você" : success.title} size={isLifetime ? "md" : "sm"}>
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gold text-on-gold shadow-lg">{success.icon}</span>
          {isLifetime ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-fg">Uma carta do Júlio</p>
              <h2 className="font-display text-[24px] font-semibold text-fg">Bem-vindo ao Lifetime</h2>
              <article className="relative w-full overflow-hidden rounded-xl border border-[#d6b77f] bg-[#f5ead6] p-5 text-left shadow-lg sm:p-6">
                <span aria-hidden="true" className="absolute -right-5 -top-8 select-none font-display text-[120px] leading-none text-[#d6b77f]/15">✦</span>
                <div className="relative">
                  <p className="font-display text-[15px] font-semibold text-[#46351f]">Para você,</p>
                  <p className="mt-3 text-[14px] leading-relaxed text-[#46351f]">
                    Obrigado por me apoiar nessa jornada, espero que o app possa te ajudar, e acredite nos seus sonhos, lute por eles e que você tenha um futuro incrível,
                  </p>
                  <p className="mt-4 font-display text-[15px] font-semibold text-[#46351f]">- Abraços do Júlio</p>
                </div>
              </article>
              <p className="max-w-sm text-[12px] leading-relaxed text-fg-3">{success.text}</p>
            </>
          ) : (
            <>
              <h2 className="font-display text-[24px] font-semibold text-fg">{success.title}</h2>
              <p className="max-w-sm text-[13.5px] leading-relaxed text-fg-2">{success.text}</p>
            </>
          )}
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {success.badge && (
              <Button
                variant="secondary"
                onClick={() => {
                  onClose();
                  navigate("/conquistas");
                }}
              >
                {success.badgeLabel}
              </Button>
            )}
            <Button onClick={onClose}>Começar</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Você encontrou algo…"
      description="Se alguém do Qqorvex te passou um código de convite, ative aqui."
      icon={<SparkleIcon weight="fill" />}
      size="sm"
    >
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Input
          label="Código de convite"
          placeholder="QQ-XXXX-XXXX"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          autoFocus
          data-autofocus
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={32}
          className="font-mono tracking-[.08em]"
        />
        {failure && <Notice compact>{failure}</Notice>}
        <Button type="submit" className="self-end" loading={redeem.isPending} disabled={!code.trim()}>
          Ativar
        </Button>
      </form>
    </Modal>
  );
}
