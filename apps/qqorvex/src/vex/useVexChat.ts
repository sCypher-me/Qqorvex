import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  EchoProvider,
  GeminiProvider,
  normalizeVexStyle,
  OllamaProvider,
  ResilientProvider,
  VEX_SYSTEM_PROMPT,
  actionRecord,
  buildVexContext,
  confirmVexToolCall,
  createVexTools,
  runVexTurn,
  trimVexContext,
  useAppendVexMessage,
  useCreateVexConversation,
  useRenameVexConversation,
  useVexMessages,
  type ChatMessage,
  type ToolDefinition,
  type VexActionPreview,
  type VexStep,
  type VexTurnResult,
} from "@qqorvex/vex";
import { supabase } from "../app/supabase";
import { useAuth } from "@qqorvex/auth";
import { useAccount } from "../app/account";
import { useCurrentPageMeta } from "../app/shell/PageMeta";
import { useCurrentItem } from "./CurrentItemContext";
import { useVexSession } from "./VexSessionContext";
import { titleFromPrompt } from "./helpers";

/**
 * Cadeia de provedores: Gemini hospedado (funciona de qualquer lugar) → Ollama local, só em
 * desenvolvimento e se ligado → Echo (nunca falha; entende comandos simples por padrão de texto).
 */
const hostedProvider = new GeminiProvider(supabase);
const provider =
  import.meta.env.DEV && import.meta.env.VITE_VEX_USE_OLLAMA === "true"
    ? new ResilientProvider(hostedProvider, new ResilientProvider(new OllamaProvider(import.meta.env.VITE_OLLAMA_MODEL ?? "qwen2.5:7b"), new EchoProvider()))
    : new ResilientProvider(hostedProvider, new EchoProvider());

const PROVIDER_ERROR_EVENT = "qv:vex-provider-error";

export type ActionStatus = "done" | "cancelled" | "failed";

export type DisplayMessage =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; content: string; steps?: VexStep[] }
  | { id: string; role: "action"; action: VexActionPreview; status: ActionStatus };

export interface PendingAction {
  tool: ToolDefinition;
  args: Record<string, unknown>;
  action: VexActionPreview;
  steps: VexStep[];
  conversationId: string;
  history: DisplayMessage[];
}

export interface VexNotice {
  text: string;
  tone: "error" | "info";
  retry?: boolean;
}

export interface ProviderIssue {
  message: string;
  quota: boolean;
}

let sequence = 0;
const uid = () => `m${Date.now().toString(36)}${(sequence += 1)}`;

/** Histórico para o modelo. Ações (confirmadas, recusadas ou que falharam) entram como registro. */
function toChat(history: DisplayMessage[]): ChatMessage[] {
  return history.map((message): ChatMessage =>
    message.role === "action"
      ? { role: "assistant", content: actionRecord(message.status, message.action) }
      : { role: message.role, content: message.content },
  );
}

/**
 * Todo o estado de uma conversa com a Vex: mensagens, consultas em andamento, ação aguardando
 * confirmação, avisos e a conversa persistida. O painel lateral e a tela /vex usam o mesmo hook.
 */
export function useVexChat() {
  const { session } = useAuth();
  const { userId, firstName } = useAccount();
  const preferences = session?.user.user_metadata.qqorvex_preferences;
  const vexStyle = normalizeVexStyle(preferences && typeof preferences === "object" ? (preferences as Record<string, unknown>).vex_style : undefined);
  const queryClient = useQueryClient();
  const location = useLocation();
  const pageMeta = useCurrentPageMeta();
  const { currentItem } = useCurrentItem();
  const { activeConversationId, setActiveConversationId, pendingPrompt, setPendingPrompt } = useVexSession();

  const tools = useMemo(() => (userId ? createVexTools(supabase, userId, provider, { tmdbApiKey: import.meta.env.VITE_TMDB_API_KEY }) : []), [userId]);
  const createConversation = useCreateVexConversation(supabase, userId ?? "");
  const renameConversation = useRenameVexConversation(supabase);
  const appendMessage = useAppendVexMessage(supabase);
  const messagesQuery = useVexMessages(supabase, activeConversationId);

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [liveStep, setLiveStep] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [notice, setNotice] = useState<VexNotice | null>(null);
  const [providerIssue, setProviderIssue] = useState<ProviderIssue | null>(null);

  const loadedFor = useRef<string | null>(null);
  const turnRef = useRef(0);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const conversationRef = useRef<string | null>(activeConversationId);

  // Carrega a conversa escolhida (uma vez por id; mensagens novas já estão no estado local).
  useEffect(() => {
    conversationRef.current = activeConversationId;
    if (!activeConversationId || loadedFor.current === activeConversationId || !messagesQuery.data) return;
    loadedFor.current = activeConversationId;
    setMessages(messagesQuery.data.map((row) => ({ id: row.id, role: row.role === "user" ? "user" : "assistant", content: row.content })));
  }, [activeConversationId, messagesQuery.data]);

  useEffect(() => {
    const onProviderError = (event: Event) => {
      const message = (event as CustomEvent<{ message?: string }>).detail?.message?.trim() ?? "";
      setProviderIssue({ message, quota: /limite/i.test(message) && /vex/i.test(message) });
    };
    window.addEventListener(PROVIDER_ERROR_EVENT, onProviderError);
    return () => window.removeEventListener(PROVIDER_ERROR_EVENT, onProviderError);
  }, []);

  const contextFor = useCallback(
    (history: DisplayMessage[]): ChatMessage[] =>
      trimVexContext([
        VEX_SYSTEM_PROMPT,
        ...buildVexContext({
          now: new Date(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          userName: firstName,
          page: location.pathname === "/vex" ? null : { title: pageMeta.title, subtitle: pageMeta.subtitle },
          currentItem,
        }),
        ...toChat(history),
      ]),
    [currentItem, firstName, location.pathname, pageMeta.subtitle, pageMeta.title],
  );

  const applyResult = useCallback(
    (result: VexTurnResult, history: DisplayMessage[], conversationId: string) => {
      if (result.kind === "blocked") {
        setNotice({ text: result.reason, tone: "info" });
        return;
      }
      if (result.kind === "confirmation_required") {
        setPending({ tool: result.tool, args: result.toolCall.arguments, action: result.action, steps: result.steps, conversationId, history });
        return;
      }
      const content = result.content.trim() || "Não recebi uma resposta desta vez. Pode reformular?";
      setMessages([...history, { id: uid(), role: "assistant", content, steps: result.steps }]);
      appendMessage.mutate({ conversationId, role: "assistant", content });
    },
    [appendMessage],
  );

  const runTurn = useCallback(
    async (history: DisplayMessage[], conversationId: string) => {
      const turn = (turnRef.current += 1);
      setBusy(true);
      setLiveStep(null);
      try {
        const result = await runVexTurn({
          provider,
          messages: contextFor(history),
          tools,
          vexStyle,
          onStep: (step) => {
            if (turn === turnRef.current) setLiveStep(step.label);
          },
        });
        if (turn !== turnRef.current) return;
        applyResult(result, history, conversationId);
      } catch {
        if (turn === turnRef.current) setNotice({ text: "Não consegui responder agora. Verifique a conexão e tente de novo.", tone: "error", retry: true });
      } finally {
        if (turn === turnRef.current) {
          setBusy(false);
          setLiveStep(null);
        }
      }
    },
    [applyResult, contextFor, tools, vexStyle],
  );

  const send = useCallback(
    async (raw: string, options: { fresh?: boolean } = {}) => {
      const text = raw.trim();
      if (!text || !userId) return;
      setNotice(null);
      const skipped = pendingRef.current;
      setPending(null);
      // Escrever outra coisa com uma ação aguardando equivale a recusá-la.
      const base: DisplayMessage[] = options.fresh ? [] : skipped ? [...skipped.history, { id: uid(), role: "action", action: skipped.action, status: "cancelled" }] : messagesRef.current;
      const history: DisplayMessage[] = [...base, { id: uid(), role: "user", content: text }];
      setMessages(history);
      setBusy(true);

      let conversationId = options.fresh ? null : conversationRef.current;
      try {
        if (!conversationId) {
          const conversation = await createConversation.mutateAsync();
          conversationId = conversation.id;
          loadedFor.current = conversationId;
          conversationRef.current = conversationId;
          setActiveConversationId(conversationId);
          renameConversation.mutate({ conversationId, title: titleFromPrompt(text) });
        }
        appendMessage.mutate({ conversationId, role: "user", content: text });
      } catch {
        setBusy(false);
        setNotice({ text: "Não consegui iniciar a conversa. Verifique a conexão e tente de novo.", tone: "error", retry: true });
        return;
      }
      await runTurn(history, conversationId);
    },
    [appendMessage, createConversation, renameConversation, runTurn, setActiveConversationId, userId],
  );

  /** Refaz o último pedido sem duplicar a mensagem da pessoa. */
  const retry = useCallback(async () => {
    const history = messagesRef.current;
    const last = history.at(-1);
    setNotice(null);
    if (last?.role !== "user") return;
    if (!conversationRef.current) {
      await send(last.content, { fresh: true });
      return;
    }
    await runTurn(history, conversationRef.current);
  }, [runTurn, send]);

  const stop = useCallback(() => {
    turnRef.current += 1;
    setBusy(false);
    setLiveStep(null);
    setNotice({ text: "Resposta interrompida.", tone: "info", retry: true });
  }, []);

  const confirm = useCallback(async () => {
    if (!pending) return;
    const current = pending;
    setPending(null);
    const turn = (turnRef.current += 1);
    setBusy(true);
    try {
      const result = await confirmVexToolCall({
        provider,
        messages: contextFor(current.history),
        tools,
        vexStyle,
        tool: current.tool,
        args: current.args,
        onStep: (step) => {
          if (turn === turnRef.current) setLiveStep(step.label);
        },
      });
      void queryClient.invalidateQueries();
      const failed = result.kind === "message" && result.steps[0]?.ok === false;
      const history: DisplayMessage[] = [...current.history, { id: uid(), role: "action", action: current.action, status: failed ? "failed" : "done" }];
      if (turn !== turnRef.current) {
        setMessages(history);
        return;
      }
      setMessages(history);
      // O primeiro passo é a própria ação confirmada (já aparece no recibo), não uma consulta.
      applyResult(result.kind === "blocked" ? result : { ...result, steps: result.steps.slice(1) }, history, current.conversationId);
    } catch {
      setMessages([...current.history, { id: uid(), role: "action", action: current.action, status: "failed" }]);
      setNotice({ text: "Não consegui concluir essa ação. Nada foi alterado.", tone: "error" });
    } finally {
      if (turn === turnRef.current) {
        setBusy(false);
        setLiveStep(null);
      }
    }
  }, [applyResult, contextFor, pending, queryClient, tools, vexStyle]);

  const cancel = useCallback(() => {
    if (!pending) return;
    setMessages([...pending.history, { id: uid(), role: "action", action: pending.action, status: "cancelled" }]);
    setPending(null);
  }, [pending]);

  const reset = useCallback(() => {
    turnRef.current += 1;
    setMessages([]);
    setPending(null);
    setNotice(null);
    setProviderIssue(null);
    setBusy(false);
    setLiveStep(null);
  }, []);

  const newConversation = useCallback(() => {
    reset();
    loadedFor.current = null;
    conversationRef.current = null;
    setActiveConversationId(null);
  }, [reset, setActiveConversationId]);

  const selectConversation = useCallback(
    (id: string) => {
      if (id === conversationRef.current) return;
      reset();
      loadedFor.current = null;
      setActiveConversationId(id);
    },
    [reset, setActiveConversationId],
  );

  // Pedido vindo de outro lugar do app ("Planejar meu dia", paleta de comandos): nova conversa.
  useEffect(() => {
    if (!pendingPrompt || !userId) return;
    const prompt = pendingPrompt;
    setPendingPrompt(null);
    reset();
    void send(prompt, { fresh: true });
  }, [pendingPrompt, reset, send, setPendingPrompt, userId]);

  return {
    messages,
    busy,
    liveStep,
    pending,
    notice,
    providerIssue,
    isLoadingConversation: Boolean(activeConversationId) && messagesQuery.isLoading && messages.length === 0,
    activeConversationId,
    send,
    retry,
    stop,
    confirm,
    cancel,
    newConversation,
    selectConversation,
    dismissNotice: () => setNotice(null),
    dismissProviderIssue: () => setProviderIssue(null),
  };
}

export type VexChat = ReturnType<typeof useVexChat>;
