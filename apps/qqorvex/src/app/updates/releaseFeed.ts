export type ReleaseAsset = {
  name: string;
  browser_download_url: string;
  digest?: string | null;
};

export type GithubRelease = {
  tag_name: string;
  name?: string | null;
  body?: string | null;
  draft: boolean;
  assets: ReleaseAsset[];
};

export type AppUpdate = {
  version: string;
  notes: string;
  url: string;
  sha256: string;
};

export function compareVersions(left: string, right: string): number {
  const parse = (value: string) => {
    const match = value.match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
    return match ? { numbers: match.slice(1, 4).map(Number), prerelease: match[4] ?? null } : null;
  };
  const a = parse(left);
  const b = parse(right);
  if (!a || !b) return 0;
  for (let index = 0; index < 3; index += 1) {
    const leftPart = a.numbers[index] ?? 0;
    const rightPart = b.numbers[index] ?? 0;
    if (leftPart !== rightPart) return leftPart > rightPart ? 1 : -1;
  }
  if (a.prerelease === b.prerelease) return 0;
  if (a.prerelease === null) return 1;
  if (b.prerelease === null) return -1;
  return a.prerelease.localeCompare(b.prerelease, undefined, { numeric: true });
}

function versionFromTag(tag: string, channel: string): string | null {
  if (!tag.startsWith(`android-${channel}-`)) return null;
  const match = tag.match(/v(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)(?:$|[-+])/i);
  return match?.[1] ?? null;
}

function assetSuffix(architecture: string): string | null {
  switch (architecture.toLowerCase()) {
    case "arm64-v8a": return "arm64";
    case "armeabi-v7a": return "arm32";
    case "x86_64": return "x86_64";
    case "x86": return "x86";
    default: return null;
  }
}

export function findAvailableUpdate(
  releases: GithubRelease[],
  currentVersion: string,
  architecture: string,
  channel: string,
): AppUpdate | null {
  const suffix = assetSuffix(architecture);
  if (!suffix) return null;

  const candidates = releases
    .filter((release) => !release.draft)
    .map((release) => ({ release, version: versionFromTag(release.tag_name, channel) }))
    .filter((item): item is { release: GithubRelease; version: string } => Boolean(item.version))
    .sort((left, right) => compareVersions(right.version, left.version));

  for (const { release, version } of candidates) {
    if (compareVersions(version, currentVersion) <= 0) continue;
    const asset = release.assets.find((item) => item.name.toLowerCase() === `qqorvex-android-${suffix}.apk`);
    const sha256 = asset?.digest?.match(/^sha256:([a-f0-9]{64})$/i)?.[1]?.toLowerCase();
    if (!asset || !sha256 || !asset.browser_download_url.startsWith("https://github.com/")) continue;
    return {
      version,
      notes: (release.body ?? release.name ?? "Atualização do Qqorvex.")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/^\s*[-*#>]\s*/gm, "")
        .replace(/[`*_]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 220),
      url: asset.browser_download_url,
      sha256,
    };
  }
  return null;
}
