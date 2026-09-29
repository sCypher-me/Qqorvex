import { useEffect, useState, type ChangeEvent } from "react";
import { CameraIcon, CheckCircleIcon, CheckIcon, TrashIcon, WarningCircleIcon } from "@phosphor-icons/react";
import {
  formatE164ToBRInput,
  isBRPhoneValid,
  normalizeBRPhone,
  removeManagedProfileAvatar,
  uploadProfileAvatar,
  useAuth,
  useProfile,
  useUsernameAvailability,
} from "@qqorvex/auth";
import { SpecialBadgeArt, TitleBadge, useGamificationStats, useUnlockedBadges } from "@qqorvex/module-gamificacao";
import { Avatar, Button, Input, Notice, ProgressBar, Select, SkeletonBlock, Textarea, cx, useToast } from "@qqorvex/ui";
import { useAccount } from "../app/account";
import { PhoneField } from "../components/PhoneField";
import { SettingsCard, SettingsHeader } from "./shared";

interface Draft {
  displayName: string;
  username: string;
  phone: string;
  bio: string;
  selectedTitle: string;
  badgeKeys: string[];
}

const USERNAME_STATUS: Record<string, { text: string; tone: "ok" | "bad" | "muted" } | undefined> = {
  checking: { text: "Verificando disponibilidade…", tone: "muted" },
  available: { text: "Disponível", tone: "ok" },
  taken: { text: "Esse usuário já está em uso", tone: "bad" },
  invalid: { text: "Use 3–20 letras minúsculas, números ou _", tone: "bad" },
  error: { text: "Não foi possível verificar agora", tone: "muted" },
};

/** Dados públicos do perfil, foto e vitrine de conquistas — com prévia ao vivo. */
export function ProfileSettings() {
  const { client, session } = useAuth();
  const account = useAccount();
  const { toast } = useToast();
  const userId = session!.user.id;
  const email = session!.user.email ?? "";
  const { profile, isLoading, error: loadError, refresh, save } = useProfile(client, userId);
  const { progress, title } = useGamificationStats(client, userId);
  const isOwner = profile?.role === "dono";
  const { badges, isLoading: badgesLoading } = useUnlockedBadges(client, userId, isOwner);

  const fromProfile = (): Draft => {
    const saved = profile?.selected_badge_keys ?? [];
    return {
      displayName: profile?.display_name ?? "",
      username: profile?.username ?? "",
      phone: profile?.phone ? formatE164ToBRInput(profile.phone) : "",
      bio: profile?.bio ?? "",
      selectedTitle: profile?.selected_title ?? title ?? "",
      badgeKeys: isOwner ? ["dono", ...saved.filter((key) => key !== "dono").slice(0, 2)] : saved.slice(0, 3),
    };
  };

  const [draft, setDraft] = useState<Draft>(fromProfile);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  useEffect(() => {
    if (profile && !dirty) setDraft(fromProfile());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, title]);

  const usernameChanged = draft.username.trim() !== (profile?.username ?? "");
  const usernameStatus = useUsernameAvailability(client, usernameChanged ? draft.username : "");
  const usernameFeedback = usernameChanged ? USERNAME_STATUS[usernameStatus] : undefined;
  const phoneInvalid = draft.phone.length > 0 && !isBRPhoneValid(draft.phone);
  const canSave = dirty && !saving && !phoneInvalid && usernameStatus !== "taken" && usernameStatus !== "invalid";

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setSaveError(null);
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setSaveError(null);
    const { error } = await save({
      fullName: profile?.full_name || draft.displayName.trim() || email.split("@")[0] || "Qqorvex",
      displayName: draft.displayName.trim() || null,
      username: draft.username.trim() || null,
      phone: normalizeBRPhone(draft.phone),
      bio: draft.bio.trim() || null,
      selectedTitle: draft.selectedTitle || null,
      selectedBadgeKeys: draft.badgeKeys,
    });
    setSaving(false);
    if (error) {
      setSaveError(error);
      return;
    }
    setDirty(false);
    account.refresh();
    toast({ title: "Perfil atualizado", tone: "success" });
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setAvatarBusy(true);
    const previousUrl = profile?.avatar_url;
    try {
      const uploaded = await uploadProfileAvatar(client, userId, file);
      const { error } = await save({ avatarUrl: uploaded.url });
      if (error) {
        await removeManagedProfileAvatar(client, userId, uploaded.url).catch(() => undefined);
        toast({ title: "Não foi possível trocar a foto", description: error, tone: "danger" });
        return;
      }
      if (previousUrl && previousUrl !== uploaded.url) await removeManagedProfileAvatar(client, userId, previousUrl).catch(() => undefined);
      account.refresh();
      toast({ title: "Foto atualizada", tone: "success" });
    } catch (caught) {
      toast({ title: "Não foi possível trocar a foto", description: caught instanceof Error ? caught.message : undefined, tone: "danger" });
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleRemoveAvatar() {
    const previousUrl = profile?.avatar_url;
    if (!previousUrl || avatarBusy) return;
    setAvatarBusy(true);
    try {
      const { error } = await save({ avatarUrl: null });
      if (error) {
        toast({ title: "Não foi possível remover a foto", description: error, tone: "danger" });
        return;
      }
      await removeManagedProfileAvatar(client, userId, previousUrl).catch(() => undefined);
      account.refresh();
    } finally {
      setAvatarBusy(false);
    }
  }

  if (loadError) {
    return (
      <Notice title="Não foi possível carregar seu perfil" actions={<Button size="sm" variant="secondary" onClick={() => void refresh()}>Tentar de novo</Button>}>
        Nenhuma alteração foi feita. Verifique a conexão e tente novamente.
      </Notice>
    );
  }
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4" role="status" aria-label="Carregando perfil">
        <SkeletonBlock className="h-8 w-48" />
        <SkeletonBlock className="h-64 w-full rounded-xl" />
        <SkeletonBlock className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  const shownName = draft.displayName.trim() || profile?.username || email.split("@")[0] || "Você";
  const unlockedBadges = badges.filter((badge) => badge.isUnlockedForUser);
  const availableTitles = Array.from(new Set([title, "Iniciante", ...unlockedBadges.map((badge) => badge.title)].filter((value): value is string => Boolean(value))));
  const shownTitle = draft.selectedTitle || title || "Iniciante";

  return (
    <div className="flex flex-col gap-5 pb-20">
      <SettingsHeader title="Perfil" description="Como você aparece no Qqorvex. Nome, usuário e vitrine ficam visíveis em áreas compartilhadas; telefone e e-mail, não." />

      {saveError && <Notice title="Não foi possível salvar">{saveError}</Notice>}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-5">
          <SettingsCard title="Identidade">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                <Avatar src={profile?.avatar_url} name={shownName} size={72} ring />
                <label htmlFor="profile-avatar-file" className={cx("absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-line bg-raised text-fg-2 shadow-sm hover:text-fg", avatarBusy && "pointer-events-none opacity-60")} title="Trocar foto">
                  <CameraIcon size={15} />
                  <span className="sr-only">Trocar foto de perfil</span>
                </label>
                <input id="profile-avatar-file" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={avatarBusy} onChange={handleAvatarChange} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium text-fg">Foto de perfil</p>
                <p className="text-xs text-fg-3">JPG, PNG ou WEBP. Aparece no menu e na sua vitrine.</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" loading={avatarBusy} onClick={() => document.getElementById("profile-avatar-file")?.click()}>
                  {profile?.avatar_url ? "Trocar" : "Enviar foto"}
                </Button>
                {profile?.avatar_url && (
                  <Button size="sm" variant="ghost" leadingIcon={<TrashIcon size={14} />} disabled={avatarBusy} onClick={() => void handleRemoveAvatar()}>
                    Remover
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-4 border-t border-line-soft pt-4 sm:grid-cols-2">
              <Input label="Nome de exibição" value={draft.displayName} onChange={(event) => update("displayName", event.target.value)} placeholder="Como você quer ser chamado" autoComplete="name" maxLength={60} />
              <div className="flex flex-col gap-1.5">
                <Input
                  label="Usuário"
                  value={draft.username}
                  onChange={(event) => update("username", event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  autoComplete="username"
                  placeholder="seu_usuario"
                  maxLength={20}
                  leadingIcon={<span className="text-[13px]">@</span>}
                />
                {usernameFeedback && (
                  <span className={cx("flex items-center gap-1 text-xs", usernameFeedback.tone === "ok" ? "text-success" : usernameFeedback.tone === "bad" ? "text-danger" : "text-fg-3")}>
                    {usernameFeedback.tone === "ok" ? <CheckCircleIcon size={13} weight="fill" /> : usernameFeedback.tone === "bad" ? <WarningCircleIcon size={13} weight="fill" /> : null}
                    {usernameFeedback.text}
                  </span>
                )}
              </div>
              <PhoneField value={draft.phone} onChange={(value) => update("phone", value)} />
              <Input label="E-mail" value={email} disabled hint="Troque em Segurança" />
            </div>
            <Textarea label="Bio" labelAside={<span className="tabular-nums">{draft.bio.length}/180</span>} value={draft.bio} onChange={(event) => update("bio", event.target.value.slice(0, 180))} rows={3} maxLength={180} placeholder="Uma frase sobre você" />
          </SettingsCard>

          <SettingsCard title="Vitrine" description="Um título e até três insígnias que representam sua jornada." aside={<span className="text-xs tabular-nums text-fg-3">{draft.badgeKeys.length}/3</span>}>
            <Select label="Título em destaque" value={draft.selectedTitle} onChange={(event) => update("selectedTitle", event.target.value)}>
              {availableTitles.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
            {badgesLoading ? (
              <SkeletonBlock className="h-24 w-full rounded-lg" />
            ) : unlockedBadges.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line px-4 py-5 text-center text-[13px] text-fg-3">Suas insígnias aparecem aqui conforme você conquista marcos em Conquistas.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {unlockedBadges.map((badge) => {
                  const selected = draft.badgeKeys.includes(badge.key);
                  const pinned = isOwner && badge.key === "dono";
                  const disabled = !pinned && !selected && draft.badgeKeys.length >= 3;
                  return (
                    <button
                      key={badge.key}
                      type="button"
                      disabled={disabled}
                      aria-pressed={selected}
                      title={pinned ? "Fixada na conta do proprietário" : undefined}
                      onClick={() => {
                        if (pinned) return;
                        update("badgeKeys", selected ? draft.badgeKeys.filter((key) => key !== badge.key) : [...draft.badgeKeys, badge.key]);
                      }}
                      className={cx(
                        "relative flex min-w-0 items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                        selected ? "border-gold-line bg-gold-soft" : "border-line hover:border-line-strong hover:bg-hover",
                      )}
                    >
                      <SpecialBadgeArt badge={badge} className="h-10 w-10 shrink-0" />
                      <span className={cx("min-w-0 flex-1 text-xs font-medium leading-snug", selected ? "text-fg" : "text-fg-2")}>{badge.label}</span>
                      {selected && (
                        <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-on-gold">
                          <CheckIcon size={10} weight="bold" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </SettingsCard>
        </div>

        <aside className="flex flex-col gap-2 xl:sticky xl:top-20" aria-label="Prévia do perfil">
          <p className="text-xs font-medium text-fg-3">Prévia</p>
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="h-16 bg-[linear-gradient(120deg,var(--q-gold-soft),transparent_70%)]" aria-hidden="true" />
            <div className="-mt-9 flex flex-col gap-3 px-4 pb-4">
              <Avatar src={profile?.avatar_url} name={shownName} size={64} className="ring-4 ring-surface" />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-fg">{shownName}</p>
                <p className="truncate text-xs text-fg-3">@{draft.username || "seu_usuario"}</p>
              </div>
              <TitleBadge title={shownTitle} size="sm" />
              {draft.bio.trim() && <p className="text-[13px] leading-relaxed text-fg-2">{draft.bio}</p>}
              {draft.badgeKeys.length > 0 && (
                <div className="flex gap-1.5">
                  {draft.badgeKeys.map((key) => {
                    const badge = unlockedBadges.find((item) => item.key === key);
                    return badge ? <SpecialBadgeArt key={key} badge={badge} className="h-8 w-8" /> : null;
                  })}
                </div>
              )}
              {progress && (
                <div className="flex flex-col gap-1.5 border-t border-line-soft pt-3">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-fg-2">Nível {progress.level}</span>
                    <span className="tabular-nums text-fg-3">{progress.progressPercent}%</span>
                  </div>
                  <ProgressBar value={progress.progressPercent} height={4} />
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {dirty && (
        <div className="sticky bottom-20 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold-line bg-raised/95 px-4 py-3 shadow-lg backdrop-blur md:bottom-4">
          <p className="text-[13px] text-fg-2">{phoneInvalid ? "Confira o telefone antes de salvar." : "Você tem alterações não salvas."}</p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraft(fromProfile());
                setDirty(false);
                setSaveError(null);
              }}
            >
              Descartar
            </Button>
            <Button size="sm" loading={saving} disabled={!canSave} onClick={() => void handleSave()}>
              Salvar perfil
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
