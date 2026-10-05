import type { AuthError } from "@qqorvex/database";

/**
 * Traduz erros do Supabase Auth pra mensagens em português que nunca expõem detalhe técnico nem
 * ajudam a enumerar contas ("E-mail ou senha incorretos." em vez de dizer qual dos dois está
 * errado). Login/cadastro passam por aqui sempre — nunca mostramos `error.message` cru pro usuário.
 */
export function mapAuthError(error: AuthError, context: { operation?: "signUp" } = {}): string {
  if (error.code === "reauthentication_needed") return "Confirme sua identidade com o código enviado ao seu e-mail.";
  if (error.code === "reauthentication_not_valid" || error.code === "otp_expired") return "Código inválido ou expirado. Solicite um novo código.";
  const message = error.message.toLowerCase();

  if (error.code === "captcha_failed") return "A verificação de segurança falhou ou expirou. Faça a verificação novamente.";
  if (error.code === "email_address_invalid") return "Esse endereço de e-mail parece inválido. Confira e tente novamente.";
  if (error.code === "email_address_not_authorized")
    return "O serviço de e-mail ainda não está autorizado a enviar confirmação para esse endereço.";
  if (context.operation === "signUp" && error.code === "unexpected_failure" && (error.status ?? 0) >= 500)
    return "Não foi possível enviar o e-mail de confirmação. Confira o endereço e tente novamente mais tarde.";

  if (message.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (message.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar — verifique sua caixa de entrada.";
  if (message.includes("user already registered") || message.includes("already registered"))
    return "Esse e-mail já está cadastrado. Você pode entrar ou usar \"Esqueci minha senha\".";
  if (message.includes("rate limit") || message.includes("too many requests") || error.status === 429)
    return "Muitas tentativas seguidas. Aguarde um pouco antes de tentar de novo.";
  if (message.includes("password should be at least") || message.includes("password is too short"))
    return "A senha não atende aos requisitos mínimos.";
  if (message.includes("same_password"))
    return "A nova senha precisa ser diferente da atual.";
  if (message.includes("network"))
    return "Não foi possível conectar. Verifique sua internet e tente de novo.";

  return "Não foi possível concluir. Tente novamente em instantes.";
}
