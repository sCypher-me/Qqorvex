import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CameraIcon } from "@phosphor-icons/react";
import { Button, ChipTabs, Input, Notice, Skeleton, SkeletonCards, Textarea } from "@qqorvex/ui";
import {
  useAuth,
  useProfile,
  normalizeBRPhone,
  isBRPhoneValid,
  formatE164ToBRInput,
  removeManagedProfileAvatar,
  uploadProfileAvatar,
} from "@qqorvex/auth";
import { PhoneField } from "../components/PhoneField";
import { SpecialBadgeArt, TitleBadge, useGamificationStats, useUnlockedBadges } from "@qqorvex/module-gamificacao";
import { LEVEL_THEMES, VIP_THEME, useTheme, type AppSkin } from "../app/ThemeContext";
import { hasPlusEntitlement } from "../billing/entitlements";
import { ThemeRewardCard } from "../components/ThemeRewardCard";
import { SecuritySettingsPanel } from "./Seguranca";

type ProfileSection = "dados" | "personalizacao" | "seguranca";

const PROFILE_SECTIONS: { value: ProfileSection; label: string }[] = [
  { value: "dados", label: "Dados" },
  { value: "personalizacao", label: "Personalização" },
  { value: "seguranca", label: "Segurança" },
];

function sectionFromQuery(value: string | null): ProfileSection {
  if (value === "personalizacao" || value === "vitrine" || value === "badges") return "personalizacao";
  if (value === "seguranca" || value === "conexoes") return "seguranca";
  return "dados";
}

function nameInitials(name: string): string {
  const words = name.trim().split(/[\s@._-]+/).filter(Boolean);
  const [first = "?", second] = words;
  if (second) return (first.charAt(0) + second.charAt(0)).toUpperCase();
  return first.slice(0, 2).toUpperCase();
}

/** Perfil em três áreas: dados pessoais, personalização e proteção da conta. */
export function PerfilPage() {
  const { client, session } = useAuth();
  const userId = session!.user.id;
  const email = session!.user.email ?? null;
  const { profile, isLoading: profileLoading, error: profileLoadError, refresh: refreshProfile, save: saveProfile } = useProfile(client, userId);
  const { progress, title } = useGamificationStats(client, userId);
  const { badges, isLoading: badgesLoading } = useUnlockedBadges(client, userId, profile?.role === "dono");
  const { skin, setSkin } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = sectionFromQuery(searchParams.get("aba"));
  const [activeSection, setActiveSection] = useState<ProfileSection>(requestedSection);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [selectedTitle, setSelectedTitle] = useState("");
  const [selectedBadgeKeys, setSelectedBadgeKeys] = useState<string[]>([]);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);
  const isOwner = profile?.role === "dono";
  const [hasPlus, setHasPlus] = useState(false);
  const [plusLoading, setPlusLoading] = useState(true);
  const [plusLoadError, setPlusLoadError] = useState(false);
  const [skinSaving, setSkinSaving] = useState(false);
  const [skinMessage, setSkinMessage] = useState<string | null>(null);

  useEffect(() => setActiveSection(requestedSection), [requestedSection]);

  function changeSection(section: ProfileSection) {
    setActiveSection(section);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (section === "dados") next.delete("aba");
      else next.set("aba", section);
      return next;
    }, { replace: true });
  }

  useEffect(() => {
    if (!profile || profileDirty) return;
    setDisplayName(profile.display_name ?? "");
    setUsername(profile.username ?? "");
    setPhone(profile.phone ? formatE164ToBRInput(profile.phone) : "");
    setBio(profile.bio ?? "");
    setSelectedTitle(profile.selected_title ?? title ?? "");
    const savedBadgeKeys = profile.selected_badge_keys ?? [];
    setSelectedBadgeKeys(profile.role === "dono"
      ? ["dono", ...savedBadgeKeys.filter((key) => key !== "dono").slice(0, 2)]
      : savedBadgeKeys.slice(0, 3));
    setProfileDirty(false);
  }, [profile, title, profileDirty]);

  useEffect(() => {
    let cancelled = false;
    async function refreshPlus() {
      if (profileLoading) return;
      if (isOwner) {
        setHasPlus(true);
        setPlusLoadError(false);
        setPlusLoading(false);
        return;
      }
      const { data, error } = await client.from("billing_subscriptions")
        .select("plan_key,status,current_period_end")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setPlusLoadError(true);
        setPlusLoading(false);
        return;
      }
      setHasPlus(hasPlusEntitlement(data));
      setPlusLoadError(false);
      setPlusLoading(false);
    }
    void refreshPlus();
    return () => { cancelled = true; };
  }, [client, isOwner, profileLoading, userId]);

  function markProfileDirty() {
    setProfileDirty(true);
    setProfileSaved(false);
    setProfileError(null);
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    setProfileError(null);
    setProfileSaved(false);
    setAvatarBusy(true);
    const previousUrl = profile?.avatar_url;

    try {
      const uploaded = await uploadProfileAvatar(client, userId, file);
      const { error: saveError } = await saveProfile({ avatarUrl: uploaded.url });
      if (saveError) {
        await removeManagedProfileAvatar(client, userId, uploaded.url).catch(() => undefined);
        setProfileError(saveError);
        return;
      }

      if (previousUrl && previousUrl !== uploaded.url) {
        await removeManagedProfileAvatar(client, userId, previousUrl).catch(() => undefined);
      }
      if (!profileDirty) setProfileSaved(true);
    } catch (caught) {
      setProfileError(caught instanceof Error ? caught.message : "Não foi possível atualizar a foto de perfil.");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleRemoveAvatar() {
    const previousUrl = profile?.avatar_url;
    if (!previousUrl || avatarBusy) return;

    setProfileError(null);
    setProfileSaved(false);
    setAvatarBusy(true);
    try {
      const { error: saveError } = await saveProfile({ avatarUrl: null });
      if (saveError) {
        setProfileError(saveError);
        return;
      }
      await removeManagedProfileAvatar(client, userId, previousUrl).catch(() => undefined);
      if (!profileDirty) setProfileSaved(true);
    } catch (caught) {
      setProfileError(caught instanceof Error ? caught.message : "Não foi possível remover a foto de perfil.");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleSaveProfile(event?: FormEvent) {
    event?.preventDefault();
    setProfileError(null);
    setProfileSaved(false);

    if (!isBRPhoneValid(phone)) {
      setProfileError("Telefone inválido.");
      return;
    }

    setProfileBusy(true);
    const { error: saveError } = await saveProfile({
      fullName: profile?.full_name || displayName.trim() || email?.split("@")[0] || "Qqorvex",
      displayName: displayName.trim() || null,
      username: username.trim() || null,
      phone: normalizeBRPhone(phone),
      bio: bio.trim() || null,
      selectedTitle: selectedTitle || null,
      selectedBadgeKeys,
    });
    setProfileBusy(false);
    if (saveError) {
      setProfileError(saveError);
      return;
    }
    setProfileDirty(false);
    setProfileSaved(true);
  }

  async function handleChooseSkin(nextSkin: AppSkin) {
    const reward = LEVEL_THEMES.find((item) => item.id === nextSkin);
    if ((reward && (progress?.level ?? 1) < reward.level) || (nextSkin === VIP_THEME.id && (!hasPlus || plusLoadError)) || skinSaving || nextSkin === skin) return;

    setSkinMessage(null);
    setSkin(nextSkin);
    setSkinSaving(true);
    const preferences = session!.user.user_metadata.qqorvex_preferences;
    const savedPreferences = preferences && typeof preferences === "object"
      ? preferences as Record<string, unknown>
      : {};
    try {
      const { error } = await client.auth.updateUser({
        data: { qqorvex_preferences: { ...savedPreferences, skin: nextSkin } },
      });
      if (error) setSkinMessage("O tema foi aplicado neste dispositivo, mas não sincronizou com sua conta. Tente novamente quando estiver online.");
    } catch {
      setSkinMessage("O tema foi aplicado neste dispositivo, mas não sincronizou com sua conta. Tente novamente quando estiver online.");
    } finally {
      setSkinSaving(false);
    }
  }

  useEffect(() => {
    if (profileLoading || plusLoading || plusLoadError || hasPlus || skin !== VIP_THEME.id) return;
    setSkin("default");
    const preferences = session!.user.user_metadata.qqorvex_preferences;
    const savedPreferences = preferences && typeof preferences === "object"
      ? preferences as Record<string, unknown>
      : {};
    void client.auth.updateUser({ data: { qqorvex_preferences: { ...savedPreferences, skin: "default" } } });
  }, [client, hasPlus, plusLoadError, plusLoading, profileLoading, session, setSkin, skin]);

  const shownName = profile?.display_name || profile?.username || email?.split("@")[0] || "Você";
  const draftName = displayName.trim() || shownName;
  const draftTitle = selectedTitle || title || "Iniciante";
  const unlockedBadges = badges.filter((badge) => badge.isUnlockedForUser);
  const availableTitles = Array.from(new Set([title, "Iniciante", ...unlockedBadges.map((badge) => badge.title)].filter((value): value is string => Boolean(value))));
  const themeOptions = [...LEVEL_THEMES, VIP_THEME];

  return (
    <div className="qv-page editorial-profile-page mx-auto flex w-full max-w-[1320px] flex-col gap-5 pb-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="qv-eyebrow">Conta pessoal</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-[-.04em] text-text-primary">Perfil</h1>
          <p className="mt-1 text-sm text-text-secondary">Seus dados, sua identidade visual e a proteção da conta.</p>
        </div>
        <Link to="/assinatura" className="qv-btn qv-btn-secondary shrink-0">Planos e assinatura</Link>
      </header>

      <div className="-mx-1 overflow-x-auto border-b border-border px-1" aria-label="Seções do perfil">
        <ChipTabs options={PROFILE_SECTIONS} value={activeSection} onChange={changeSection} className="min-w-max flex-nowrap" />
      </div>

      {profileError && <Notice tone="error" title="Não foi possível salvar o perfil">{profileError}</Notice>}
      {profileSaved && !profileError && <Notice tone="success" title="Perfil atualizado">Suas alterações já aparecem no painel Hoje.</Notice>}

      {profileLoadError ? (
        <Notice tone="error" title="Não foi possível carregar seus dados" actions={<Button type="button" variant="secondary" size="sm" onClick={() => void refreshProfile()}>Tentar novamente</Button>}>
          Nenhuma alteração foi feita. Verifique sua conexão e tente carregar o perfil novamente.
        </Notice>
      ) : profileLoading ? (
        <div role="status" aria-label="Carregando perfil" className="grid gap-4 lg:grid-cols-2">
          <SkeletonCards count={4} className="h-12 w-full rounded-xl" />
          <SkeletonCards count={4} className="h-12 w-full rounded-xl" />
        </div>
      ) : (
        <>
          {activeSection === "dados" && (
            <form onSubmit={handleSaveProfile} className="qv-card flex min-w-0 flex-col gap-5 p-5 sm:p-6">
              <div>
                <p className="qv-eyebrow">Seus dados</p>
                <h2 className="mt-1 font-display text-xl font-semibold text-text-primary">Informações do perfil</h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">Atualize como as pessoas encontram e reconhecem você no Qqorvex.</p>
              </div>
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <Input label="Nome de exibição" value={displayName} onChange={(event) => { setDisplayName(event.target.value); markProfileDirty(); }} placeholder="Como você quer ser chamado" autoComplete="name" />
                <Input
                  label="Usuário"
                  hint="3–20 caracteres: letras minúsculas, números e _"
                  value={username}
                  onChange={(event) => { setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")); markProfileDirty(); }}
                  autoComplete="username"
                  placeholder="seu_usuario"
                />
              </div>
              <PhoneField value={phone} onChange={(value) => { setPhone(value); markProfileDirty(); }} />
              <Textarea
                label="Bio"
                hint={`${bio.length}/180 caracteres`}
                value={bio}
                onChange={(event) => { setBio(event.target.value.slice(0, 180)); markProfileDirty(); }}
                rows={4}
                maxLength={180}
                placeholder="Conte um pouco sobre você..."
              />
            </form>
          )}

          {activeSection === "personalizacao" && (
            <div className="flex min-w-0 flex-col gap-5">
              <section className="qv-card flex flex-wrap items-center gap-4 p-5 sm:p-6" aria-labelledby="profile-avatar-title">
                <div className="relative h-16 w-16 shrink-0">
                  {profile?.avatar_url ? <img src={profile.avatar_url} alt="Foto atual do perfil" className="h-16 w-16 rounded-full border border-vex-cyan-dark object-cover" /> : <span aria-hidden className="grid h-16 w-16 place-items-center rounded-full border border-vex-cyan-dark bg-surface-3 font-display text-xl font-semibold">{nameInitials(draftName)}</span>}
                  <label htmlFor="profile-avatar-file" title="Trocar foto de perfil" className={`absolute -bottom-1 -right-1 grid h-7 w-7 cursor-pointer place-items-center rounded-full border border-vex-cyan-dark bg-surface-2 text-vex-cyan-bright shadow-lg hover:bg-surface-3 focus-within:ring-2 focus-within:ring-vex-cyan/30 ${avatarBusy ? "pointer-events-none opacity-60" : ""}`}>
                    <CameraIcon size={15} aria-hidden="true" />
                    <span className="sr-only">Trocar foto de perfil</span>
                  </label>
                  <input id="profile-avatar-file" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={avatarBusy} onChange={handleAvatarChange} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="qv-eyebrow">Sua identidade visual</p>
                  <h2 id="profile-avatar-title" className="mt-1 font-display text-lg font-semibold text-text-primary">Foto de perfil</h2>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">A imagem aparece junto ao seu nome na prévia e em áreas do app.</p>
                </div>
                {profile?.avatar_url && <Button type="button" variant="quiet" size="sm" disabled={avatarBusy} onClick={() => void handleRemoveAvatar()}>Remover foto</Button>}
                {avatarBusy && <span role="status" className="text-xs text-text-muted">Atualizando…</span>}
              </section>

              <section className="flex min-w-0 flex-col gap-3.5" aria-labelledby="profile-themes-title">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="qv-eyebrow">Aparência do aplicativo</p>
                    <h2 id="profile-themes-title" className="mt-1 font-display text-xl font-semibold text-text-primary">Tema do app</h2>
                    <p className="mt-1 text-sm text-text-secondary">Temas de jornada são liberados por nível; o tema Coroa Vex acompanha o Plus.</p>
                  </div>
                  <Button type="button" variant="secondary" size="sm" disabled={skinSaving || skin === "default"} onClick={() => void handleChooseSkin("default")}>{skin === "default" ? "Tema original ativo" : "Restaurar original"}</Button>
                </div>
                {plusLoadError && <Notice tone="warning" title="Não foi possível confirmar o Plus">O tema VIP permanece bloqueado até a assinatura ser validada.</Notice>}
                {skinMessage && <Notice tone="info" title="Tema aplicado">{skinMessage}</Notice>}
                <div className="qv-level-themes-grid">
                  {themeOptions.map((theme) => {
                    const isVip = theme.id === VIP_THEME.id;
                    const requiredLevel = isVip ? null : theme.level;
                    const unlocked = isVip ? hasPlus : (progress?.level ?? 1) >= requiredLevel!;
                    return (
                      <ThemeRewardCard
                        key={theme.id}
                        theme={theme}
                        requirement={isVip ? "EXCLUSIVO · QQRVEX PLUS" : `RECOMPENSA · NÍVEL ${requiredLevel}`}
                        unlocked={unlocked}
                        active={skin === theme.id}
                        busy={skinSaving}
                        checking={isVip && plusLoading}
                        lockedMessage={isVip ? "Exclusivo para assinantes Plus" : `Desbloqueie no nível ${requiredLevel}`}
                        onChoose={handleChooseSkin}
                      />
                    );
                  })}
                </div>
              </section>

              <form onSubmit={handleSaveProfile} className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,.9fr)]">
                <section className="qv-card flex min-w-0 flex-col gap-5 p-5 sm:p-6" aria-labelledby="profile-showcase-title">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="qv-eyebrow">Conquistas que representam você</p>
                      <h2 id="profile-showcase-title" className="mt-1 font-display text-xl font-semibold text-text-primary">Títulos e badges</h2>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">Escolha um título e até três insígnias conquistadas para sua vitrine.</p>
                    </div>
                    <span className="rounded-full border border-vex-gold-muted bg-chip-gold px-3 py-1 font-mono text-xs text-vex-gold-bright">{selectedBadgeKeys.length} / 3</span>
                  </div>

                  <label className="flex min-w-0 flex-col gap-2 text-xs font-medium text-text-secondary">
                    Título em destaque
                    <select value={selectedTitle} onChange={(event) => { setSelectedTitle(event.target.value); markProfileDirty(); }} className="qv-field h-11">
                      {availableTitles.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </label>

                  <div>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="text-xs font-medium text-text-secondary">Badges conquistados</span>
                      <span className="text-[11px] text-text-muted">Selecione até 3</span>
                    </div>
                    {badgesLoading ? (
                      <div role="status" aria-label="Carregando badges" className="grid gap-2 sm:grid-cols-2"><SkeletonCards count={4} className="h-16 w-full rounded-xl" /></div>
                    ) : unlockedBadges.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border bg-surface-1/60 px-4 py-5 text-sm leading-relaxed text-text-muted">Conquiste seu primeiro marco para liberar badges nesta vitrine.</div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {unlockedBadges.map((badge) => {
                          const selected = selectedBadgeKeys.includes(badge.key);
                          const ownerBadgePinned = profile?.role === "dono" && badge.key === "dono";
                          const disabled = !ownerBadgePinned && !selected && selectedBadgeKeys.length >= 3;
                          return (
                            <button
                              key={badge.key}
                              type="button"
                              disabled={disabled}
                              aria-pressed={selected}
                              aria-label={ownerBadgePinned ? "Badge Dono, fixado na vitrine da conta do proprietário" : undefined}
                              title={ownerBadgePinned ? "Badge exclusivo da conta do proprietário" : undefined}
                              onClick={() => {
                                if (ownerBadgePinned) return;
                                setSelectedBadgeKeys((current) => selected ? current.filter((key) => key !== badge.key) : [...current, badge.key]);
                                markProfileDirty();
                              }}
                              className={`flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vex-gold-bright disabled:cursor-not-allowed disabled:opacity-40 ${selected ? "border-vex-gold-muted bg-chip-gold" : "border-border bg-surface-1 hover:border-vex-cyan-dark"}`}
                            >
                              <span className="grid h-14 w-14 shrink-0 place-items-center"><SpecialBadgeArt badge={badge} className="h-14 w-14" /></span>
                              <span className={`min-w-0 flex-1 truncate text-xs font-medium ${selected ? "text-vex-gold-bright" : "text-text-secondary"}`}>{badge.label}</span>
                              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px] ${selected ? "border-vex-gold-bright text-vex-gold-bright" : "border-border text-transparent"}`} aria-hidden>✓</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </section>

                <aside className="qv-card flex min-w-0 flex-col gap-4 p-5 sm:p-6" aria-labelledby="profile-preview-title">
                  <div>
                    <p className="qv-eyebrow">Prévia do perfil</p>
                    <h2 id="profile-preview-title" className="mt-1 font-display text-lg font-semibold text-text-primary">Assim as pessoas verão você</h2>
                  </div>
                  <div className="qv-well profile-preview-card flex min-w-0 items-start gap-3.5 p-4">
                    {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-14 w-14 shrink-0 rounded-full border border-vex-cyan-dark object-cover" /> : <span aria-hidden className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-vex-cyan-dark bg-surface-3 font-display font-semibold">{nameInitials(draftName)}</span>}
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold text-text-primary">{draftName}</p>
                      <p className="mt-0.5 truncate text-xs text-text-muted">@{username || "seu_usuario"}</p>
                      <TitleBadge title={draftTitle} size="md" className="mt-2" />
                    </div>
                    <div className="profile-preview-badge-card" aria-label="Badges que aparecem no seu perfil">
                      <span>VITRINE</span>
                      {selectedBadgeKeys.length > 0 ? <div className="profile-preview-badge-list">{selectedBadgeKeys.slice(0, 3).map((key) => {
                        const badge = unlockedBadges.find((item) => item.key === key);
                        return badge ? <span key={key} title={badge.label}><SpecialBadgeArt badge={badge} className="h-[22px] w-[22px]" /></span> : null;
                      })}</div> : <small>Escolha até 3</small>}
                    </div>
                  </div>
                  <p className="mt-auto text-xs leading-relaxed text-text-muted">A prévia acompanha suas escolhas e aparece no painel após salvar.</p>
                </aside>
              </form>
            </div>
          )}

          {activeSection === "seguranca" && <SecuritySettingsPanel embedded />}
        </>
      )}

      {profileDirty && (
        <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-vex-cyan-dark bg-surface-2/95 p-3 shadow-xl backdrop-blur sm:px-5">
          <p className="text-xs text-text-secondary">Você tem alterações de perfil não salvas.</p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="quiet" size="sm" onClick={() => {
              if (!profile) return;
              setDisplayName(profile.display_name ?? "");
              setUsername(profile.username ?? "");
              setPhone(profile.phone ? formatE164ToBRInput(profile.phone) : "");
              setBio(profile.bio ?? "");
              setSelectedTitle(profile.selected_title ?? title ?? "");
              const savedBadgeKeys = profile.selected_badge_keys ?? [];
              setSelectedBadgeKeys(profile.role === "dono"
                ? ["dono", ...savedBadgeKeys.filter((key) => key !== "dono").slice(0, 2)]
                : savedBadgeKeys.slice(0, 3));
              setProfileDirty(false);
              setProfileError(null);
            }}>Descartar</Button>
            <Button type="button" variant="primary" disabled={profileBusy} onClick={() => void handleSaveProfile()}>{profileBusy ? "Salvando…" : "Salvar perfil"}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
