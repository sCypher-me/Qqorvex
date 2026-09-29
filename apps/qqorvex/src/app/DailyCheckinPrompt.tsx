import { useEffect, useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { DailyCheckinForm, localDateKey, useTodayCheckin } from "@qqorvex/module-vida-pessoal";
import { Modal } from "@qqorvex/ui";

function dismissedKey(userId: string, date: string) {
  return `qqorvex:checkin-prompt-dismissed:${userId}:${date}`;
}

/** Abre o check-in no primeiro acesso autenticado do dia, apenas quando o banco confirma que falta. */
export function DailyCheckinPrompt({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const [date, setDate] = useState(() => localDateKey(new Date()));
  const [isOpen, setIsOpen] = useState(false);
  const { checkin, isLoading, error } = useTodayCheckin(client, userId, date);

  useEffect(() => {
    const timer = window.setInterval(() => setDate(localDateKey(new Date())), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isLoading || error) return;
    if (checkin) {
      setIsOpen(false);
      return;
    }
    try {
      setIsOpen(window.sessionStorage.getItem(dismissedKey(userId, date)) !== "true");
    } catch {
      setIsOpen(true);
    }
  }, [checkin, date, error, isLoading, userId]);

  function dismissForThisSession() {
    try { window.sessionStorage.setItem(dismissedKey(userId, date), "true"); } catch { /* opcional */ }
    setIsOpen(false);
  }

  return (
    <Modal isOpen={isOpen} onClose={dismissForThisSession} title="Seu check-in de hoje" size="md">
      <div className="flex flex-col gap-3">
        <p className="m-0 text-sm leading-relaxed text-fg-2">Antes de começar, reserve um minuto para perceber como você está. Seu registro fica privado e pode ser editado durante o dia.</p>
        <DailyCheckinForm client={client} userId={userId} includeHistory={false} showTitle={false} onSaved={dismissForThisSession} />
      </div>
    </Modal>
  );
}
