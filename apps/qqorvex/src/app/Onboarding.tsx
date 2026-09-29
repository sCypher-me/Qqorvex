import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenTextIcon,
  CameraIcon,
  CheckCircleIcon,
  CompassIcon,
  CrownIcon,
  HouseIcon,
  MoonIcon,
  SparkleIcon,
  SunIcon,
  TargetIcon,
} from "@phosphor-icons/react";
import { Button, Notice } from "@qqorvex/ui";
import {
  removeManagedProfileAvatar,
  uploadProfileAvatar,
  useAuth,
  useProfile,
} from "@qqorvex/auth";
import { BILLING_PLANS } from "../billing/plans";
import { useTheme, type AppTheme } from "./ThemeContext";

type FocusArea = "routine" | "organization" | "study" | "personal";

const STEPS = ["Boas-vindas", "Preferências", "Seu perfil", "Planos"] as const;

const FOCUS_OPTIONS: { value: FocusArea; label: string; description: string; path: string }[] = [
  { value: "routine", label: "Ter clareza do meu dia", description: "Começar pela visão Hoje", path: "/" },
  { value: "organization", label: "Organizar tarefas e compromissos", description: "Abrir tarefas e agenda", path: "/tarefas" },
  { value: "study", label: "Aprender e guardar ideias", description: "Começar pelos Estudos", path: "/estudos" },
  { value: "personal", label: "Cuidar da vida pessoal", description: "Abrir Vida Pessoal", path: "/vida-pessoal" },
];

const PLAN_PRICE = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function Onboarding({ onComplete }: { onComplete: (path: string) => void }) {
  const { client, session } = useAuth();
  const userId = session!.user.id;
  const { profile, save } = useProfile(client, userId);
  const { theme, setTheme } = useTheme();
  const [step, setStep] = useState(0);
  const [focusArea, setFocusArea] = useState<FocusArea>("routine");
  const [selectedTheme, setSelectedTheme] = useState<AppTheme>(theme);
  const themeWasSelected = useRef(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url ?? null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedFocus = FOCUS_OPTIONS.find((option) => option.value === focusArea) ?? FOCUS_OPTIONS[0]!;
  const currentAvatar = avatarPreview ?? profile?.avatar_url ?? null;

  useEffect(() => {
    if (!themeWasSelected.current) setSelectedTheme(theme);
  }, [theme]);

  function chooseTheme(value: AppTheme) {
    themeWasSelected.current = true;
    setSelectedTheme(value);
    setTheme(value);
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    setError(null);
    setAvatarBusy(true);
    const previousUrl = profile?.avatar_url;
    try {
      const uploaded = await uploadProfileAvatar(client, userId, file);
      const { error: saveError } = await save({ avatarUrl: uploaded.url });
      if (saveError) {
        await removeManagedProfileAvatar(client, userId, uploaded.url).catch(() => undefined);
        setError(saveError);
        return;
      }
      if (previousUrl && previousUrl !== uploaded.url) {
        await removeManagedProfileAvatar(client, userId, previousUrl).catch(() => undefined);
      }
      setAvatarPreview(uploaded.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível atualizar sua foto agora.");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function finish(path: string) {
    if (saving) return;
    setError(null);
    setSaving(true);
    try {
      const { error: saveError } = await client.auth.updateUser({
        data: {
          qqorvex_onboarding_pending: false,
          qqorvex_onboarding_completed: true,
          qqorvex_onboarding_completed_at: new Date().toISOString(),
          qqorvex_preferences: {
            focus_area: focusArea,
            theme: selectedTheme,
          },
        },
      });
      if (saveError) {
        setError("Não consegui salvar a configuração da sua conta. Confira sua conexão e tente novamente.");
        return;
      }
      onComplete(path);
    } catch {
      setError("Não consegui salvar a configuração da sua conta. Confira sua conexão e tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  function next() {
    setError(null);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function previous() {
    setError(null);
    setStep((current) => Math.max(current - 1, 0));
  }

  const displayName = profile?.display_name
    || profile?.full_name
    || String(session!.user.user_metadata.full_name ?? session!.user.user_metadata.display_name ?? "").trim()
    || session!.user.email?.split("@")[0]
    || "Seu perfil";
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "Q";

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-background text-text-primary">
      <div aria-hidden="true" className="pointer-events-none absolute -left-36 -top-36 h-[420px] w-[420px] rounded-full bg-vex-cyan/10 blur-[110px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 right-[-100px] h-[440px] w-[440px] rounded-full bg-vex-gold/8 blur-[120px]" />

      <header className="relative z-10 flex items-center justify-between border-b border-border px-5 py-4 sm:px-8 lg:px-12">
        <div className="flex min-w-0 items-center gap-3">
          <img src="/brand/wordmark.png" alt="Qqorvex" className="h-7 w-auto" />
          <span className="hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
          <span className="hidden text-xs text-text-muted sm:block">Seu começo, do seu jeito</span>
        </div>
        <button
          type="button"
          onClick={() => void finish(selectedFocus.path)}
          disabled={saving || avatarBusy}
          className="rounded-lg px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-chip-neutral hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-50"
        >
          Pular por enquanto
        </button>
      </header>

      <div className="relative z-10 mx-auto grid min-h-[calc(100dvh-65px)] w-full max-w-[1240px] grid-cols-1 lg:grid-cols-[minmax(260px,.72fr)_minmax(0,1.28fr)] lg:items-center lg:gap-12 lg:px-10 lg:py-10">
        <aside className="hidden self-stretch py-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="qv-eyebrow text-vex-cyan-bright">PRIMEIROS PASSOS</p>
            <h1 className="mt-4 max-w-sm font-display text-4xl font-semibold leading-[1.08] tracking-[-.045em]">
              Uma vida em progresso começa com um passo.
            </h1>
            <p className="mt-4 max-w-sm text-[15px] leading-7 text-text-secondary">
              Vamos preparar seu espaço para que você encontre o que precisa e comece no seu ritmo.
            </p>
          </div>

          <ol className="flex flex-col gap-2" aria-label="Etapas do onboarding">
            {STEPS.map((label, index) => (
              <li key={label} aria-current={index === step ? "step" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-3 transition-colors ${index === step ? "bg-surface-2 text-text-primary" : index < step ? "text-text-secondary" : "text-text-muted"}`}>
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-mono ${index < step ? "border-vex-cyan-dark bg-chip-cyan text-vex-cyan-bright" : index === step ? "border-vex-cyan-bright text-vex-cyan-bright" : "border-border"}`}>
                  {index < step ? <CheckCircleIcon size={16} weight="fill" /> : String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-sm font-medium">{label}</span>
              </li>
            ))}
          </ol>

          <p className="max-w-xs text-xs leading-5 text-text-muted">Leva só alguns instantes. Você pode alterar suas escolhas depois.</p>
        </aside>

        <section className="min-w-0 px-4 py-6 sm:px-8 sm:py-9 lg:px-0 lg:py-0" aria-labelledby="onboarding-title">
          <div className="mx-auto max-w-[720px]">
            <div className="mb-5 flex items-center justify-between gap-3 lg:hidden">
              <span className="qv-eyebrow">ETAPA {step + 1} DE {STEPS.length}</span>
              <div className="flex gap-1.5" aria-hidden="true">
                {STEPS.map((label, index) => <span key={label} className={`h-1.5 w-7 rounded-full transition-colors ${index <= step ? "bg-vex-cyan-bright" : "bg-surface-3"}`} />)}
              </div>
            </div>

            <div className="rounded-[24px] border border-border bg-surface-1/95 p-5 shadow-[0_24px_90px_rgba(0,0,0,.16)] sm:p-8 lg:p-10">
              {error && <Notice tone="error" title="Um instante">{error}</Notice>}

              {step === 0 && (
                <div className="animate-[qv-onboarding-in_.28s_ease-out]">
                  <p className="qv-eyebrow text-vex-cyan-bright">BEM-VINDO AO QQORVEX</p>
                  <h2 id="onboarding-title" className="mt-3 max-w-xl font-display text-3xl font-semibold leading-tight tracking-[-.04em] sm:text-[40px]">
                    Mais clareza para o que importa.
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-text-secondary sm:text-[15px]">
                    Organize sua rotina, aprenda, cuide dos seus projetos e acompanhe seu progresso em um só lugar.
                  </p>

                  <div className="mt-8 grid gap-x-8 sm:grid-cols-2">
                    <Feature icon={<HouseIcon size={19} />} title="Organize sua rotina" description="Hoje, tarefas, agenda, metas e hábitos trabalham juntos." />
                    <Feature icon={<BookOpenTextIcon size={19} />} title="Aprenda e registre" description="Cadernos, mapas mentais, biblioteca e segundo cérebro." />
                    <Feature icon={<CompassIcon size={19} />} title="Cuide da sua vida" description="Finanças, documentos, vida pessoal e conquistas." />
                    <Feature icon={<SparkleIcon size={19} />} title="Converse com a Vex" description="Uma assistente de texto para consultar e organizar seu app." />
                  </div>

                  <div className="mt-7 flex items-center gap-3 border-t border-border pt-5 text-xs leading-5 text-text-muted">
                    <CheckCircleIcon size={18} weight="fill" className="shrink-0 text-success" />
                    <span>Todos os módulos ficam disponíveis no plano Free. Você não precisa assinar para começar.</span>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="animate-[qv-onboarding-in_.28s_ease-out]">
                  <p className="qv-eyebrow text-vex-cyan-bright">PREFERÊNCIAS</p>
                  <h2 id="onboarding-title" className="mt-3 font-display text-3xl font-semibold tracking-[-.04em] sm:text-4xl">Como você quer começar?</h2>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">Escolha uma área para abrir primeiro e o tema que fica mais confortável para você.</p>

                  <fieldset className="mt-7">
                    <legend className="mb-3 text-sm font-semibold">Por onde começar?</legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {FOCUS_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={focusArea === option.value}
                          onClick={() => setFocusArea(option.value)}
                          className={`flex min-h-[82px] items-start gap-3 rounded-xl border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${focusArea === option.value ? "border-vex-cyan-dark bg-chip-cyan" : "border-border bg-surface-0 hover:bg-surface-2"}`}
                        >
                          <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${focusArea === option.value ? "border-vex-cyan-bright text-vex-cyan-bright" : "border-text-muted text-transparent"}`}>
                            {focusArea === option.value && <span className="h-2 w-2 rounded-full bg-vex-cyan-bright" />}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-text-primary">{option.label}</span>
                            <span className="mt-1 block text-xs text-text-muted">{option.description}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="mt-7">
                    <legend className="mb-3 text-sm font-semibold">Aparência</legend>
                    <div className="grid grid-cols-2 gap-3">
                      <ThemeChoice icon={<MoonIcon size={19} />} label="Escuro" selected={selectedTheme === "dark"} onClick={() => chooseTheme("dark")} />
                      <ThemeChoice icon={<SunIcon size={19} />} label="Claro" selected={selectedTheme === "light"} onClick={() => chooseTheme("light")} />
                    </div>
                  </fieldset>
                </div>
              )}

              {step === 2 && (
                <div className="animate-[qv-onboarding-in_.28s_ease-out]">
                  <p className="qv-eyebrow text-vex-cyan-bright">SEU PERFIL</p>
                  <h2 id="onboarding-title" className="mt-3 font-display text-3xl font-semibold tracking-[-.04em] sm:text-4xl">Vamos colocar seu rosto no seu espaço?</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-text-secondary">Uma foto ajuda a reconhecer seu perfil no app. Ela é opcional e você pode trocar ou remover quando quiser.</p>

                  <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface-0 px-5 py-8 text-center sm:py-10">
                    <div className="relative grid h-28 w-28 place-items-center overflow-hidden rounded-full border border-vex-cyan-dark bg-surface-2 shadow-[0_0_34px_rgba(74,200,216,.12)]">
                      {currentAvatar ? <img src={currentAvatar} alt={`Foto de perfil de ${displayName}`} className="h-full w-full object-cover" /> : <span className="font-display text-3xl font-semibold text-text-secondary">{initials}</span>}
                      <span className="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full border-2 border-surface-1 bg-vex-cyan-dark text-text-primary"><CameraIcon size={17} /></span>
                    </div>
                    <p className="mt-4 text-sm font-semibold">{currentAvatar ? "Sua foto está pronta" : displayName}</p>
                    <p className="mt-1 text-xs text-text-muted">JPG, PNG ou WebP · até 5 MB</p>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={avatarBusy || saving} onChange={handleAvatarChange} />
                    <Button type="button" variant="secondary" className="mt-5" disabled={avatarBusy || saving} onClick={() => fileInputRef.current?.click()}>
                      <CameraIcon size={17} />
                      {avatarBusy ? "Enviando foto…" : currentAvatar ? "Trocar foto" : "Adicionar foto"}
                    </Button>
                  </div>
                  <p className="mt-4 text-center text-xs text-text-muted">Sem foto por enquanto? Tudo bem — seu perfil já está criado.</p>
                </div>
              )}

              {step === 3 && (
                <div className="animate-[qv-onboarding-in_.28s_ease-out]">
                  <p className="qv-eyebrow text-vex-gold-bright">PLANOS, SEM PRESSA</p>
                  <h2 id="onboarding-title" className="mt-3 font-display text-3xl font-semibold tracking-[-.04em] sm:text-4xl">Comece grátis. Evolua quando fizer sentido.</h2>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">Você começa no Free com acesso a todos os módulos. A assinatura é opcional e pode ser decidida depois.</p>

                  <div className="mt-7 grid gap-3 sm:grid-cols-2">
                    <PlanSummary
                      name="Free"
                      price="Grátis"
                      description="Um começo completo, sem cartão."
                      selected
                      items={[
                        "Todos os módulos do app",
                        `${BILLING_PLANS.free.goals} metas e ${BILLING_PLANS.free.habits} hábitos ativos`,
                        `${BILLING_PLANS.free.notebooks} cadernos e ${BILLING_PLANS.free.mindMaps} mapas mentais`,
                        `${BILLING_PLANS.free.vexInteractions} interações de texto com a Vex/mês`,
                        `${BILLING_PLANS.free.webSearches} buscas web/mês`,
                        "25 MB na nuvem · arquivos de até 10 MB",
                      ]}
                    />
                    <PlanSummary
                      name="Qqorvex Plus"
                      price={`${PLAN_PRICE.format(BILLING_PLANS.plus.monthlyPrice)}/mês`}
                      description={`${PLAN_PRICE.format(BILLING_PLANS.plus.annualPrice)}/ano · 10% de desconto`}
                      items={[
                        "Metas, hábitos, cadernos e mapas ilimitados",
                        `${BILLING_PLANS.plus.vexInteractions} interações de texto com a Vex/mês`,
                        `${BILLING_PLANS.plus.webSearches} buscas web/mês`,
                        "100 MB na nuvem · arquivos de até 50 MB",
                      ]}
                    />
                  </div>

                  <div className="mt-5 flex items-start gap-3 rounded-xl bg-surface-0 px-4 py-3 text-xs leading-5 text-text-muted">
                    <CrownIcon size={17} className="mt-0.5 shrink-0 text-vex-gold-bright" />
                    <p>Não há pagamento nesta etapa. Quando quiser, compare os detalhes em Planos e assinatura — seus dados continuam seus em qualquer plano.</p>
                  </div>
                </div>
              )}

              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {step > 0 && <Button type="button" variant="quiet" disabled={saving || avatarBusy} onClick={previous}><ArrowLeftIcon size={17} /> Voltar</Button>}
                </div>
                {step < STEPS.length - 1 ? (
                  <Button type="button" variant="primary" disabled={saving || avatarBusy} onClick={next}>
                    Continuar <ArrowRightIcon size={17} />
                  </Button>
                ) : (
                  <Button type="button" variant="primary" disabled={saving || avatarBusy} onClick={() => void finish(selectedFocus.path)}>
                    {saving ? "Preparando seu espaço…" : "Concluir e entrar"} {!saving && <ArrowRightIcon size={17} />}
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-text-muted lg:justify-end">
              <TargetIcon size={14} />
              <span>Etapa {step + 1} de {STEPS.length} · tema e foto podem ser alterados depois</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Feature({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="flex gap-3 border-b border-border py-4 first:pt-0">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-surface-0 text-vex-cyan-bright">{icon}</span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-text-muted">{description}</span>
      </span>
    </div>
  );
}

function ThemeChoice({ icon, label, selected, onClick }: { icon: ReactNode; label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${selected ? "border-vex-cyan-dark bg-chip-cyan text-text-primary" : "border-border bg-surface-0 text-text-secondary hover:bg-surface-2"}`}>
      <span className="text-vex-cyan-bright">{icon}</span>{label}
      <span className={`ml-auto h-4 w-4 rounded-full border ${selected ? "border-vex-cyan-bright bg-vex-cyan-bright shadow-[inset_0_0_0_3px_var(--qv-surface-workspace)]" : "border-text-muted"}`} />
    </button>
  );
}

function PlanSummary({ name, price, description, items, selected = false }: { name: string; price: string; description: string; items: string[]; selected?: boolean }) {
  return (
    <article className={`min-w-0 rounded-2xl border p-4 ${selected ? "border-vex-cyan-dark bg-chip-cyan/40" : "border-border bg-surface-0"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{name}</h3>
          <p className="mt-1 font-display text-xl font-semibold tracking-[-.03em]">{price}</p>
        </div>
        {selected ? <span className="rounded-full border border-vex-cyan-dark px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-vex-cyan-bright">Seu início</span> : <SparkleIcon size={18} className="text-vex-gold-bright" />}
      </div>
      <p className="mt-1 text-xs text-text-muted">{description}</p>
      <ul className="mt-4 flex flex-col gap-2.5">
        {items.map((item) => <li key={item} className="flex gap-2 text-xs leading-5 text-text-secondary"><CheckCircleIcon size={15} weight="fill" className="mt-0.5 shrink-0 text-success" />{item}</li>)}
      </ul>
    </article>
  );
}
