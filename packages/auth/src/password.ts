export const MAX_PASSWORD_LENGTH = 128;
const MIN_PASSWORD_LENGTH = 8;

export interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

/** O hash de verdade (Argon2id/bcrypt) é feito pelo Supabase Auth — isto é só validação de força pra UX/feedback em tempo real. */
const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", label: `${MIN_PASSWORD_LENGTH} ou mais caracteres`, test: (p) => p.length >= MIN_PASSWORD_LENGTH },
  { id: "upper", label: "Letra maiúscula", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "Letra minúscula", test: (p) => /[a-z]/.test(p) },
  { id: "number", label: "Número", test: (p) => /[0-9]/.test(p) },
  { id: "special", label: "Caractere especial", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function getPasswordChecklist(password: string): { id: string; label: string; met: boolean }[] {
  return PASSWORD_RULES.map((rule) => ({ id: rule.id, label: rule.label, met: rule.test(password) }));
}

export function isPasswordValid(password: string): boolean {
  return password.length <= MAX_PASSWORD_LENGTH && PASSWORD_RULES.every((rule) => rule.test(password));
}

export type PasswordStrengthLevel = "fraca" | "media" | "forte" | "muito-forte";

export interface PasswordStrength {
  level: PasswordStrengthLevel;
  /** 0–100, pra largura da barra — a UI decide a cor por nível, isto aqui não sabe de CSS. */
  percent: number;
}

/** Pontuação simples: 1 ponto por regra atendida + bônus por comprimento além do mínimo — não é uma estimativa de entropia de verdade, só reforço visual da checklist. */
export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { level: "fraca", percent: 0 };
  let score = PASSWORD_RULES.filter((rule) => rule.test(password)).length;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  if (score <= 2) return { level: "fraca", percent: 20 };
  if (score <= 4) return { level: "media", percent: 50 };
  if (score <= 6) return { level: "forte", percent: 80 };
  return { level: "muito-forte", percent: 100 };
}
