import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/min";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { mapAuthError } from "./authErrors";

/** Só Brasil por enquanto (campo opcional) — `import("libphonenumber-js/min")` é o bundle enxuto (~145kB) recomendado pra browser. */
const DEFAULT_COUNTRY: CountryCode = "BR";

/**
 * Máscara `(62) 9 1234-5678` (celular, 9º dígito separado) / `(62) 3123-4567` (fixo) enquanto o
 * usuário digita — puramente visual, feita à mão (não pela `AsYouType` da lib) pra bater com o
 * formato pedido; a validação de verdade (`normalizeBRPhone`/`isBRPhoneValid`) continua usando
 * `libphonenumber-js`, que é quem garante DDD/estrutura corretos, não essa máscara.
 */
export function formatBRPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  const isMobile = rest.length >= 9;
  if (isMobile) {
    const nine = rest.slice(0, 1);
    const middle = rest.slice(1, 5);
    const end = rest.slice(5, 9);
    return `(${ddd}) ${nine}${middle ? ` ${middle}` : ""}${end ? `-${end}` : ""}`;
  }
  const middle = rest.slice(0, 4);
  const end = rest.slice(4, 8);
  return `(${ddd}) ${middle}${end ? `-${end}` : ""}`;
}

/** `+5562912345678` — formato normalizado que vai pro banco. `null` se o número não for válido. */
export function normalizeBRPhone(raw: string): string | null {
  if (!raw.trim()) return null;
  const parsed = parsePhoneNumberFromString(raw, DEFAULT_COUNTRY);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number;
}

/** Campo vazio não bloqueia o cadastro (telefone é opcional) — só valida de verdade quando algo foi digitado. */
export function isBRPhoneValid(raw: string): boolean {
  if (!raw.trim()) return true;
  return normalizeBRPhone(raw) !== null;
}

/** Caminho inverso — telefone salvo em E.164 (`+5562...`) de volta pra máscara editável no formulário de perfil. */
export function formatE164ToBRInput(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164, DEFAULT_COUNTRY);
  if (!parsed) return "";
  return formatBRPhoneInput(parsed.nationalNumber);
}

/** Solicita ao Supabase a validação do telefone que será usado para entrar na conta. */
export async function requestAuthPhoneChange(client: SupabaseClient<Database>, phone: string) {
  const { error } = await client.auth.updateUser({ phone });
  return { error: error ? mapAuthError(error) : null };
}

/** Só confirma a mudança após a pessoa comprovar que recebe SMS no número novo. */
export async function verifyAuthPhoneChange(client: SupabaseClient<Database>, phone: string, token: string) {
  const { error } = await client.auth.verifyOtp({ phone, token: token.trim(), type: "phone_change" });
  return { error: error ? mapAuthError(error) : null };
}
