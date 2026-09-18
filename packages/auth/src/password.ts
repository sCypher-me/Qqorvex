export const MAX_PASSWORD_LENGTH = 128;
export const MIN_PASSWORD_LENGTH = 8;

export interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

/** O hash de verdade (Argon2id/bcrypt) é feito pelo Supabase Auth — isto é só validação de força pra UX/feedback em tempo real. */
export const PASSWORD_RULES: PasswordRule[] = [
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
