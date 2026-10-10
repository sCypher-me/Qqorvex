import { describe, expect, it, vi } from "vitest";
import type { Database, SupabaseClient } from "@qqorvex/database";
import {
  getManagedProfileAvatarPath,
  PROFILE_AVATAR_LINK_SECONDS,
  PROFILE_AVATAR_MAX_BYTES,
  signProfileAvatarUrl,
  validateProfileAvatar,
} from "./profile";

describe("profile avatar helpers", () => {
  it("accepts supported image formats", () => {
    expect(validateProfileAvatar(new Blob(["avatar"], { type: "image/jpeg" }))).toBeNull();
    expect(validateProfileAvatar(new Blob(["avatar"], { type: "image/png" }))).toBeNull();
    expect(validateProfileAvatar(new Blob(["avatar"], { type: "image/webp" }))).toBeNull();
  });

  it("rejects unsupported formats and oversized files", () => {
    expect(validateProfileAvatar(new Blob(["avatar"], { type: "image/svg+xml" }))).toBe(
      "Escolha uma imagem JPG, PNG ou WebP.",
    );
    expect(validateProfileAvatar(new Blob([new Uint8Array(PROFILE_AVATAR_MAX_BYTES + 1)], { type: "image/png" }))).toBe(
      "A foto de perfil deve ter no máximo 5 MB.",
    );
  });

  it("returns the managed path only for the current user's public avatar", () => {
    const userId = "11111111-1111-4111-8111-111111111111";
    const base = "https://project.supabase.co/storage/v1/object/public/avatars";

    expect(getManagedProfileAvatarPath(`${base}/${userId}/avatar.webp`, userId)).toBe(`${userId}/avatar.webp`);
    expect(getManagedProfileAvatarPath(`${base}/${userId}/folder%20name.png`, userId)).toBe(
      `${userId}/folder name.png`,
    );
    expect(getManagedProfileAvatarPath(`${base}/other-user/avatar.webp`, userId)).toBeNull();
    expect(getManagedProfileAvatarPath("https://images.example.com/avatar.webp", userId)).toBeNull();
  });

  it("gera link temporário para a foto guardada no Qqorvex e mantém fotos externas", async () => {
    const userId = "11111111-1111-4111-8111-111111111111";
    const base = "https://project.supabase.co/storage/v1/object/public/avatars";
    const createSignedUrl = vi.fn(async (path: string, seconds: number) => ({ data: { signedUrl: `https://signed/${path}?ttl=${seconds}` }, error: null }));
    const client = { storage: { from: () => ({ createSignedUrl }) } } as unknown as SupabaseClient<Database>;

    expect(await signProfileAvatarUrl(client, `${base}/${userId}/a.webp`, userId)).toBe(`https://signed/${userId}/a.webp?ttl=${PROFILE_AVATAR_LINK_SECONDS}`);
    expect(await signProfileAvatarUrl(client, "https://lh3.googleusercontent.com/a/foto", userId)).toBe("https://lh3.googleusercontent.com/a/foto");
    expect(await signProfileAvatarUrl(client, null, userId)).toBeNull();
    expect(createSignedUrl).toHaveBeenCalledTimes(1);
  });

  it("devolve null quando não há acesso ao arquivo, para a interface mostrar a inicial", async () => {
    const userId = "11111111-1111-4111-8111-111111111111";
    const client = { storage: { from: () => ({ createSignedUrl: async () => ({ data: null, error: { message: "Object not found" } }) }) } } as unknown as SupabaseClient<Database>;
    expect(await signProfileAvatarUrl(client, `https://project.supabase.co/storage/v1/object/public/avatars/${userId}/a.webp`, userId)).toBeNull();
  });
});
