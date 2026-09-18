import { Input } from "@qqorvex/ui";
import { useAuth, useUsernameAvailability } from "@qqorvex/auth";

const STATUS_TEXT: Record<string, { label: string; className: string } | undefined> = {
  checking: { label: "Verificando…", className: "text-text-muted" },
  available: { label: "✓ Nome disponível", className: "text-success" },
  taken: { label: "✕ Esse nome de usuário já está em uso.", className: "text-error" },
  invalid: { label: "3–20 letras minúsculas, números ou _.", className: "text-text-muted" },
};

/** Opcional — se ficar em branco, o backend gera um "qqXXXXX" sozinho (`handle_new_user`). */
export function UsernameField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { client } = useAuth();
  const status = useUsernameAvailability(client, value);
  const feedback = STATUS_TEXT[status];

  return (
    <div className="flex flex-col gap-1.5">
      <Input
        label="Usuário (opcional)"
        placeholder="gerado automaticamente se deixar em branco"
        value={value}
        onChange={(e) => onChange(e.target.value.toLowerCase())}
        autoComplete="username"
        maxLength={20}
      />
      {feedback && <span className={`text-xs ${feedback.className}`}>{feedback.label}</span>}
    </div>
  );
}
