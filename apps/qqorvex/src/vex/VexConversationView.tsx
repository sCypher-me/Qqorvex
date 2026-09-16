import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@qqorvex/ui";
import {
  EchoProvider,
  OllamaProvider,
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

const ollamaModel = import.meta.env.VITE_OLLAMA_MODEL ?? "qwen2.5:7b";
const provider = new ResilientProvider(new OllamaProvider(ollamaModel), new EchoProvider());

const GREETING =
  "Oi! Sou a Vex. Posso ajudar com Tarefas, Agenda, Metas & Hábitos, Estudos, Segundo Cérebro, Biblioteca, Documentos e Finanças.";

/**
 * Corpo do chat sem chrome de janela — `VexPanel` (painel retrátil) e `VexPage` (`/vex` em tela
 * cheia) decoram isso de formas diferentes, mas a lógica de conversa/ferramentas/confirmação é uma
 * só. `onClose` só existe pro painel (a página não fecha, ela navega pra outro lugar).
 */
export function VexConversationView({ onClose }: { onClose?: () => void }) {
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

  return (
    <div className="bg-surface-1 border border-border rounded-lg w-full h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border gap-2">
        <button
          type="button"
          onClick={() => setShowList((v) => !v)}
          className="text-text-secondary-warm hover:text-text-primary"
          title="Conversas"
        >
          ☰
        </button>
        <h2 className="font-display text-lg font-semibold text-text-primary flex-1 truncate text-center">
          {activeConversation?.title ?? "Vex"}
        </h2>
        <button type="button" onClick={startNewConversation} className="text-text-secondary-warm hover:text-text-primary" title="Nova conversa">
          +
        </button>
        {onClose && (
          <button type="button" onClick={onClose} className="text-text-secondary-warm hover:text-text-primary">
            ✕
          </button>
        )}
      </div>

      {showList && (
        <div className="border-b border-border max-h-48 overflow-y-auto">
          {(conversationsQuery.data ?? []).length === 0 && (
            <p className="p-3 text-sm text-text-secondary-warm font-sans">Nenhuma conversa ainda.</p>
          )}
          {(conversationsQuery.data ?? []).map((conversation) => (
            <div
              key={conversation.id}
              className={`flex items-center gap-2 p-2 px-3 hover:bg-surface-2 cursor-pointer ${
                conversation.id === activeConversationId ? "bg-surface-2" : ""
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
                  className="flex-1 rounded border border-border bg-surface-1 px-2 py-1 text-sm text-text-primary outline-none"
                />
              ) : (
                <span onClick={() => selectConversation(conversation.id)} className="flex-1 truncate text-sm text-text-primary font-sans">
                  {conversation.title}
                </span>
              )}
              <button
                type="button"
                onClick={() => startRename(conversation.id, conversation.title)}
                className="text-xs text-text-secondary-warm hover:text-text-primary"
                title="Renomear"
              >
                ✎
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteConversation.mutate(conversation.id);
                  if (conversation.id === activeConversationId) startNewConversation();
                }}
                className="text-xs text-text-secondary-warm hover:text-text-primary"
                title="Apagar"
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="self-start max-w-[85%]">
            <div className="rounded-md p-3 text-sm font-sans bg-surface-2 border border-border text-text-primary">
              <p className="whitespace-pre-line">{GREETING}</p>
            </div>
          </div>
        )}
        {messages.map((message, index) => (
          <div key={index} className={message.role === "user" ? "self-end max-w-[85%]" : "self-start max-w-[85%]"}>
            <div
              className={`rounded-md p-3 text-sm font-sans ${
                message.role === "user" ? "bg-brand-cyan text-background" : "bg-surface-2 border border-border text-text-primary"
              }`}
            >
              <p className="whitespace-pre-line">{message.content}</p>
            </div>
          </div>
        ))}

        {pending && (
          <div className="self-start max-w-[85%]">
            <div className="rounded-md p-3 text-sm font-sans bg-surface-2 border border-border text-text-primary">
              <p className="whitespace-pre-line">Confirma esta ação? {pending.preview}</p>
              <div className="flex gap-2 mt-2">
                <Button variant="secondary" onClick={handleConfirm}>
                  Confirmar
                </Button>
                <Button variant="ghost" onClick={handleCancel}>
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        {notice && (
          <div className="self-start max-w-[85%]">
            <div className="rounded-md p-3 text-sm font-sans bg-surface-2 border border-border text-text-primary">
              <p className="whitespace-pre-line">{notice}</p>
            </div>
          </div>
        )}

        {isThinking && (
          <div className="self-start max-w-[85%]">
            <div className="rounded-md p-3 text-sm font-sans bg-surface-2 border border-border text-text-primary flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-text-secondary-warm animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-text-secondary-warm animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-text-secondary-warm animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="flex gap-2 p-4 border-t border-border"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Fale com a Vex..."
          className="flex-1 rounded-md border border-border bg-surface-2 px-3 py-2 text-text-primary outline-none focus:border-brand-cyan"
        />
        <Button type="submit" variant="primary">
          Enviar
        </Button>
      </form>
    </div>
  );
}
