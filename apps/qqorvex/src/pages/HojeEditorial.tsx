import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRightIcon, BooksIcon, CalendarBlankIcon, CheckIcon, CheckSquareIcon,
  ClockIcon, NotebookIcon, PlayIcon, PlusIcon, WalletIcon,
} from "@phosphor-icons/react";
import { useAuth, useProfile } from "@qqorvex/auth";
import { useHojeSummary } from "@qqorvex/module-hoje";
import { useTasks, useUpdateTaskStatus } from "@qqorvex/module-tarefas";
import { endOfDay, startOfDay, useEventsInRange } from "@qqorvex/module-agenda";
import { TitleBadge, useGamificationStats, useUnlockedBadges } from "@qqorvex/module-gamificacao";
import { useHabits, useHabitLogs, useLogHabit, type Habit } from "@qqorvex/module-metas-habitos";
import { LIBRARY_ITEM_TYPE_LABELS, LIBRARY_STATUS_LABELS, useLibraryItems } from "@qqorvex/module-biblioteca";
import { computeBalances, useTransactions } from "@qqorvex/module-financas";
import { useEnsureDailyNote } from "@qqorvex/module-segundo-cerebro";
import { supabase } from "../app/supabase";
import { useCurrentItem } from "../vex/CurrentItemContext";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const priorityOrder: Record<string, number> = { urgente: 0, alta: 1, media: 2, baixa: 3, sem_prioridade: 4 };
const sourcePath: Record<string, string> = {
  tarefas: "/tarefas", agenda: "/agenda", "metas-habitos": "/metas-habitos",
  estudos: "/estudos", "segundo-cerebro": "/segundo-cerebro",
  biblioteca: "/biblioteca", documentos: "/documentos", financas: "/financas", "vida-pessoal": "/vida-pessoal",
};

function shortTime(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function selectedName(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).join(" ");
}

function HabitCheck({ habit }: { habit: Habit }) {
  const { logs } = useHabitLogs(supabase, habit.id);
  const logHabit = useLogHabit(supabase, habit.id);
  const date = new Date();
  const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const done = logs.some((log) => log.log_date === today && log.state === "concluido");
  return <button type="button" disabled={done || logHabit.isPending} onClick={() => logHabit.mutate({ logDate: today, state: "concluido" })} className="editorial-habit"><span className={done ? "done" : ""}>{done && <CheckIcon size={13} />}</span><span>{habit.name}</span><small>{done ? "Feito hoje" : "Marcar"}</small></button>;
}

export function HojeEditorialPage() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const navigate = useNavigate();
  const { setCurrentItem } = useCurrentItem();
  const [now] = useState(() => new Date());
  const { tasks, isLoading: tasksLoading } = useTasks(supabase, userId);
  const updateStatus = useUpdateTaskStatus(supabase);
  const { events, isLoading: eventsLoading } = useEventsInRange(supabase, startOfDay(now), endOfDay(now));
  const { summary } = useHojeSummary();
  const { profile } = useProfile(supabase, userId);
  const { progress, title: levelTitle } = useGamificationStats(supabase, userId);
  const { badges } = useUnlockedBadges(supabase, userId, profile?.role === "dono");
  const { habits } = useHabits(supabase);
  const { items: libraryItems } = useLibraryItems(supabase);
  const { transactions, isLoading: financeLoading } = useTransactions(supabase);
  const ensureDailyNote = useEnsureDailyNote(supabase, userId);
  const balances = computeBalances(transactions);

  const activeTasks = tasks.filter((task) => task.status !== "concluido" && !task.parent_task_id);
  const priorities = [...activeTasks].sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    const priority = (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4);
    return priority || (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999");
  });
  const focus = priorities[0];
  const todayEvents = [...events].sort((a, b) => a.start_at.localeCompare(b.start_at)).slice(0, 3);
  const firstLibraryItem = libraryItems.find((item) => item.status === "em_andamento")
    ?? libraryItems.find((item) => item.status === "quero_consumir")
    ?? libraryItems.find((item) => item.status === "pausado")
    ?? libraryItems.find((item) => item.status !== "abandonado")
    ?? libraryItems[0];
  const highlightedBadgeKeys = profile?.role === "dono"
    ? ["dono", ...(profile.selected_badge_keys ?? []).filter((key) => key !== "dono").slice(0, 2)]
    : profile?.selected_badge_keys ?? [];
  const selectedBadges = badges.filter((badge) => badge.isUnlockedForUser && highlightedBadgeKeys.includes(badge.key)).slice(0, 3);
  const nextStepItems = summary.items.slice(0, 4).map((item) => ({
    ...item,
    displayTitle: item.id === "financas-saldo" && !financeLoading && transactions.length === 0
      ? "Configure seu espaço financeiro"
      : item.title,
  }));
  const displayName = selectedName(profile?.display_name || profile?.full_name || profile?.username || session!.user.email?.split("@")[0] || "Você");
  const greeting = now.getHours() < 12 ? "Bom dia!" : now.getHours() < 18 ? "Boa tarde!" : "Boa noite!";
  const dateLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(now).toLocaleUpperCase("pt-BR");

  function openFocus() {
    if (focus) {
      setCurrentItem({ type: "tarefa", id: focus.id, label: focus.title });
      navigate("/tarefas");
    } else navigate("/tarefas", { state: { focusCapture: true } });
  }

  async function openDailyNote() {
    try {
      const page = await ensureDailyNote.mutateAsync(new Date());
      navigate(`/segundo-cerebro/${page.id}`);
    } catch {
      navigate("/segundo-cerebro");
    }
  }

  return <div className="editorial-today">
    <div className="editorial-today-main">
      <section className="editorial-today-hero" aria-labelledby="hoje-title">
        <span className="editorial-eyebrow">{dateLabel}</span>
        <h1 id="hoje-title">{greeting}<br /><span>Hoje é um novo capítulo.</span></h1>
        <p>Foque no que importa e avance com consistência.</p>
        <div className="editorial-hero-actions">
          <button type="button" onClick={openFocus} className="editorial-primary"><PlayIcon size={20} weight="fill" />Começar meu dia</button>
          <Link to="/agenda" className="editorial-quiet"><CalendarBlankIcon size={21} />Revisar minha semana</Link>
        </div>
      </section>
      <div className="editorial-today-work">
        <section className="editorial-agenda" aria-labelledby="editorial-agenda-title">
          <div className="editorial-section-title"><div><CalendarBlankIcon size={22} /><h2 id="editorial-agenda-title">Minha agenda de hoje</h2></div><Link to="/agenda">Ver agenda <ArrowRightIcon size={16} /></Link></div>
          {eventsLoading ? <p className="editorial-muted">Carregando sua agenda...</p> : todayEvents.length ? <div className="editorial-agenda-list">{todayEvents.map((event) => <Link to="/agenda" key={event.id} className="editorial-agenda-item"><span className="editorial-agenda-time">{event.is_all_day ? "Dia" : shortTime(event.start_at)}<small>{event.is_all_day ? "todo" : shortTime(event.end_at)}</small></span><i aria-hidden="true" /><span className="editorial-agenda-copy"><strong>{event.title}</strong><small>{event.location || event.category || "Compromisso"}</small></span></Link>)}</div> : <div className="editorial-empty"><ClockIcon size={22} /><p>Agenda livre por enquanto.</p><Link to="/agenda">Criar evento <ArrowRightIcon size={15} /></Link></div>}
          <Link to="/agenda" className="editorial-text-link">Ver dia completo <ArrowRightIcon size={16} /></Link>
        </section>
        <section className="editorial-priorities" aria-labelledby="editorial-priorities-title">
          <div className="editorial-section-title"><div><CheckSquareIcon size={22} /><h2 id="editorial-priorities-title">Minhas prioridades de hoje</h2></div><Link to="/tarefas">Ver todas <ArrowRightIcon size={16} /></Link></div>
          {tasksLoading ? <p className="editorial-muted">Carregando suas tarefas...</p> : priorities.length ? <ol className="editorial-priority-list">{priorities.slice(0, 3).map((task, index) => <li key={task.id}><span className="editorial-rank">{index + 1}</span><button type="button" className="editorial-priority-copy" onClick={() => { setCurrentItem({ type: "tarefa", id: task.id, label: task.title }); navigate("/tarefas"); }}><strong>{task.title}</strong><small>{task.description || (task.isOverdue ? "Atrasada — merece sua atenção." : task.due_date ? `Prazo: ${new Date(`${task.due_date}T12:00:00`).toLocaleDateString("pt-BR")}` : "Um passo de cada vez.")}</small><span>{task.tags?.[0] || (task.isOverdue ? "Atrasada" : task.priority === "sem_prioridade" ? "Tarefa" : task.priority)}</span></button><button type="button" disabled={updateStatus.isPending || task.isBlocked} onClick={() => updateStatus.mutate({ taskId: task.id, status: "concluido" })} aria-label={`Concluir ${task.title}`} title={task.isBlocked ? "Conclua as dependências primeiro" : "Concluir tarefa"} className="editorial-task-check"><CheckIcon size={15} /></button></li>)}</ol> : <div className="editorial-empty"><CheckSquareIcon size={22} /><p>Tudo concluído por agora.</p><Link to="/tarefas">Planejar uma tarefa <ArrowRightIcon size={15} /></Link></div>}
          <Link to="/tarefas" state={{ focusCapture: true }} className="editorial-text-link"><PlusIcon size={16} /> Adicionar tarefa</Link>
        </section>
      </div>
    </div>

    <aside className="editorial-today-aside" aria-label="Contexto do dia">
      <div className="editorial-aside-block"><div className="editorial-aside-title"><span aria-hidden="true" /><h2>Em foco hoje</h2></div><blockquote>{focus ? `“${focus.title}” é o próximo passo que merece sua atenção.` : "Escolha um passo para movimentar seu dia."}</blockquote><h3>Próximos passos</h3><div className="editorial-next-steps">{nextStepItems.map((item) => <Link key={`${item.source}-${item.id}`} to={sourcePath[item.source] ?? "/"}><span aria-hidden="true" />{item.displayTitle}</Link>)}{summary.items.length === 0 && <p className="editorial-muted">Nada pendente por enquanto.</p>}</div></div>
      <div className="editorial-aside-block editorial-interest"><h3>Talvez te interesse</h3><Link to="/segundo-cerebro"><NotebookIcon size={22} /><span>Suas notas e ideias<small>Continue de onde parou</small></span></Link><Link to="/biblioteca"><BooksIcon size={22} /><span>Na sua biblioteca<small>Retome sua próxima leitura</small></span></Link><Link to="/financas"><WalletIcon size={22} /><span>Seu panorama financeiro<small>Acompanhe o mês</small></span></Link></div>
    </aside>

    <div className="editorial-banner"><img src="/brand/editorial-mountains.png" alt="" /><div><small>LEMBRE-SE</small><p>Grandes resultados nascem de dias bem direcionados.</p></div><span>PLANEJAR<br />EXECUTAR<br />EVOLUIR</span></div>

    <section className="editorial-continuation" aria-label="Mais sobre seu dia">
      <div className="editorial-continuation-intro"><span className="editorial-eyebrow">SEU ESPAÇO</span><h2>O que continua além de hoje</h2><p>Seu progresso e seus outros caminhos ficam a um toque de distância.</p></div>
      <div className="editorial-overview-grid">
        <div className="editorial-overview-card editorial-profile-card">
          <div className="editorial-overview-heading"><span>SEU PERFIL</span><Link to="/perfil">Ver perfil <ArrowRightIcon size={15} /></Link></div>
          <div className="editorial-profile-overview">
            <div className="editorial-profile-identity">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : <span aria-hidden="true">{displayName.charAt(0).toUpperCase()}</span>}
              <div className="editorial-profile-copy">
                <strong>{displayName}</strong>
                <small>@{profile?.username || "usuario"}</small>
                <TitleBadge title={profile?.selected_title || levelTitle || "Iniciante"} size="sm" />
              </div>
            </div>
            <div className="editorial-profile-showcase" aria-label="Badges escolhidos para o perfil">
              <span>EM DESTAQUE</span>
              {selectedBadges.length > 0 ? (
                <div className="editorial-selected-badges">
                  {selectedBadges.map((badge) => <span key={badge.key} title={badge.label}><img src={badge.imageSrc} alt={badge.label} /></span>)}
                </div>
              ) : <small>Seus badges favoritos aparecem aqui.</small>}
            </div>
            <div className="editorial-profile-level">
              <div><span>SUA EVOLUÇÃO</span><strong>{progress ? `Nível ${progress.level}` : "Começando"}</strong></div>
              <span className="editorial-profile-level-caption">{progress ? `${progress.progressPercent}% até o próximo nível` : "Cada passo conta."}</span>
              <div className="editorial-progress" role="progressbar" aria-label="Progresso para o próximo nível" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress?.progressPercent ?? 0}><span style={{ width: `${progress?.progressPercent ?? 0}%` }} /></div>
            </div>
          </div>
        </div>
        <div className="editorial-overview-card"><div className="editorial-overview-heading"><span>FINANÇAS</span><Link to="/financas">Abrir <ArrowRightIcon size={15} /></Link></div><p>Saldo realizado</p><strong className="editorial-balance">{financeLoading ? "—" : money.format(balances.saldoAtual)}</strong><small>Projeção prevista · {financeLoading ? "—" : money.format(balances.saldoProjetado)}</small></div>
        <div className="editorial-overview-card editorial-library-card">
          <div className="editorial-overview-heading"><span>{firstLibraryItem?.status === "em_andamento" ? "CONTINUE DE ONDE PAROU" : "SUA BIBLIOTECA"}</span></div>
          {firstLibraryItem ? (
            <Link to="/biblioteca" className="editorial-library-feature">
              {firstLibraryItem.cover_url ? <img src={firstLibraryItem.cover_url} alt={`Capa de ${firstLibraryItem.title}`} /> : <span className="editorial-library-cover-placeholder" aria-hidden="true"><BooksIcon size={30} /></span>}
              <span className="editorial-library-copy">
                <span className="editorial-library-meta"><span>{LIBRARY_ITEM_TYPE_LABELS[firstLibraryItem.item_type]}</span><span>{LIBRARY_STATUS_LABELS[firstLibraryItem.status]}</span></span>
                <strong>{firstLibraryItem.title}</strong>
                {firstLibraryItem.subtitle && <small>{firstLibraryItem.subtitle}</small>}
                <span className="editorial-library-cta">{firstLibraryItem.status === "em_andamento" ? "Retomar acompanhamento" : "Explorar na biblioteca"}<ArrowRightIcon size={15} /></span>
              </span>
            </Link>
          ) : (
            <div className="editorial-library-empty"><span className="editorial-library-cover-placeholder" aria-hidden="true"><BooksIcon size={30} /></span><div><strong>Seu próximo favorito começa aqui.</strong><p>Guarde livros, filmes, cursos e tudo o que quiser acompanhar.</p><Link to="/biblioteca">Explorar biblioteca <ArrowRightIcon size={15} /></Link></div></div>
          )}
        </div>
      </div>
      <div className="editorial-lower-actions"><div><h3>Hábitos em movimento</h3>{habits.filter((habit) => habit.status === "ativo").slice(0, 3).map((habit) => <HabitCheck key={habit.id} habit={habit} />)}{!habits.some((habit) => habit.status === "ativo") && <p className="editorial-muted">Seus hábitos aparecerão aqui.</p>}<Link to="/metas-habitos" className="editorial-text-link">Ver hábitos <ArrowRightIcon size={16} /></Link></div><div><h3>Nota do dia</h3><p>Registre o que importa agora para reencontrar depois no Segundo Cérebro.</p><button type="button" disabled={ensureDailyNote.isPending} onClick={openDailyNote} className="editorial-quiet">{ensureDailyNote.isPending ? "Abrindo..." : "Abrir minha nota"}<ArrowRightIcon size={16} /></button></div></div>
    </section>
  </div>;
}
