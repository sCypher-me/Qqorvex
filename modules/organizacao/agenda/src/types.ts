import type { Tables, TablesInsert } from "@qqorvex/database";

/**
 * Agenda & Tempo é a única fonte de verdade dos blocos de horário do Qqorvex. Scheduler de
 * notificações (Web Push + pg_cron + Edge Function) já existe — ver `event_reminders`/
 * `@qqorvex/notifications`. Integrações (Zoom + Google Calendar) — ver
 * `docs/decisions/integracoes-agenda-design.md`: `google_event_id`/`google_updated_at` em
 * `events` são a relação 1:1 com o evento correspondente no Google, sem tabela de mapeamento
 * separada. Eventos recorrentes — ver `docs/decisions/eventos-recorrentes-design.md`.
 */
export type CalendarEvent = Tables<"events">;
export type EventReminder = Tables<"event_reminders">;
export type GoogleCalendarConnection = Tables<"google_calendar_connections">;
export type RecurringEvent = Tables<"recurring_events">;
export type RecurringEventFrequency = RecurringEvent["frequency"];

export interface NewEventInput {
  title: string;
  description?: string;
  location?: string;
  meetingLink?: string;
  category?: string;
  isAllDay?: boolean;
  /** ISO 8601 */
  startAt: string;
  /** ISO 8601 */
  endAt: string;
  taskId?: string;
  assessmentId?: string;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  /** Se definido, o chamador deve criar um `event_reminders` após o evento (fora deste insert). */
  reminderMinutesBefore?: number;
}

export function toEventInsert(userId: string, input: NewEventInput): TablesInsert<"events"> {
  return {
    user_id: userId,
    title: input.title,
    description: input.description ?? null,
    location: input.location ?? null,
    meeting_link: input.meetingLink ?? null,
    category: input.category ?? "compromisso",
    is_all_day: input.isAllDay ?? false,
    start_at: input.startAt,
    end_at: input.endAt,
    task_id: input.taskId ?? null,
    assessment_id: input.assessmentId ?? null,
    buffer_before_minutes: input.bufferBeforeMinutes ?? 0,
    buffer_after_minutes: input.bufferAfterMinutes ?? 0,
  };
}
