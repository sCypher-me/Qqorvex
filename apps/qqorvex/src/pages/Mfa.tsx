import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button, Notice } from "@qqorvex/ui";
import { useAuth, useMfaFactors, verifyTotpChallenge, getAssuranceLevel, isMfaPending } from "@qqorvex/auth";
import { AuthLayout } from "./AuthLayout";

const CODE_LENGTH = 6;

/** Exibida logo após o login por senha quando a sessão está em `aal1` mas o usuário tem 2FA ativo. */
export function MfaPage() {
  const { client, session, isLoading, signOut } = useAuth();
  const { factors, isLoading: factorsLoading } = useMfaFactors(client);
  const navigate = useNavigate();
  const [pending, setPending] = useState<boolean | null>(null);
  const [digits, setDigits] = useState<string[]>(() => Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!session) return;
    getAssuranceLevel(client).then((level) => setPending(isMfaPending(level)));
  }, [client, session]);

  if (isLoading) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (done || pending === false) return <Navigate to="/" replace />;

  const verifiedFactor = factors.find((f) => f.status === "verified");
  const code = digits.join("");

  function setDigit(index: number, value: string) {
    const clean = value.replace(/\D/g, "");
    if (clean.length > 1) {
      fillFrom(index, clean);
      return;
    }
    setDigits((prev) => prev.map((d, i) => (i === index ? clean : d)));
    if (clean && index < CODE_LENGTH - 1) inputsRef.current[index + 1]?.focus();
  }

  function fillFrom(index: number, value: string) {
    const chars = value.replace(/\D/g, "").slice(0, CODE_LENGTH - index).split("");
    setDigits((prev) => prev.map((d, i) => (i >= index && i - index < chars.length ? (chars[i - index] ?? d) : d)));
    inputsRef.current[Math.min(index + chars.length, CODE_LENGTH - 1)]?.focus();
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) inputsRef.current[index - 1]?.focus();
    if (event.key === "ArrowLeft" && index > 0) inputsRef.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) inputsRef.current[index + 1]?.focus();
  }

  function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    fillFrom(index, event.clipboardData.getData("text"));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!verifiedFactor) return;
    setError(null);
    setBusy(true);
    const { error: verifyError } = await verifyTotpChallenge(client, verifiedFactor.id, code);
    setBusy(false);
    if (verifyError) {
      setError(verifyError);
      return;
    }
    setDone(true);
  }

  async function handleBack() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="flex flex-col gap-[22px]">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[28px] font-semibold m-0">Verificação em duas etapas</h1>
          <p className="text-[13px] text-text-secondary leading-[1.6] m-0">
            Digite o código de 6 dígitos do seu app autenticador. A sessão só é liberada depois da confirmação.
          </p>
        </div>

        {factorsLoading || pending === null ? (
          <p className="text-sm text-text-secondary">Carregando...</p>
        ) : (
          <>
            <div className="grid grid-cols-6 gap-2.5" role="group" aria-label="Código de 6 dígitos">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputsRef.current[index] = el;
                  }}
                  value={digit}
                  onChange={(e) => setDigit(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={(e) => handlePaste(index, e)}
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  maxLength={CODE_LENGTH}
                  autoFocus={index === 0}
                  aria-label={`Dígito ${index + 1}`}
                  placeholder="—"
                  className="qv-field h-[60px] p-0 text-center font-mono text-[22px]"
                />
              ))}
            </div>
            {error && <Notice tone="error">{error}</Notice>}
            <div className="flex flex-col gap-2.5">
              <Button
                type="submit"
                variant="primary"
                disabled={busy || code.length < CODE_LENGTH}
                className="w-full py-3 text-[15px]"
              >
                {busy ? "Verificando..." : "Verificar"}
              </Button>
              <Button type="button" variant="quiet" onClick={handleBack} className="w-full py-3 text-[15px]">
                Voltar
              </Button>
            </div>
          </>
        )}
      </form>
    </AuthLayout>
  );
}
