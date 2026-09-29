// Edge Function acionada por pg_cron a cada 5 minutos. Autenticação por segredo compartilhado
// (header X-Cron-Secret, guardado em public.app_secrets), não por JWT de usuário — por isso este
// função é implantada com verify_jwt=false. Lê e escreve com a service_role própria do runtime
// da função (SUPABASE_SERVICE_ROLE_KEY, injetada automaticamente pelo Supabase), nunca expõe
// esse segredo ao cliente.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

Deno.serve(async (req) => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: cronSecretRow } = await supabase.from("app_secrets").select("value").eq("key", "cron_secret").single();
  const providedSecret = req.headers.get("x-cron-secret");
  if (!cronSecretRow || providedSecret !== cronSecretRow.value) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: vapidPublicRow } = await supabase.from("app_secrets").select("value").eq("key", "vapid_public_key").single();
  const { data: vapidPrivateRow } = await supabase.from("app_secrets").select("value").eq("key", "vapid_private_key").single();
  if (!vapidPublicRow || !vapidPrivateRow) {
    return new Response(JSON.stringify({ error: "Chaves VAPID não configuradas." }), { status: 500 });
  }
  webpush.setVapidDetails("mailto:contato@biocypher.tech", vapidPublicRow.value, vapidPrivateRow.value);

  async function sendToUser(userId: string, payload: Record<string, unknown>) {
    const { data: subscriptions } = await supabase.from("push_subscriptions").select("*").eq("user_id", userId);
    let delivered = 0;
    for (const sub of subscriptions ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
        delivered++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Inscrição expirada/revogada no navegador — não adianta tentar de novo.
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }
    return delivered;
  }

  // Fonte 1: lembretes de evento da Agenda ("Lembretes têm tabela mas nada os dispara").
  const { data: reminders } = await supabase
    .from("event_reminders")
    .select("id, minutes_before, events!inner(id, title, start_at, user_id)")
    .is("sent_at", null);

  let totalSent = 0;
  for (const reminder of reminders ?? []) {
    const event = reminder.events as unknown as { id: string; title: string; start_at: string; user_id: string };
    const triggerAtMs = new Date(event.start_at).getTime() - reminder.minutes_before * 60_000;
    if (triggerAtMs > Date.now()) continue;

    totalSent += await sendToUser(event.user_id, {
      title: "Qqorvex — Agenda",
      body: `Em breve: ${event.title}`,
    });
    await supabase.from("event_reminders").update({ sent_at: new Date().toISOString() }).eq("id", reminder.id);
  }

  // Fonte 2: alertas de orçamento estourado em Finanças. Um alerta por competência (year_month);
  // o total gasto nunca é persistido, é somado a partir de `transactions` na hora, mesmo padrão
  // de `computeBalances()`/`computeStatementTotal()` no resto de Finanças.
  const currentYearMonth = new Date().toISOString().slice(0, 7);
  function nextMonthStart(yearMonth: string): string {
    const [year, month] = yearMonth.split("-").map(Number);
    return new Date(year!, month!, 1).toISOString().slice(0, 10);
  }

  const { data: budgets } = await supabase
    .from("budgets")
    .select("id, user_id, category_id, year_month, limit_amount, categories(name)")
    .eq("year_month", currentYearMonth)
    .is("alert_sent_at", null);

  let budgetsAlerted = 0;
  for (const budget of budgets ?? []) {
    const { data: transactions } = await supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", budget.user_id)
      .eq("category_id", budget.category_id)
      .eq("status", "concluida")
      .eq("transaction_type", "saida")
      .gte("date", `${budget.year_month}-01`)
      .lt("date", nextMonthStart(budget.year_month));

    const spent = (transactions ?? []).reduce((sum, t) => sum + t.amount, 0);
    if (spent < budget.limit_amount) continue;

    const categoryName = (budget.categories as unknown as { name: string } | null)?.name ?? "uma categoria";
    totalSent += await sendToUser(budget.user_id, {
      title: "Qqorvex — Orçamento",
      body: `Orçamento de ${categoryName} estourado este mês: R$ ${spent.toFixed(2)} de R$ ${budget.limit_amount.toFixed(2)}.`,
    });
    await supabase.from("budgets").update({ alert_sent_at: new Date().toISOString() }).eq("id", budget.id);
    budgetsAlerted++;
  }

  // Fonte 3: lembrete de hábito diário ainda não registrado no horário preferido. "Notificações"
  // estava marcado como pendência em Metas & Hábitos. v1 lean: só `frequency_type = 'diaria'`
  // com `preferred_time` definido — os demais tipos de frequência exigiriam calcular "está
  // previsto hoje?" de forma mais complexa (dias específicos, X vezes por semana).
  const now = new Date();
  const todayDateStr = now.toISOString().slice(0, 10);
  const currentTimeStr = now.toISOString().slice(11, 16);

  const { data: habits } = await supabase
    .from("habits")
    .select("id, user_id, name, preferred_time, last_reminder_sent_date")
    .eq("status", "ativo")
    .eq("frequency_type", "diaria")
    .not("preferred_time", "is", null);

  let habitsReminded = 0;
  for (const habit of habits ?? []) {
    if (habit.last_reminder_sent_date === todayDateStr) continue;
    const preferredTime = habit.preferred_time!.slice(0, 5);
    if (currentTimeStr < preferredTime) continue;

    const { data: logToday } = await supabase
      .from("habit_logs")
      .select("id")
      .eq("habit_id", habit.id)
      .eq("log_date", todayDateStr)
      .maybeSingle();
    if (logToday) continue;

    totalSent += await sendToUser(habit.user_id, {
      title: "Qqorvex — Hábitos",
      body: `Não esqueça: ${habit.name} hoje.`,
    });
    await supabase.from("habits").update({ last_reminder_sent_date: todayDateStr }).eq("id", habit.id);
    habitsReminded++;
  }

  // Fonte 4: lembrete de fatura de cartão perto do vencimento. "Alertas automáticos de
  // vencimento próximo (dependem de scheduler, que ainda não existe)" ficou desatualizado — o
  // scheduler já existe desde as fontes 2/3. Fechamento/vencimento replicam exatamente
  // computeCurrentClosingDate()/computeStatementDueDate() de @qqorvex/module-financas (verificado
  // com os mesmos casos de teste antes de embutir aqui — Edge Function não importa pacotes do
  // monorepo, só arquivos remotos/npm). A fatura (`card_statements`) é criada aqui se ainda não
  // existir, mesmo comportamento de getOrCreateCurrentStatement() quando o usuário abre "Ver
  // fatura" — só que disparado pelo cron em vez de clique.
  function currentClosingDate(closingDay: number, referenceDate: Date): Date {
    const candidate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), closingDay);
    candidate.setHours(0, 0, 0, 0);
    const today = new Date(referenceDate);
    today.setHours(0, 0, 0, 0);
    if (candidate < today) candidate.setMonth(candidate.getMonth() + 1);
    return candidate;
  }
  function statementDueDate(closingDate: Date, dueDay: number): Date {
    const due = new Date(closingDate.getFullYear(), closingDate.getMonth(), dueDay);
    due.setHours(0, 0, 0, 0);
    if (due <= closingDate) due.setMonth(due.getMonth() + 1);
    return due;
  }
  function toReferenceMonth(closingDate: Date): string {
    return `${closingDate.getFullYear()}-${String(closingDate.getMonth() + 1).padStart(2, "0")}`;
  }

  const DUE_REMINDER_WINDOW_DAYS = 3;
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const { data: cards } = await supabase
    .from("cards")
    .select("id, user_id, nickname, closing_day, due_day")
    .not("closing_day", "is", null)
    .not("due_day", "is", null);

  let statementsReminded = 0;
  for (const card of cards ?? []) {
    const closingDate = currentClosingDate(card.closing_day!, todayMidnight);
    const dueDate = statementDueDate(closingDate, card.due_day!);
    const daysUntilDue = Math.round((dueDate.getTime() - todayMidnight.getTime()) / 86_400_000);
    if (daysUntilDue < 0 || daysUntilDue > DUE_REMINDER_WINDOW_DAYS) continue;

    const referenceMonth = toReferenceMonth(closingDate);
    const { data: statement } = await supabase
      .from("card_statements")
      .select("*")
      .eq("card_id", card.id)
      .eq("reference_month", referenceMonth)
      .maybeSingle();

    const currentStatement =
      statement ??
      (
        await supabase
          .from("card_statements")
          .insert({
            user_id: card.user_id,
            card_id: card.id,
            reference_month: referenceMonth,
            closing_date: closingDate.toISOString().slice(0, 10),
            due_date: dueDate.toISOString().slice(0, 10),
          })
          .select("*")
          .single()
      ).data;
    if (!currentStatement || currentStatement.status === "paga" || currentStatement.due_reminder_sent_at) continue;

    totalSent += await sendToUser(card.user_id, {
      title: "Qqorvex — Fatura",
      body: `Fatura do cartão ${card.nickname} vence em ${dueDate.toLocaleDateString("pt-BR")}.`,
    });
    await supabase.from("card_statements").update({ due_reminder_sent_at: new Date().toISOString() }).eq("id", currentStatement.id);
    statementsReminded++;
  }

  // Fonte 5: geração automática de tarefas recorrentes. "A frequência determina automaticamente
  // a próxima data" — replica exatamente computeNextTaskOccurrenceDate() de
  // @qqorvex/module-tarefas (verificado com os mesmos casos de teste antes de embutir aqui —
  // Edge Function não importa pacotes do monorepo). A tarefa gerada é independente da recorrência
  // depois de criada (editar/completar/apagar não afeta a série), mesmo espírito de
  // generateOccurrence() em Finanças.
  function nextTaskOccurrenceDate(currentDate: string, frequency: string): string {
    const date = new Date(`${currentDate}T00:00:00`);
    if (frequency === "diaria") date.setDate(date.getDate() + 1);
    else if (frequency === "semanal") date.setDate(date.getDate() + 7);
    else date.setMonth(date.getMonth() + 1);
    return date.toISOString().slice(0, 10);
  }

  const { data: recurringTasks } = await supabase
    .from("recurring_tasks")
    .select("*")
    .eq("status", "ativa")
    .lte("next_occurrence_date", todayDateStr);

  let tasksGenerated = 0;
  for (const recurring of recurringTasks ?? []) {
    const occurrenceDate = recurring.next_occurrence_date;
    const { error: insertError } = await supabase.from("tasks").upsert({
      user_id: recurring.user_id,
      title: recurring.title,
      description: recurring.description,
      priority: recurring.priority,
      due_date: occurrenceDate,
      recurring_task_id: recurring.id,
      recurrence_date: occurrenceDate,
    }, { onConflict: "recurring_task_id,recurrence_date", ignoreDuplicates: true });
    if (insertError) continue;

    // Avança somente a ocorrência que este processo acabou de reivindicar.
    // Se o Kanban ou outro ciclo do cron chegou primeiro, o update não encontra
    // mais a data antiga e nenhuma notificação duplicada é enviada.
    const { data: advanced, error: advanceError } = await supabase
      .from("recurring_tasks")
      .update({ next_occurrence_date: nextTaskOccurrenceDate(occurrenceDate, recurring.frequency) })
      .eq("id", recurring.id)
      .eq("next_occurrence_date", occurrenceDate)
      .select("id")
      .maybeSingle();
    if (advanceError || !advanced) continue;

    totalSent += await sendToUser(recurring.user_id, {
      title: "Qqorvex — Tarefas",
      body: `Tarefa recorrente criada: ${recurring.title}`,
    });
    tasksGenerated++;
  }

  // Fonte 6: geração automática de eventos recorrentes. "A frequência determina automaticamente
  // a próxima data" — replica exatamente computeNextEventOccurrenceDate() de
  // @qqorvex/module-agenda. Sem ninguém pra confirmar "criar mesmo assim"/"escolher outro
  // horário" no momento do cron (esse fluxo é só pra criação manual), a ocorrência é criada
  // sempre — findConflicts() (overlap considerando buffers) é reimplementado aqui só pra decidir
  // a mensagem da notificação, nunca pra bloquear a criação.
  function nextEventOccurrenceDate(currentDate: string, frequency: string, anchorDay: number): string {
    const [year, month, day] = currentDate.split("-").map(Number);
    const date = new Date(Date.UTC(year!, month! - 1, day!));
    if (frequency === "diaria") date.setUTCDate(date.getUTCDate() + 1);
    else if (frequency === "semanal") date.setUTCDate(date.getUTCDate() + 7);
    else {
      const nextMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
      const lastDay = new Date(Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, 0)).getUTCDate();
      nextMonth.setUTCDate(Math.min(Math.max(anchorDay, 1), lastDay));
      return nextMonth.toISOString().slice(0, 10);
    }
    return date.toISOString().slice(0, 10);
  }

  function addCalendarDay(date: string): string {
    const [year, month, day] = date.split("-").map(Number);
    const next = new Date(Date.UTC(year!, month! - 1, day! + 1));
    return next.toISOString().slice(0, 10);
  }

  function dateInTimeZone(instant: Date, timeZone: string): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(instant);
    const part = (type: string) => parts.find((value) => value.type === type)?.value ?? "00";
    return `${part("year")}-${part("month")}-${part("day")}`;
  }

  function zonedDateTimeToIso(date: string, time: string, timeZone: string): string {
    const [year, month, day] = date.split("-").map(Number);
    const [hours, minutes, seconds = 0] = time.split(":").map(Number);
    const wallClockAsUtc = Date.UTC(year!, month! - 1, day!, hours!, minutes!, seconds!);
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    let instant = wallClockAsUtc;
    for (let attempt = 0; attempt < 4; attempt++) {
      const parts = formatter.formatToParts(new Date(instant));
      const part = (type: string) => Number(parts.find((value) => value.type === type)?.value);
      const projectedAsUtc = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second"));
      const adjusted = wallClockAsUtc - (projectedAsUtc - instant);
      if (adjusted === instant) break;
      instant = adjusted;
    }
    return new Date(instant).toISOString();
  }

  const { data: recurringEvents } = await supabase
    .from("recurring_events")
    .select("*")
    .eq("status", "ativa")
    // O maior deslocamento civil é +14h; inclui a próxima data UTC e depois filtra
    // exatamente pelo dia local de cada regra, sem deixar eventos elegíveis para trás.
    .lte("next_occurrence_date", addCalendarDay(todayDateStr));

  let eventsGenerated = 0;
  for (const recurring of recurringEvents ?? []) {
    const dateStr = recurring.next_occurrence_date;
    let timeZone = recurring.time_zone || "America/Sao_Paulo";
    try {
      new Intl.DateTimeFormat("en-US", { timeZone }).format();
    } catch {
      timeZone = "America/Sao_Paulo";
    }
    if (dateStr > dateInTimeZone(new Date(), timeZone)) continue;

    const startAt = zonedDateTimeToIso(dateStr, recurring.is_all_day ? "00:00:00" : recurring.start_time || "09:00:00", timeZone);
    const endAt = zonedDateTimeToIso(dateStr, recurring.is_all_day ? "23:59:59" : recurring.end_time || "10:00:00", timeZone);
    const dayStartAt = zonedDateTimeToIso(dateStr, "00:00:00", timeZone);
    const dayEndAt = zonedDateTimeToIso(addCalendarDay(dateStr), "00:00:00", timeZone);

    let hasConflict = false;
    if (!recurring.is_all_day) {
      const { data: sameDayEvents } = await supabase
        .from("events")
        .select("id, start_at, end_at, is_all_day, buffer_before_minutes, buffer_after_minutes")
        .eq("user_id", recurring.user_id)
        .lt("start_at", dayEndAt)
        .gt("end_at", dayStartAt);

      const candidateRange = { start: new Date(startAt), end: new Date(endAt) };
      hasConflict = (sameDayEvents ?? []).some((existing) => {
        if (existing.is_all_day) return false;
        const existingStart = new Date(existing.start_at).getTime() - existing.buffer_before_minutes * 60_000;
        const existingEnd = new Date(existing.end_at).getTime() + existing.buffer_after_minutes * 60_000;
        return existingStart < candidateRange.end.getTime() && candidateRange.start.getTime() < existingEnd;
      });
    }

    const { data: insertedEvent, error: insertError } = await supabase.from("events").upsert({
      user_id: recurring.user_id,
      title: recurring.title,
      description: recurring.description,
      location: recurring.location,
      meeting_link: recurring.meeting_link,
      category: recurring.category,
      is_all_day: recurring.is_all_day,
      start_at: startAt,
      end_at: endAt,
      buffer_before_minutes: recurring.buffer_before_minutes,
      buffer_after_minutes: recurring.buffer_after_minutes,
      recurring_event_id: recurring.id,
      recurrence_date: dateStr,
    }, { onConflict: "recurring_event_id,recurrence_date", ignoreDuplicates: true })
      .select("id")
      .maybeSingle();
    if (insertError) continue;

    const { data: advanced, error: advanceError } = await supabase
      .from("recurring_events")
      .update({ next_occurrence_date: nextEventOccurrenceDate(recurring.next_occurrence_date, recurring.frequency, Number(recurring.start_date.slice(-2))) })
      .eq("id", recurring.id)
      .eq("next_occurrence_date", dateStr)
      .select("id")
      .maybeSingle();
    if (advanceError || !advanced || !insertedEvent) continue;

    totalSent += await sendToUser(recurring.user_id, {
      title: "Qqorvex — Agenda",
      body: hasConflict
        ? `Evento recorrente criado, mas colide com outro compromisso: ${recurring.title} — confira sua agenda.`
        : `Evento recorrente criado: ${recurring.title}`,
    });
    eventsGenerated++;
  }

  return new Response(
    JSON.stringify({
      remindersChecked: reminders?.length ?? 0,
      budgetsChecked: budgets?.length ?? 0,
      budgetsAlerted,
      habitsChecked: habits?.length ?? 0,
      habitsReminded,
      cardsChecked: cards?.length ?? 0,
      statementsReminded,
      recurringTasksChecked: recurringTasks?.length ?? 0,
      tasksGenerated,
      recurringEventsChecked: recurringEvents?.length ?? 0,
      eventsGenerated,
      notificationsSent: totalSent,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
