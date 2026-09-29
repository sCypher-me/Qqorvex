import { Input } from "@qqorvex/ui";
import { formatBRPhoneInput, isBRPhoneValid } from "@qqorvex/auth";

/** Máscara é só apresentação — `normalizeBRPhone()` converte pro E.164 (`+55...`) só na hora de enviar (ver Registrar.tsx). */
export function PhoneField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const invalid = value.length > 0 && !isBRPhoneValid(value);
  return (
    <Input
      label="Telefone (opcional)"
      type="tel"
      inputMode="tel"
      placeholder="(XX) X XXXX-XXXX"
      autoComplete="tel"
      value={value}
      onChange={(e) => onChange(formatBRPhoneInput(e.target.value))}
      error={invalid ? "Telefone inválido." : null}
    />
  );
}
