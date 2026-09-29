import { describe, expect, it } from "vitest";
import {
  getManagedProfileAvatarPath,
  PROFILE_AVATAR_MAX_BYTES,
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
});
