import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button, Notice, Skeleton } from "@qqorvex/ui";
import { useAuth, useMfaFactors, verifyTotpChallenge, getAssuranceLevel, isMfaPending } from "@qqorvex/auth";
import { AuthLayout } from "./AuthLayout";

const CODE_LENGTH = 6;

/** Exibida logo após o login por senha quando a sessão está em `aal1` mas o usuário tem 2FA ativo. */
export function MfaPage() {
  const { client, session, isLoading, signOut } = useAuth();
  const { factors, isLoading: factorsLoading } = useMfaFactors(client);
  const navigate = useNavigate();
  const [selectedFactorId, setSelectedFactorId] = useState("");
  const [pending, setPending] = useState<boolean | null>(null);
  const [assuranceError, setAssuranceError] = useState(false);
  const [digits, setDigits] = useState<string[]>(() => Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!session) {
      setPending(null);
      setAssuranceError(false);
      return;
    }
    let cancelled = false;
    setPending(null);
    setAssuranceError(false);
    void getAssuranceLevel(client)
      .then((level) => {
        if (!cancelled) setPending(isMfaPending(level));
      })
      .catch(() => {
        if (!cancelled) setAssuranceError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [client, session]);

  if (isLoading) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (assuranceError) {
    return (
      <AuthLayout>
        <div className="flex flex-col gap-4">
          <h1 className="m-0 font-display text-[30px] font-semibold tracking-[-0.02em] text-fg">Não foi possível validar o 2FA</h1>
          <p className="m-0 text-[14px] leading-relaxed text-fg-3">
            Verifique sua conexão e recarregue a página para tentar novamente.
          </p>
          <Button type="button" variant="primary" onClick={() => window.location.reload()} size="lg" fullWidth>
            Tentar novamente
          </Button>
        </div>
      </AuthLayout>
    );
  }
  if (done || pending === false) return <Navigate to="/" replace />;

  const verifiedFactors = factors.filter((factor) => factor.status === "verified");
  const verifiedFactor = verifiedFactors.find((factor) => factor.id === selectedFactorId) ?? verifiedFactors[0];
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="m-0 font-display text-[30px] font-semibold tracking-[-0.02em] text-fg">Verificação em duas etapas</h1>
          <p className="m-0 text-[14px] leading-relaxed text-fg-3">
            Digite o código de 6 dígitos do seu app autenticador. A sessão só é liberada depois da confirmação.
          </p>
        </div>

        {factorsLoading || pending === null ? (
          <div role="status" aria-label="Carregando" className="grid grid-cols-6 gap-2.5">
            {Array.from({ length: CODE_LENGTH }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {verifiedFactors.length > 1 && (
              <label className="flex flex-col gap-2 text-sm font-medium text-fg">
                App autenticador
                <select
                  value={verifiedFactor?.id ?? ""}
                  onChange={(event) => setSelectedFactorId(event.target.value)}
                  className="q-input w-full"
                  aria-label="Escolher app autenticador"
                >
                  {verifiedFactors.map((factor, index) => (
                    <option key={factor.id} value={factor.id}>{factor.friendlyName || `App autenticador ${index + 1}`}</option>
                  ))}
                </select>
                <span className="text-xs font-normal leading-relaxed text-fg-3">Se perdeu acesso ao principal, escolha seu app autenticador de reserva.</span>
              </label>
            )}
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
                  placeholder="·"
                  className="q-input h-14 p-0! text-center font-mono text-[22px] font-semibold"
                />
              ))}
            </div>
            {error && <Notice tone="error">{error}</Notice>}
            <div className="flex flex-col gap-2.5">
              <Button
                type="submit"
                variant="primary"
                disabled={busy || code.length < CODE_LENGTH || !verifiedFactor}
                size="lg"
                fullWidth
              >
                {busy ? "Verificando…" : "Verificar"}
              </Button>
              <Button type="button" variant="ghost" onClick={handleBack} size="lg" fullWidth>
                Usar outra conta
              </Button>
            </div>
          </>
        )}
      </form>
    </AuthLayout>
  );
}
