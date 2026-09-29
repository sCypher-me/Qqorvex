import { useEffect, useRef, type ComponentType } from "react";
import { Link, NavLink, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowUpRightIcon, BellIcon, DatabaseIcon, LightningIcon, LinkIcon, PaletteIcon, ShieldCheckIcon, TrophyIcon, UserCircleIcon, type Icon } from "@phosphor-icons/react";
import { PageContainer, PageHeader, cx } from "@qqorvex/ui";
import { usePageMeta } from "../app/shell/PageMeta";
import { AppearanceSettings } from "../settings/AppearanceSettings";
import { ConnectionsSettings } from "../settings/ConnectionsSettings";
import { DataSettings } from "../settings/DataSettings";
import { NotificationSettings } from "../settings/NotificationSettings";
import { ProfileSettings } from "../settings/ProfileSettings";
import { SecuritySettings } from "../settings/SecuritySettings";

type SectionKey = "perfil" | "aparencia" | "notificacoes" | "seguranca" | "conexoes" | "dados";

const SECTIONS: Array<{ group: string; items: Array<{ key: SectionKey; label: string; icon: Icon; component: ComponentType }> }> = [
  {
    group: "Conta",
    items: [
      { key: "perfil", label: "Perfil", icon: UserCircleIcon, component: ProfileSettings },
      { key: "aparencia", label: "Aparência", icon: PaletteIcon, component: AppearanceSettings },
      { key: "notificacoes", label: "Notificações", icon: BellIcon, component: NotificationSettings },
    ],
  },
  {
    group: "Privacidade",
    items: [
      { key: "seguranca", label: "Segurança", icon: ShieldCheckIcon, component: SecuritySettings },
      { key: "conexoes", label: "Conexões", icon: LinkIcon, component: ConnectionsSettings },
      { key: "dados", label: "Seus dados", icon: DatabaseIcon, component: DataSettings },
    ],
  },
];
const ALL = SECTIONS.flatMap((group) => group.items);

/** `?aba=` dos links antigos de /perfil e /seguranca → seção nova. */
const LEGACY_TABS: Record<string, SectionKey> = {
  dados: "perfil",
  personalizacao: "aparencia",
  vitrine: "perfil",
  badges: "perfil",
  seguranca: "seguranca",
  conexoes: "conexoes",
};

const EXTERNAL = [
  { to: "/assinatura", label: "Plano e assinatura", icon: LightningIcon },
  { to: "/conquistas", label: "Conquistas", icon: TrophyIcon },
];

export function ConfiguracoesPage() {
  const { secao } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const legacy = params.get("aba");
  const current = ALL.find((item) => item.key === secao);
  const pillsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    pillsRef.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [secao]);
  usePageMeta({ title: current ? `${current.label} · Configurações` : "Configurações" });

  useEffect(() => {
    if (legacy && LEGACY_TABS[legacy]) navigate(`/configuracoes/${LEGACY_TABS[legacy]}`, { replace: true });
  }, [legacy, navigate]);

  if (!current) return <Navigate to="/configuracoes/perfil" replace />;
  const Section = current.component;

  return (
    <PageContainer>
      <PageHeader title="Configurações" description="Sua conta, a aparência do app, segurança e seus dados." />

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-10">
        <nav aria-label="Seções de configurações" className="min-w-0 lg:sticky lg:top-20">
          {/* Celular: uma linha rolável. */}
          <div ref={pillsRef} className="q-scroll-x -mx-4 flex gap-1.5 px-4 pb-1 lg:hidden">
            {ALL.map(({ key, label, icon: ItemIcon }) => (
              <NavLink
                key={key}
                to={`/configuracoes/${key}`}
                className={({ isActive }) => cx("inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium", isActive ? "border-gold-line bg-gold-soft text-gold-fg" : "border-line text-fg-2 hover:bg-hover")}
              >
                <ItemIcon size={15} />
                {label}
              </NavLink>
            ))}
          </div>

          {/* Desktop: lista agrupada. */}
          <div className="hidden flex-col gap-5 lg:flex">
            {SECTIONS.map((group) => (
              <div key={group.group} className="flex flex-col gap-0.5">
                <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-4">{group.group}</p>
                {group.items.map(({ key, label, icon: ItemIcon }) => (
                  <NavLink
                    key={key}
                    to={`/configuracoes/${key}`}
                    className={({ isActive }) => cx("flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] transition-colors", isActive ? "bg-selected font-medium text-fg" : "text-fg-2 hover:bg-hover hover:text-fg")}
                  >
                    {({ isActive }) => (
                      <>
                        <ItemIcon size={17} weight={isActive ? "fill" : "regular"} className={isActive ? "text-gold-fg" : "text-fg-3"} />
                        {label}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            ))}
            <div className="flex flex-col gap-0.5 border-t border-line-soft pt-4">
              {EXTERNAL.map(({ to, label, icon: ItemIcon }) => (
                <Link key={to} to={to} className="group flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] text-fg-2 hover:bg-hover hover:text-fg">
                  <ItemIcon size={17} className="text-fg-3" />
                  <span className="flex-1">{label}</span>
                  <ArrowUpRightIcon size={13} className="text-fg-4 opacity-0 group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </div>
        </nav>

        <div className="min-w-0">
          <Section />
        </div>
      </div>
    </PageContainer>
  );
}
