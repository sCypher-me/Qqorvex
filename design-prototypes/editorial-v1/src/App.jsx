import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftIcon, ArrowRightIcon, BookOpenIcon, BooksIcon, CalendarBlankIcon,
  ChatTeardropTextIcon, CheckIcon, CheckSquareIcon, ClockIcon, GearSixIcon,
  HouseIcon, ListChecksIcon, MagnifyingGlassIcon, MoonIcon, NotebookIcon,
  PlayIcon, PlusIcon, RowsIcon, SparkleIcon, SunIcon, UserCircleIcon,
  WalletIcon, XIcon,
} from '@phosphor-icons/react';

const initialTasks = [
  { id: 1, title: 'Finalizar a proposta do projeto', detail: 'Revisar pontos, ajustar valores e enviar até 12h.', area: 'Trabalho', status: 'andamento', due: 'Hoje · 12h' },
  { id: 2, title: 'Estudar 1 capítulo de IA generativa', detail: 'Manter a consistência nos estudos.', area: 'Estudos', status: 'inicio', due: 'Hoje' },
  { id: 3, title: 'Organizar as finanças da semana', detail: 'Conferir gastos, atualizar planilha e definir limite.', area: 'Finanças', status: 'inicio', due: 'Esta semana' },
  { id: 4, title: 'Responder e-mails pendentes', detail: 'Confirmar próximos passos com o time.', area: 'Trabalho', status: 'inicio', due: 'Hoje' },
  { id: 5, title: 'Revisar notas da reunião', detail: 'Separar decisões e pendências.', area: 'Conhecimento', status: 'concluido', due: 'Ontem' },
];
const events = [
  { time: '09:00', end: '10:00', title: 'Reunião de alinhamento', detail: 'Time de produto', place: 'Google Meet' },
  { time: '11:30', end: '12:30', title: 'Bloco de estudo', detail: 'Inteligência Artificial', place: 'Estudos' },
  { time: '15:00', end: '16:00', title: 'Planejamento financeiro', detail: 'Revisão do mês', place: 'Pessoal' },
];
const navigation = [
  { name: 'Hoje', icon: HouseIcon, route: 'hoje' },
  { name: 'Tarefas', icon: CheckSquareIcon, route: 'tarefas' },
  { name: 'Agenda', icon: CalendarBlankIcon, route: 'agenda' },
  { name: 'Estudos', icon: BookOpenIcon, route: 'estudos' },
  { name: 'Conhecimento', icon: NotebookIcon, route: 'segundo-cerebro' },
  { name: 'Biblioteca', icon: BooksIcon, route: 'biblioteca' },
  { name: 'Finanças', icon: WalletIcon, route: 'financas' },
];
const secondary = [
  { name: 'Vida pessoal', icon: UserCircleIcon, route: 'vida-pessoal' },
  { name: 'Gamificação', icon: SparkleIcon, route: 'gamificacao' },
  { name: 'Configurações', icon: GearSixIcon, route: 'perfil' },
];
const today = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()).toLocaleUpperCase('pt-BR');

function readTheme() { try { return localStorage.getItem('editorial-theme') === 'light' ? 'light' : 'dark'; } catch { return 'dark'; } }
function readScreen() { const value = location.hash.replace(/^#\/?/, ''); return ['hoje', 'tarefas', 'vex'].includes(value) ? value : 'hoje'; }

function IconButton({ icon: Icon, label, onClick }) {
  return <button type="button" className="icon-button" onClick={onClick} aria-label={label} title={label}><Icon size={20} /></button>;
}

export function App() {
  const [theme, setTheme] = useState(readTheme);
  const [screen, setScreen] = useState(readScreen);
  const [tasks, setTasks] = useState(initialTasks);
  const [taskText, setTaskText] = useState('');
  const [taskView, setTaskView] = useState('painel');
  const [vexOpen, setVexOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [focusStarted, setFocusStarted] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([{ role: 'vex', text: 'Oi! Sou a Vex. Esta prévia mostra como a conversa ficará no novo design.' }]);
  const activeTasks = useMemo(() => tasks.filter(task => task.status !== 'concluido'), [tasks]);

  useEffect(() => { document.documentElement.dataset.theme = theme; try { localStorage.setItem('editorial-theme', theme); } catch { /* Storage is optional. */ } }, [theme]);
  useEffect(() => { const sync = () => setScreen(readScreen()); window.addEventListener('hashchange', sync); return () => window.removeEventListener('hashchange', sync); }, []);
  useEffect(() => { const key = event => { if (event.key === 'Escape') { setVexOpen(false); setMoreOpen(false); setAgendaOpen(false); setSearchOpen(false); } if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(true); } }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, []);

  function navigate(route) {
    setMoreOpen(false); setSearchOpen(false); setVexOpen(false);
    if (['hoje', 'tarefas', 'vex'].includes(route)) { location.hash = route; setScreen(route); }
    else window.open(`http://127.0.0.1:5173/${route}`, '_blank', 'noopener,noreferrer');
  }
  function moveTask(id, status) { setTasks(list => list.map(task => task.id === id ? { ...task, status } : task)); }
  function toggleTask(id) { setTasks(list => list.map(task => task.id === id ? { ...task, status: task.status === 'concluido' ? 'inicio' : 'concluido' } : task)); }
  function addTask(event) { event.preventDefault(); if (!taskText.trim()) return; setTasks(list => [{ id: Date.now(), title: taskText.trim(), detail: 'Tarefa criada nesta prévia.', area: 'Pessoal', status: 'inicio', due: 'Hoje' }, ...list]); setTaskText(''); }
  function sendMessage(event) { event.preventDefault(); if (!chatInput.trim()) return; setMessages(list => [...list, { role: 'user', text: chatInput.trim() }, { role: 'vex', text: 'Esta é uma prévia visual. A Vex real continua disponível no app atual até a aprovação do redesign.' }]); setChatInput(''); }

  return <div className={`app-shell ${vexOpen ? 'vex-expanded' : ''}`}>
    <aside className="desktop-sidebar" aria-label="Navegação principal">
      <button className="brand-block" onClick={() => navigate('hoje')}><strong>Qqorvex</strong><small>VIDA EM PROGRESSO</small></button>
      <nav className="sidebar-links" aria-label="Áreas principais">{navigation.map(item => <button key={item.name} className={`sidebar-link ${screen === item.route ? 'active' : ''}`} onClick={() => navigate(item.route)}><item.icon size={21} /><span>{item.name}</span></button>)}</nav>
      <nav className="sidebar-links secondary-links" aria-label="Outras áreas">{secondary.map(item => <button key={item.name} className="sidebar-link" onClick={() => navigate(item.route)}><item.icon size={21} /><span>{item.name}</span></button>)}</nav>
      <div className="sidebar-foot">Organize o que importa.<br />Continue no seu ritmo.<span /></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><button className="mobile-brand" onClick={() => navigate('hoje')}>Qqorvex</button><button className="search-trigger" onClick={() => setSearchOpen(true)} aria-label="Buscar"><MagnifyingGlassIcon size={21} /><span>Buscar no Qqorvex...</span><kbd>⌘ K</kbd></button><div className="topbar-right"><button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'} title={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}><SunIcon size={20} /><span className="switch"><span /></span><MoonIcon size={20} /></button><span className="topbar-divider" /><span className="greeting">Boa jornada,<br />sempre.</span></div></header>
      <main className={`main-area ${screen}`}>
        {screen === 'hoje' && <TodayScreen tasks={activeTasks} focusStarted={focusStarted} onStart={() => setFocusStarted(!focusStarted)} onToggle={toggleTask} onNavigate={navigate} onAgenda={() => setAgendaOpen(true)} />}
        {screen === 'tarefas' && <TasksScreen tasks={tasks} taskView={taskView} setTaskView={setTaskView} taskText={taskText} setTaskText={setTaskText} onAdd={addTask} onToggle={toggleTask} onMove={moveTask} />}
        {screen === 'vex' && <VexScreen messages={messages} input={chatInput} setInput={setChatInput} onSend={sendMessage} onNew={() => { setMessages([{ role: 'vex', text: 'Oi! Sou a Vex. Esta é uma nova conversa nesta prévia visual.' }]); setChatInput(''); }} onNavigate={navigate} />}
      </main>
    </div>
    {screen !== 'vex' && <aside className={`vex-rail ${vexOpen ? 'open' : ''}`} aria-label="Vex">{vexOpen ? <div className="vex-panel"><header><div className="vex-title"><img src="/assets/vex-avatar.png" alt="" /><span><strong>Vex</strong><small>Converse sobre esta tela</small></span></div><div><IconButton icon={RowsIcon} label="Abrir tela da Vex" onClick={() => navigate('vex')} /><IconButton icon={XIcon} label="Fechar Vex" onClick={() => setVexOpen(false)} /></div></header><ChatBody messages={messages} /><ChatComposer input={chatInput} setInput={setChatInput} onSend={sendMessage} /></div> : <button className="vex-trigger" onClick={() => setVexOpen(true)} aria-label="Abrir conversa com a Vex"><ChatTeardropTextIcon size={23} /><strong>VEX</strong><small>SUA ASSISTENTE DE IA</small></button>}</aside>}
    <nav className="mobile-nav" aria-label="Navegação móvel"><button className={screen === 'hoje' ? 'active' : ''} onClick={() => navigate('hoje')}><HouseIcon size={22} />Hoje</button><button className={screen === 'tarefas' ? 'active' : ''} onClick={() => navigate('tarefas')}><CheckSquareIcon size={22} />Tarefas</button><button className={screen === 'vex' ? 'active' : ''} onClick={() => navigate('vex')}><ChatTeardropTextIcon size={22} />Vex</button><button className={moreOpen ? 'active' : ''} onClick={() => setMoreOpen(true)}><RowsIcon size={22} />Mais</button></nav>
    {moreOpen && <div className="scrim" onClick={() => setMoreOpen(false)}><section className="more-sheet" role="dialog" aria-modal="true" aria-label="Todas as áreas" onClick={event => event.stopPropagation()}><header><h2>Todas as áreas</h2><IconButton icon={XIcon} label="Fechar menu" onClick={() => setMoreOpen(false)} /></header>{[...navigation, ...secondary].map(item => <button key={item.name} onClick={() => navigate(item.route)}><item.icon size={20} />{item.name}<ArrowRightIcon size={16} /></button>)}</section></div>}
    {agendaOpen && <div className="scrim centered" onClick={() => setAgendaOpen(false)}><section className="dialog" role="dialog" aria-modal="true" aria-label="Agenda de hoje" onClick={event => event.stopPropagation()}><header><h2>Agenda de hoje</h2><IconButton icon={XIcon} label="Fechar agenda" onClick={() => setAgendaOpen(false)} /></header><AgendaItems /><button className="text-action" onClick={() => { setAgendaOpen(false); navigate('agenda'); }}>Abrir agenda completa <ArrowRightIcon size={16} /></button></section></div>}
    {searchOpen && <div className="scrim centered" onClick={() => setSearchOpen(false)}><section className="dialog search-dialog" role="dialog" aria-modal="true" aria-label="Busca rápida" onClick={event => event.stopPropagation()}><label><MagnifyingGlassIcon size={21} /><input autoFocus placeholder="Buscar uma área..." onChange={event => { const query = event.target.value.toLowerCase(); document.querySelectorAll('.search-result').forEach(node => { node.hidden = !node.textContent.toLowerCase().includes(query); }); }} /></label>{[...navigation, ...secondary, { name: 'Vex', icon: ChatTeardropTextIcon, route: 'vex' }].map(item => <button className="search-result" key={item.name} onClick={() => navigate(item.route)}><item.icon size={19} />{item.name}<ArrowRightIcon size={16} /></button>)}</section></div>}
  </div>;
}

function AgendaItems() { return <div className="agenda-items">{events.map(event => <div className="agenda-item" key={event.time}><div className="agenda-time"><strong>{event.time}</strong><span>{event.end}</span></div><i /><div><strong>{event.title}</strong><span>{event.detail}</span><small><ClockIcon size={13} />{event.place}</small></div></div>)}</div>; }

function TodayScreen({ tasks, focusStarted, onStart, onToggle, onNavigate, onAgenda }) {
  return <div className="today-layout"><div className="today-main"><section className="today-hero"><span className="eyebrow">{today}</span><h1>Bom dia!<br /><em>Hoje é um novo capítulo.</em></h1><p>Foque no que importa e avance com consistência.</p><div className="hero-actions"><button className="primary-action" onClick={onStart}><PlayIcon size={20} weight="fill" />{focusStarted ? 'Foco iniciado' : 'Começar meu dia'}</button><button className="quiet-action" onClick={onAgenda}><ListChecksIcon size={22} />Revisar minha semana</button></div></section><section className="today-work"><div className="agenda-column"><div className="section-title"><div><CalendarBlankIcon size={22} /><h2>Minha agenda de hoje</h2></div><button onClick={onAgenda}>Ver agenda <ArrowRightIcon size={16} /></button></div><AgendaItems /><button className="text-action" onClick={onAgenda}>Ver dia completo <ArrowRightIcon size={16} /></button></div><div className="priority-column"><div className="section-title"><div><CheckSquareIcon size={22} /><h2>Minhas prioridades de hoje</h2></div><button onClick={() => onNavigate('tarefas')}>Ver todas <ArrowRightIcon size={16} /></button></div>{tasks.length ? <ol className="priority-list">{tasks.slice(0, 3).map((task, index) => <li key={task.id}><span className="rank">{index + 1}</span><div><strong>{task.title}</strong><p>{task.detail}</p><span className="area-label">{task.area}</span></div><button className="task-check" onClick={() => onToggle(task.id)} aria-label={`Concluir ${task.title}`}><CheckIcon size={16} /></button></li>)}</ol> : <p className="empty-text">Tudo concluído por agora.</p>}<button className="text-action" onClick={() => onNavigate('tarefas')}><PlusIcon size={16} /> Adicionar tarefa</button></div></section></div><aside className="today-aside"><div className="aside-block"><div className="aside-title"><span className="focus-ring" /><h2>Em foco hoje</h2></div><blockquote>{tasks.length ? `“${tasks[0].title}” é o próximo passo que merece sua atenção.` : 'Seu dia está em movimento. Escolha um passo para começar.'}</blockquote><h3>Próximos passos</h3><div className="next-steps">{tasks.slice(0, 4).map(task => <button key={task.id} onClick={() => onToggle(task.id)}><span />{task.title}</button>)}{!tasks.length && <p className="empty-text">Sem tarefas pendentes.</p>}</div></div><div className="aside-block interest"><h3>Talvez te interesse</h3><button onClick={() => onNavigate('segundo-cerebro')}><NotebookIcon size={22} /><span>Suas notas e ideias<small>Continue de onde parou</small></span></button><button onClick={() => onNavigate('biblioteca')}><BooksIcon size={22} /><span>Na sua biblioteca<small>Retome sua próxima leitura</small></span></button><button onClick={() => onNavigate('financas')}><WalletIcon size={22} /><span>Seu panorama financeiro<small>Acompanhe o mês</small></span></button></div></aside><div className="editorial-banner"><img src="/assets/editorial-mountains.png" alt="Montanhas ao entardecer" /><div><small>LEMBRE-SE</small><p>Grandes resultados nascem de dias bem direcionados.</p></div><span>PLANEJAR<br />EXECUTAR<br />EVOLUIR</span></div><section className="below-fold"><div><span className="eyebrow">SEU ESPAÇO</span><h2>O que continua além de hoje</h2><p>Seu perfil, sua jornada e seus outros caminhos ficam a um toque de distância.</p></div><div>{[{ name: 'Perfil', route: 'perfil', icon: UserCircleIcon }, { name: 'Jornada', route: 'gamificacao', icon: SparkleIcon }, { name: 'Finanças', route: 'financas', icon: WalletIcon }].map(item => <button key={item.name} onClick={() => onNavigate(item.route)}><item.icon size={21} />{item.name}<ArrowRightIcon size={16} /></button>)}</div></section></div>;
}

function TasksScreen({ tasks, taskView, setTaskView, taskText, setTaskText, onAdd, onToggle, onMove }) {
  const columns = [['inicio', 'Não iniciado', 'Próximos passos'], ['andamento', 'Em andamento', 'Em foco agora'], ['concluido', 'Concluído', 'O que já avançou']];
  return <div className="tasks-screen"><header className="page-heading"><span className="eyebrow">ORGANIZAÇÃO</span><h1>Tarefas</h1><p>Um espaço claro para transformar intenção em progresso.</p></header><div className="task-summary"><span><strong>{tasks.filter(task => task.status !== 'concluido').length}</strong> ativas</span><span><strong>{tasks.filter(task => task.status === 'andamento').length}</strong> em andamento</span><span><strong>{tasks.filter(task => task.status === 'concluido').length}</strong> concluídas</span></div><form className="capture-bar" onSubmit={onAdd}><PlusIcon size={21} /><input value={taskText} onChange={event => setTaskText(event.target.value)} placeholder="Capture uma tarefa rápida..." aria-label="Nova tarefa" /><button disabled={!taskText.trim()}>Adicionar <ArrowRightIcon size={17} /></button></form><div className="task-tabs" role="tablist" aria-label="Visualização">{[['painel', 'Painel'], ['todas', 'Todas as tarefas'], ['recorrentes', 'Recorrentes']].map(([id, label]) => <button role="tab" aria-selected={taskView === id} className={taskView === id ? 'selected' : ''} onClick={() => setTaskView(id)} key={id}>{label}</button>)}</div>{taskView === 'painel' && <div className="kanban">{columns.map(([id, label, subtitle]) => <section className="kanban-column" key={id} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const taskId = Number(event.dataTransfer.getData('text/plain')); if (taskId) onMove(taskId, id); }}><header><div><i className={id} /><h2>{label}</h2><span>{tasks.filter(task => task.status === id).length}</span></div><p>{subtitle}</p></header><div className="kanban-cards">{tasks.filter(task => task.status === id).map(task => <article className="task-card" key={task.id} draggable onDragStart={event => event.dataTransfer.setData('text/plain', task.id)}><div><span className="area-label">{task.area}</span><small>{task.due}</small></div><h3>{task.title}</h3><p>{task.detail}</p><footer><button onClick={() => onToggle(task.id)}>{id === 'concluido' ? 'Reabrir' : 'Concluir'}</button>{id === 'inicio' && <button onClick={() => onMove(task.id, 'andamento')}>Iniciar <ArrowRightIcon size={15} /></button>}</footer></article>)}{!tasks.some(task => task.status === id) && <p className="empty-text">Nada por aqui ainda.</p>}</div></section>)}</div>}{taskView === 'todas' && <div className="all-tasks">{tasks.map(task => <div className="all-task-row" key={task.id}><button className={`task-check ${task.status === 'concluido' ? 'checked' : ''}`} onClick={() => onToggle(task.id)} aria-label={`Alternar ${task.title}`}><CheckIcon size={16} /></button><span><strong>{task.title}</strong><small>{task.area} · {task.due}</small></span><select value={task.status} onChange={event => onMove(task.id, event.target.value)} aria-label={`Etapa de ${task.title}`}><option value="inicio">Não iniciado</option><option value="andamento">Em andamento</option><option value="concluido">Concluído</option></select></div>)}</div>}{taskView === 'recorrentes' && <div className="recurring"><h2>Tarefas recorrentes</h2><p>As recorrências do app atual continuam disponíveis. Esta prévia mostra apenas a organização visual desta área.</p><button onClick={() => window.open('http://127.0.0.1:5173/tarefas', '_blank', 'noopener,noreferrer')}>Abrir recorrentes no app atual <ArrowRightIcon size={17} /></button></div>}</div>;
}

function ChatBody({ messages }) { return <div className="chat-body"><span className="chat-date">HOJE</span>{messages.map((message, index) => <div key={index} className={`chat-bubble ${message.role}`}>{message.text}</div>)}</div>; }
function ChatComposer({ input, setInput, onSend }) { return <form className="chat-composer" onSubmit={onSend}><input value={input} onChange={event => setInput(event.target.value)} placeholder="Pergunte alguma coisa para a Vex" aria-label="Mensagem para a Vex" /><button type="submit" disabled={!input.trim()} aria-label="Enviar mensagem"><ArrowRightIcon size={20} /></button></form>; }
function VexScreen({ messages, input, setInput, onSend, onNew, onNavigate }) {
  return <div className="vex-screen">
    <aside className="conversation-sidebar">
      <span className="eyebrow">VEX</span>
      <button className="new-conversation" onClick={onNew}><PlusIcon size={19} /> Nova conversa</button>
      <span className="eyebrow">RECENTES</span>
      <button className="conversation-active"><ChatTeardropTextIcon size={19} /> Conversa atual</button>
      <small>Prévia com dados ilustrativos</small>
    </aside>
    <section className="conversation-main">
      <header>
        <div className="conversation-identity"><img src="/assets/vex-avatar.png" alt="" /><span><small>CONVERSA COM A VEX</small><h1>Uma conversa de cada vez.</h1></span></div>
        <div className="conversation-actions">
          <button onClick={onNew} aria-label="Nova conversa"><PlusIcon size={18} /><span>Nova</span></button>
          <button onClick={() => onNavigate('hoje')} aria-label="Voltar ao Hoje"><ArrowLeftIcon size={18} /><span>Voltar ao Hoje</span></button>
        </div>
      </header>
      <div className="conversation-intro"><small>CONTEXTO DE AGORA</small><strong>Seu dia, suas prioridades e seus próximos passos.</strong><p>A Vex continua separada da navegação. No app real, ela mantém as funções já existentes; aqui mostramos o espaço da conversa.</p></div>
      <ChatBody messages={messages} />
      <ChatComposer input={input} setInput={setInput} onSend={onSend} />
    </section>
  </div>;
}
