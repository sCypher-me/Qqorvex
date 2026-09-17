import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@qqorvex/ui";
import {
  EchoProvider,
  OllamaProvider,
  GeminiProvider,
  ResilientProvider,
  runVexTurn,
  confirmVexToolCall,
  VEX_SYSTEM_PROMPT,
  createTarefasTools,
  createAgendaTools,
  createMetasHabitosTools,
  createEstudosTools,
  createSegundoCerebroTools,
  createBibliotecaTools,
  createDocumentosTools,
  createFinancasTools,
  createWebTools,
  useVexConversations,
  useCreateVexConversation,
  useRenameVexConversation,
  useDeleteVexConversation,
  useVexMessages,
  useAppendVexMessage,
  type ChatMessage,
  type VexTurnResult,
} from "@qqorvex/vex";
import { useAuth } from "@qqorvex/auth";
import { supabase } from "../app/supabase";
import { useVexSession } from "./VexSessionContext";
import { useCurrentItem } from "./CurrentItemContext";
import { useCurrentPageMeta } from "../app/shell/PageMeta";
import { BRAND_ASSETS } from "../app/shell/navigation";

const ollamaModel = import.meta.env.VITE_OLLAMA_MODEL ?? "qwen2.5:7b";
/**
 * Cadeia de fallback: Gemini hospedado (funciona de qualquer lugar) → Ollama local (se o
 * desenvolvedor tiver rodando, ainda funciona offline/sem chave) → Echo (nunca falha, comandos
 * por padrão de texto). `ResilientProvider` só aceita 2 providers, por isso o aninhamento.
 */
const provider = new ResilientProvider(
  new GeminiProvider(supabase),
  new ResilientProvider(new OllamaProvider(ollamaModel), new EchoProvider()),
);

const GREETING =
  "Oi! Sou a Vex. Posso ajudar com Tarefas, Agenda, Metas & Hábitos, Estudos, Segundo Cérebro, Biblioteca, Documentos e Finanças.";

/** Sugestões de pergunta — só atalhos para preencher o campo, nunca enviadas sozinhas. */
const SUGGESTIONS = ["Como está minha semana?", "O que venceu ontem?", "Quais tarefas são para hoje?"];

/**
 * Corpo do chat — `VexPanel` (painel lateral, `variant="panel"`) e `VexPage` (`/vex` em tela
 * cheia, `variant="page"`) usam o mesmo componente com chrome diferente; a lógica de
 * conversa/ferramentas/confirmação é uma só. `onClose` só existe pro painel.
 */
export function VexConversationView({ onClose, variant = "panel" }: { onClose?: () => void; variant?: "panel" | "page" }) {
  const pageMeta = useCurrentPageMeta();
  const { session } = useAuth();
  const userId = session!.user.id;
  const queryClient = useQueryClient();
  const tools = [
    ...createTarefasTools(supabase, userId),
    ...createAgendaTools(supabase, userId),
    ...createMetasHabitosTools(supabase, userId),
    ...createEstudosTools(supabase, userId, provider),
    ...createSegundoCerebroTools(supabase, userId),
    ...createBibliotecaTools(supabase, userId),
    ...createDocumentosTools(supabase, userId),
    ...createFinancasTools(supabase, userId),
    ...createWebTools(supabase),
  ];

  const { activeConversationId, setActiveConversationId } = useVexSession();
  const { currentItem } = useCurrentItem();
  const conversationsQuery = useVexConversations(supabase);
  const createConversation = useCreateVexConversation(supabase, userId);
  const renameConversation = useRenameVexConversation(supabase);
  const deleteConversation = useDeleteVexConversation(supabase);
  const appendMessage = useAppendVexMessage(supabase);

  const messagesQuery = useVexMessages(supabase, activeConversationId);
  const loadedForId = useRef<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showList, setShowList] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<Extract<VexTurnResult, { kind: "confirmation_required" }> | null>(null);

  useEffect(() => {
    if (activeConversationId === null) {
      setMessages([]);
      loadedForId.current = null;
      return;
    }
    if (loadedForId.current === activeConversationId) return;
    if (messagesQuery.data) {
      setMessages(messagesQuery.data.map((row) => ({ role: row.role as "user" | "assistant", content: row.content })));
      loadedForId.current = activeConversationId;
    }
  }, [activeConversationId, messagesQuery.data]);

  function startNewConversation() {
    setActiveConversationId(null);
    setNotice(null);
    setPending(null);
    setShowList(false);
  }

  function selectConversation(id: string) {
    setActiveConversationId(id);
    setNotice(null);
    setPending(null);
    setShowList(false);
  }

  async function handleSubmit() {
    const text = input.trim();
    if (!text || isThinking) return;
    setInput("");
    setNotice(null);

    let conversationId = activeConversationId;
    if (!conversationId) {
      const conversation = await createConversation.mutateAsync();
      conversationId = conversation.id;
      loadedForId.current = conversationId;
      setActiveConversationId(conversationId);
    }

    const userMessage: ChatMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    appendMessage.mutate({ conversationId, role: "user", content: text });

    setIsThinking(true);
    const result = await runVexTurn({ provider, messages: [...buildContextMessages(), ...nextMessages], tools });
    await applyResult(result, nextMessages, conversationId);
    setIsThinking(false);
  }

  async function applyResult(result: VexTurnResult, currentMessages: ChatMessage[], conversationId: string) {
    if (result.kind === "message") {
      setMessages([...currentMessages, { role: "assistant", content: result.content }]);
      appendMessage.mutate({ conversationId, role: "assistant", content: result.content });
      setPending(null);
      return;
    }
    if (result.kind === "blocked") {
      setNotice(result.reason);
      return;
    }
    setPending(result);
  }

  async function handleConfirm() {
    if (!pending || !activeConversationId) return;
    setIsThinking(true);
    const result = await confirmVexToolCall({
      provider,
      messages: [...buildContextMessages(), ...messages],
      tools,
      tool: pending.tool,
      args: pending.toolCall.arguments,
    });
    queryClient.invalidateQueries();
    setPending(null);
    await applyResult(result, messages, activeConversationId);
    setIsThinking(false);
  }

  function handleCancel() {
    setPending(null);
    setNotice("Ação cancelada.");
  }

  function startRename(id: string, currentTitle: string) {
    setRenamingId(id);
    setRenameDraft(currentTitle);
  }

  function commitRename() {
    if (renamingId && renameDraft.trim()) {
      renameConversation.mutate({ conversationId: renamingId, title: renameDraft.trim() });
    }
    setRenamingId(null);
  }

  const activeConversation = conversationsQuery.data?.find((c) => c.id === activeConversationId);

  /**
   * Fase 3 do Context Engine: injeta o item em foco na tela (Tarefas/Documentos como piloto) como
   * mais uma mensagem `system`, montada de novo a cada chamada (nunca persistida) — o mesmo
   * princípio do `VEX_SYSTEM_PROMPT`. Sem isso, "muda o prazo disso pra amanhã" não tem como saber
   * a que "disso" se refere.
   */
  function buildContextMessages(): ChatMessage[] {
    const contextMessages: ChatMessage[] = [VEX_SYSTEM_PROMPT];
    if (currentItem) {
      const itemLabel = currentItem.type === "tarefa" ? "a Tarefa" : "o Documento";
      contextMessages.push({
        role: "system",
        content: `Contexto atual: a pessoa está vendo ${itemLabel} "${currentItem.label}" (id: ${currentItem.id}) na tela agora.`,
      });
    }
    return contextMessages;
  }

  const isPage = variant === "page";
  const contextLabel = currentItem
    ? `${pageMeta.title} · ${currentItem.type === "tarefa" ? "Tarefa" : "Documento"} "${currentItem.label}"`
    : pageMeta.title;

  const conversationList = showList && (
    <div className={`${isPage ? "qv-card" : "border-b border-border"} max-h-60 overflow-y-auto p-1.5`}>
      <div className="flex items-center gap-2 px-2.5 pt-1.5 pb-2">
        <span className="qv-eyebrow flex-1">Conversas</span>
        <span className="font-mono text-[11px] text-text-muted">{(conversationsQuery.data ?? []).length}</span>
      </div>
      {(conversationsQuery.data ?? []).length === 0 && (
        <p className="px-2.5 pb-2.5 text-[13px] text-text-secondary">Nenhuma conversa ainda.</p>
      )}
      {(conversationsQuery.data ?? []).map((conversation) => (
        <div
          key={conversation.id}
          className={`flex items-center gap-2 px-2.5 py-2 rounded-[10px] cursor-pointer hover:bg-white/[.04] ${
            conversation.id === activeConversationId ? "bg-[rgba(67,185,210,.10)] text-vex-cyan-bright" : ""
          }`}
        >
          {renamingId === conversation.id ? (
            <input
              autoFocus
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setRenamingId(null);
              }}
              aria-label="Novo nome da conversa"
              className="qv-field flex-1 py-1.5 px-2.5 text-[13px]"
            />
          ) : (
            <span onClick={() => selectConversation(conversation.id)} className="flex-1 truncate text-[13px]">
              {conversation.title}
            </span>
          )}
          <button
            type="button"
            onClick={() => startRename(conversation.id, conversation.title)}
            className="text-[11px] text-text-muted hover:text-text-primary px-1.5 cursor-pointer"
          >
            Renomear
          </button>
          <button
            type="button"
            onClick={() => {
              deleteConversation.mutate(conversation.id);
              if (conversation.id === activeConversationId) startNewConversation();
            }}
            className="text-[11px] text-text-muted hover:text-error px-1.5 cursor-pointer"
          >
            Apagar
          </button>
        </div>
      ))}
    </div>
  );

  const bubbleBase = "rounded-[14px] px-4 py-3.5 text-sm leading-[1.65] border";
  const vexBubble = `${bubbleBase} bg-[rgba(67,185,210,.08)] border-vex-cyan-dark text-text-primary`;
  const userBubble = `${bubbleBase} bg-vex-raised border-border text-text-primary`;
  const vexWidth = isPage ? "max-w-[78%]" : "max-w-[90%]";
  const userWidth = isPage ? "max-w-[70%]" : "max-w-[85%]";

  const messageList = (
    <div className={`flex-1 flex flex-col gap-4 ${isPage ? "px-0.5 py-1" : "overflow-y-auto p-[18px]"}`}>
      {!isPage && (
        <div className="bg-[rgba(67,185,210,.08)] border border-vex-cyan-dark rounded-[14px] p-3.5 flex flex-col gap-2">
          <span className="qv-eyebrow text-vex-cyan-bright">Contexto atual</span>
          <span className="text-sm leading-relaxed">{contextLabel}</span>
        </div>
      )}

      {messages.length === 0 && (
        <div className={`self-start ${vexWidth}`}>
          <div className={vexBubble}>
            <p className="whitespace-pre-line m-0">{GREETING}</p>
          </div>
        </div>
      )}
      {messages.map((message, index) => (
        <div key={index} className={message.role === "user" ? `self-end ${userWidth}` : `self-start ${vexWidth}`}>
          <div className={message.role === "user" ? userBubble : vexBubble}>
            <p className="whitespace-pre-line m-0">{message.content}</p>
          </div>
        </div>
      ))}

      {pending && (
        <div className={`self-start ${vexWidth}`}>
          <div className="qv-card p-4 flex flex-col gap-3">
            <span className="qv-eyebrow text-vex-cyan-bright">Preparado pela Vex · aguardando sua confirmação</span>
            <p className="whitespace-pre-line m-0 text-sm leading-relaxed">{pending.preview}</p>
            <div className="flex gap-2.5 flex-wrap">
              <Button variant="vex" size="sm" onClick={handleConfirm}>
                Confirmar
              </Button>
              <Button variant="quiet" size="sm" onClick={handleCancel}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {notice && (
        <div className={`self-start ${vexWidth}`}>
          <div className={`${bubbleBase} bg-vex-graphite border-border text-text-secondary`}>
            <p className="whitespace-pre-line m-0">{notice}</p>
          </div>
        </div>
      )}

      {isThinking && (
        <div className="self-start">
          <div className={`${vexBubble} flex gap-1.5 items-center`}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-vex-cyan-bright animate-core-glow"
                style={{ animationDelay: `${i * 300}ms` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const suggestions = messages.length === 0 && (
    <div className={isPage ? "flex gap-2 flex-wrap" : "flex flex-col gap-2 px-[18px] pb-3"}>
      {SUGGESTIONS.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          onClick={() => setInput(suggestion)}
          className={`${isPage ? "rounded-full px-3.5 py-[7px]" : "rounded-xl px-3 py-2.5 text-left"} text-[13px] text-text-secondary border border-border cursor-pointer hover:text-text-primary hover:border-text-muted`}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );

  const composer = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className={
        isPage
          ? "qv-card flex gap-2.5 items-center px-3 py-2.5"
          : "flex gap-2.5 items-center px-4 py-3.5 border-t border-border"
      }
    >
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={isPage ? "Pergunte alguma coisa para a Vex" : "Perguntar sobre esta tela"}
        aria-label="Mensagem para a Vex"
        className={
          isPage
            ? "flex-1 bg-transparent border-none outline-none text-[15px] text-text-primary p-2 focus-visible:outline-none"
            : "qv-field flex-1 py-2.5 px-3"
        }
      />
      <Button type="submit" variant="vex" size={isPage ? "md" : "sm"} disabled={isThinking || input.trim().length === 0}>
        Enviar
      </Button>
    </form>
  );

  const headerActions = (
    <>
      <button
        type="button"
        onClick={() => setShowList((v) => !v)}
        aria-expanded={showList}
        className="qv-btn qv-btn-quiet qv-btn-xs"
      >
        Conversas
      </button>
      <button type="button" onClick={startNewConversation} className="qv-btn qv-btn-quiet qv-btn-xs" title="Nova conversa">
        Nova
      </button>
    </>
  );

  if (isPage) {
    return (
      <div className="flex flex-col gap-[18px] max-w-[820px] w-full mx-auto flex-1">
        <div className="qv-card flex items-center gap-3.5 px-[18px] py-3.5 flex-wrap">
          <img
            src={BRAND_ASSETS.vexAvatar}
            alt="Vex"
            className="w-11 h-11 rounded-full object-cover shadow-[0_0_22px_rgba(67,185,210,.3)]"
          />
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            <span className="font-display text-[17px] font-semibold truncate">{activeConversation?.title ?? "Vex"}</span>
            <span className="text-xs text-text-muted truncate">Nova conversa ou continue uma anterior</span>
          </div>
          <span className="flex items-center gap-[7px] text-xs text-vex-cyan-bright">
            <span className="w-[7px] h-[7px] rounded-full bg-vex-cyan-bright animate-core-glow" />
            {isThinking ? "pensando" : "ouvindo"}
          </span>
          {headerActions}
        </div>
        {conversationList}
        {messageList}
        <div className="flex flex-col gap-2.5 sticky bottom-4">
          {suggestions}
          {composer}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col min-h-0">
      <div className="flex items-center gap-3 px-[18px] py-4 border-b border-border">
        <img
          src={BRAND_ASSETS.vexAvatar}
          alt="Vex"
          className="w-9 h-9 rounded-full object-cover shadow-[0_0_18px_rgba(67,185,210,.3)]"
        />
        <div className="flex-1 min-w-0 flex flex-col gap-px">
          <span className="text-[15px] font-semibold truncate">{activeConversation?.title ?? "Vex"}</span>
          <span className="text-[11px] text-text-muted">{isThinking ? "pensando" : "lendo esta tela"}</span>
        </div>
        {headerActions}
        {onClose && (
          <button type="button" onClick={onClose} className="qv-icon-btn w-7 h-7" aria-label="Fechar painel da Vex">
            ✕
          </button>
        )}
      </div>
      {conversationList}
      {messageList}
      {suggestions}
      {composer}
    </div>
  );
}
