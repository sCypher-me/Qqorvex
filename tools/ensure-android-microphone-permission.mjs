import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const candidates = [
  path.resolve(process.cwd(), "src-tauri/gen/android/app/src/main/AndroidManifest.xml"),
  path.resolve(scriptDir, "../src-tauri/gen/android/app/src/main/AndroidManifest.xml"),
];
const manifestPath = candidates.find((candidate) => fs.existsSync(candidate));

if (!manifestPath) {
  // `tauri build` for the web does not create the Android project; this is intentionally a no-op.
  process.stdout.write("AndroidManifest.xml ainda não existe; nenhuma permissão foi alterada.\n");
  process.exit(0);
}

const permission = '    <uses-permission android:name="android.permission.RECORD_AUDIO" />';
const source = fs.readFileSync(manifestPath, "utf8");
if (source.includes(permission) || source.includes('android.permission.RECORD_AUDIO')) {
  process.stdout.write("Permissão RECORD_AUDIO já está presente.\n");
  process.exit(0);
}

const internetLine = '    <uses-permission android:name="android.permission.INTERNET" />';
if (!source.includes(internetLine)) {
  throw new Error("Não encontrei a linha de INTERNET no AndroidManifest.xml; não alterei o arquivo.");
}

const updated = source.replace(internetLine, `${internetLine}\n${permission}`);
fs.writeFileSync(manifestPath, updated, "utf8");
process.stdout.write("Permissão RECORD_AUDIO adicionada ao AndroidManifest.xml.\n");
