import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, EmptyState, Input, SectionTitle, Textarea } from "@qqorvex/ui";
import { useAuth, useProfile } from "@qqorvex/auth";
import { BadgesPanel, formatXp, useGamificationStats, useUnlockedBadges } from "@qqorvex/module-gamificacao";

const memberSinceFormat = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

function nameInitials(name: string): string {
  const words = name.trim().split(/[\s@._-]+/).filter(Boolean);
  const [first = "?", second] = words;
  if (second) return (first.charAt(0) + second.charAt(0)).toUpperCase();
  return first.slice(0, 2).toUpperCase();
}

/** Perfil: identidade + nível/badges (Gamification Core é a fonte, aqui só referencia) + formulário de perfil. */
export function PerfilPage() {
  const { client, session } = useAuth();
  const userId = session!.user.id;
  const email = session!.user.email ?? null;
  const { profile, isLoading: profileLoading, save: saveProfile } = useProfile(client, userId);
  const { stats, progress, title } = useGamificationStats(client, userId);
  const { badges, isLoading: badgesLoading } = useUnlockedBadges(client, userId);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setUsername(profile.username ?? "");
    setBio(profile.bio ?? "");
  }, [profile]);

  async function handleSaveProfile(event: FormEvent) {
    event.preventDefault();
    setProfileError(null);
    setProfileSaved(false);
    setProfileBusy(true);
    const { error: saveError } = await saveProfile({
      displayName: displayName.trim() || null,
      username: username.trim() || null,
      bio: bio.trim() || null,
    });
    setProfileBusy(false);
    if (saveError) {
      setProfileError(saveError);
      return;
    }
    setProfileSaved(true);
  }

  const shownName = profile?.display_name || profile?.username || email?.split("@")[0] || "Você";
  const unlockedCount = badges.filter((b) => b.isUnlockedForUser).length;
  const heroStats = stats
    ? [
        { value: formatXp(stats.xp), label: "XP total" },
        { value: formatXp(unlockedCount), label: "badges" },
        { value: formatXp(stats.tasks_completed), label: "tarefas concluídas" },
        { value: formatXp(stats.habit_or_goal_checkins), label: "check-ins" },
      ]
    : [];

  return (
    <div className="flex flex-col gap-5 max-w-[1040px]">
      <div className="relative overflow-hidden flex items-center gap-[22px] flex-wrap p-6 rounded-[20px] border border-[rgba(50,57,68,.9)] bg-[linear-gradient(120deg,rgba(67,185,210,.12),rgba(22,26,32,.96)_55%)] shadow-[inset_0_1px_0_rgba(255,255,255,.045),0_20px_44px_rgba(0,0,0,.32)]">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            className="w-[84px] h-[84px] rounded-full object-cover border border-border shrink-0"
          />
        ) : (
          <span
            aria-hidden
            className="w-[84px] h-[84px] rounded-full border border-border bg-surface-3 flex items-center justify-center font-display text-[28px] font-semibold text-text-primary shrink-0"
          >
            {nameInitials(shownName)}
          </span>
        )}
        <div className="flex-[1_1_240px] min-w-0 flex flex-col gap-[7px]">
          <span className="font-display text-[26px] font-semibold leading-tight">{shownName}</span>
          <span className="text-[13px] text-text-secondary">
            {email}
            {profile?.created_at && (
              <>
                {email ? " · " : ""}membro desde {memberSinceFormat.format(new Date(profile.created_at))}
              </>
            )}
          </span>
          {progress && (
            <div className="flex gap-2 flex-wrap pt-0.5">
              {title && <Badge tone="premium">{title}</Badge>}
              <Badge tone="info">
                Nível <span className="font-mono">{progress.level}</span>
              </Badge>
            </div>
          )}
        </div>
        {heroStats.length > 0 && (
          <div className="flex gap-[26px] flex-wrap">
            {heroStats.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-[3px]">
                <span className="font-mono text-2xl font-semibold leading-tight">{stat.value}</span>
                <span className="text-[11px] tracking-[.08em] uppercase text-text-muted">{stat.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <SectionTitle
          meta={badgesLoading ? undefined : `${unlockedCount} de ${badges.length} conquistados`}
          actions={
            <Link to="/gamificacao" className="qv-btn qv-btn-quiet qv-btn-sm">
              Ver gamificação
            </Link>
          }
        >
          Badges
        </SectionTitle>
        {badgesLoading ? <EmptyState>Carregando...</EmptyState> : <BadgesPanel badges={badges} stats={stats} />}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5 items-start">
        <section className="qv-card p-5 flex flex-col gap-3.5">
          <h2 className="font-display text-[17px] font-semibold">Perfil</h2>
          {profileLoading ? (
            <EmptyState>Carregando...</EmptyState>
          ) : (
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-3.5">
              <Input label="Nome de exibição" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              <Input
                label="Nome de usuário"
                hint="3–20 caracteres: letras minúsculas, números e _"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <Textarea label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={2} />
              <Button type="submit" variant="primary" className="self-start" disabled={profileBusy}>
                {profileBusy ? "Salvando..." : "Salvar perfil"}
              </Button>
              {profileError && <p className="text-[13px] text-error">{profileError}</p>}
              {profileSaved && !profileError && <p className="text-[13px] text-success">Perfil atualizado.</p>}
            </form>
          )}
        </section>

        <section className="qv-card p-5 flex flex-col gap-3">
          <h2 className="font-display text-[17px] font-semibold">Conta</h2>
          <p className="text-[13px] text-text-secondary leading-relaxed">
            Verificação em duas etapas, passkeys, sessões ativas, PIN do cofre, notificações e integrações ficam na
            Central de Segurança.
          </p>
          <div className="flex gap-2.5 flex-wrap">
            <Link to="/seguranca" className="qv-btn qv-btn-secondary">
              Segurança
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
