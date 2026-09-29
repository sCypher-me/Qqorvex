import { useState } from "react";
import { DownloadSimpleIcon, EnvelopeSimpleIcon, FileArchiveIcon, WarningIcon } from "@phosphor-icons/react";
import type { SupabaseClient } from "@qqorvex/database";
import { Button, Notice, ProgressBar, cx } from "@qqorvex/ui";
import { useAccount } from "../app/account";
import { supabase } from "../app/supabase";
import { IconTile, SettingsCard, SettingsHeader } from "./shared";

/** Tabelas exportadas por área. A RLS garante que cada consulta devolve só os dados da própria conta. */
const EXPORT_GROUPS: Array<{ area: string; tables: string[] }> = [
  { area: "Tarefas", tables: ["tasks", "task_checklist_items", "task_dependencies", "recurring_tasks"] },
  { area: "Agenda", tables: ["events", "event_reminders", "recurring_events"] },
  { area: "Metas & Hábitos", tables: ["goals", "goal_milestones", "goal_checkins", "habits", "habit_logs", "routines", "routine_habits", "goal_habit_relations"] },
  { area: "Finanças", tables: ["accounts", "cards", "card_statements", "categories", "transactions", "recurring_transactions", "installments", "budgets"] },
  { area: "Estudos", tables: ["notebooks", "topics", "summaries", "flashcards", "flashcard_reviews", "quizzes", "quiz_questions", "quiz_attempts", "study_sessions", "assessments", "errors_doubts", "notebook_library_items"] },
  { area: "Notas", tables: ["pages", "blocks", "page_links", "page_tags", "page_properties", "page_checkpoints", "bases", "base_pages", "base_formulas"] },
  { area: "Biblioteca", tables: ["library_items", "library_collections", "library_collection_items", "library_consumption_cycles", "library_item_creators", "library_item_relations"] },
  { area: "Documentos", tables: ["folders", "documents", "document_versions", "document_relations", "document_important_dates", "warranties"] },
  { area: "Pessoal", tables: ["plans", "plan_goals", "projects", "project_tasks", "ideas", "daily_checkins", "pomodoro_sessions", "useful_contacts", "vehicles", "vehicle_important_dates", "assets", "important_purchases", "shopping_list_items"] },
  { area: "Vex", tables: ["vex_conversations", "vex_messages"] },
  { area: "Conquistas", tables: ["gamification_stats", "user_badges", "user_daily_challenge_progress"] },
];
const ALL_TABLES = EXPORT_GROUPS.flatMap((group) => group.tables);
const PAGE = 1000;
const SUPPORT_EMAIL = "contato@biocypher.tech";

async function fetchAll(client: SupabaseClient, table: string): Promise<unknown[]> {
  const rows: unknown[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client.from(table).select("*").range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

function download(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Portabilidade (baixar tudo em JSON) e o caminho para excluir a conta. */
export function DataSettings() {
  const { userId, email } = useAccount();
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<{ rows: number; skipped: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setError(null);
    setResult(null);
    setProgress(0);
    const client = supabase as unknown as SupabaseClient;
    const data: Record<string, unknown[]> = {};
    const skipped: string[] = [];
    let rows = 0;
    try {
      const { data: profile } = await client.from("profiles").select("*").eq("id", userId).maybeSingle();
      for (const [index, table] of ALL_TABLES.entries()) {
        try {
          data[table] = await fetchAll(client, table);
          rows += data[table].length;
        } catch {
          skipped.push(table);
        }
        setProgress(Math.round(((index + 1) / ALL_TABLES.length) * 100));
      }
      const payload = { app: "Qqorvex", formato: 1, exportado_em: new Date().toISOString(), conta: { id: userId, email }, perfil: profile ?? null, dados: data };
      download(`qqorvex-dados-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2));
      setResult({ rows, skipped });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível gerar o arquivo.");
    } finally {
      setProgress(null);
    }
  }

  const exporting = progress !== null;

  return (
    <div className="flex flex-col gap-5">
      <SettingsHeader title="Seus dados" description="Os dados são seus. Leve uma cópia quando quiser ou peça a exclusão da conta." />

      <SettingsCard title="Baixar uma cópia" description="Um arquivo JSON com tudo o que você criou: tarefas, agenda, metas, finanças, estudos, notas, biblioteca, documentos (dados, sem os arquivos), vida pessoal e conversas com a Vex.">
        <div className="flex flex-wrap items-center gap-3">
          <IconTile tone="gold">
            <FileArchiveIcon />
          </IconTile>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-medium text-fg">{EXPORT_GROUPS.length} áreas · formato aberto</p>
            <p className="text-xs text-fg-3">Pode ser aberto em qualquer editor de texto ou importado em outras ferramentas.</p>
          </div>
          <Button leadingIcon={<DownloadSimpleIcon size={16} />} loading={exporting} onClick={() => void handleExport()}>
            {exporting ? "Gerando…" : "Baixar meus dados"}
          </Button>
        </div>
        {exporting && <ProgressBar value={progress ?? 0} height={4} label="Progresso da exportação" />}
        {result && (
          <Notice tone="success" compact>
            Arquivo gerado com {result.rows.toLocaleString("pt-BR")} registros.{result.skipped.length > 0 ? ` ${result.skipped.length} tabelas não puderam ser lidas e ficaram de fora.` : ""}
          </Notice>
        )}
        {error && <Notice compact>{error}</Notice>}
      </SettingsCard>

      <SettingsCard title="Excluir conta" description="Remove sua conta e todos os dados de forma permanente. Baixe uma cópia antes, se quiser guardar algo." className="border-danger/30">
        <div className={cx("flex flex-wrap items-center gap-3 rounded-lg border border-danger/25 bg-danger-soft px-3.5 py-3")}>
          <WarningIcon size={18} className="shrink-0 text-danger" />
          <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-fg-2">
            A exclusão é feita pelo suporte para confirmar que o pedido é seu. Escreva a partir do e-mail da conta ({email}).
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Excluir minha conta do Qqorvex")}&body=${encodeURIComponent(`Olá! Quero excluir minha conta do Qqorvex e todos os dados.\n\nE-mail da conta: ${email}\nID: ${userId}`)}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-danger/40 px-3 text-[13px] font-medium text-danger hover:bg-danger/10"
          >
            <EnvelopeSimpleIcon size={15} /> Pedir exclusão
          </a>
        </div>
      </SettingsCard>
    </div>
  );
}
