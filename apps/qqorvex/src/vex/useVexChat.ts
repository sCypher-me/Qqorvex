import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  EchoProvider,
  GeminiProvider,
  PLAN_TOOL_NAME,
  keepPlanSteps,
  normalizeVexStyle,
  previewPlanSteps,
  readPlanSteps,
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
  useVexMemories,
  useVexMessages,
  vexMemoriesContext,
  type ChatMessage,
  type PlanStepResult,
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
import { latestVexRequestHasCompletedAction, prepareVexRetryHistory } from "./retryHistory";
import { buildVexAttachmentChatMessages, decodeVexAttachmentMessage, encodeVexAttachmentMessage, extractVexFile } from "./fileAttachments";

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
const FALLBACK_MESSAGE_MARKER = "[Resposta em modo básico] ";
const FALLBACK_AFTER_ACTION_MARKER = "[Resposta em modo básico após ação confirmada] ";

export type ActionStatus = "done" | "cancelled" | "failed";

export type PlanStepStatus = "feito" | "falhou" | "retirado";

export type DisplayMessage =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; content: string; steps?: VexStep[]; fallback?: boolean; completedAction?: boolean }
  | { id: string; role: "action"; action: VexActionPreview; status: ActionStatus; planSteps?: Array<{ title: string; status: PlanStepStatus }> };

export interface PendingAction {
  tool: ToolDefinition;
  args: Record<string, unknown>;
  action: VexActionPreview;
  steps: VexStep[];
  conversationId: string;
  history: DisplayMessage[];
  /** Plano com várias ações: cada passo como aparece no cartão, e os que a pessoa retirou. */
  plan?: VexActionPreview[];
  excluded?: number[];
}

function planPending(base: Omit<PendingAction, "plan" | "excluded">, tools: ToolDefinition[]): PendingAction {
  if (base.tool.name !== PLAN_TOOL_NAME) return base;
  return { ...base, plan: previewPlanSteps(readPlanSteps(base.args), tools), excluded: [] };
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
  return history.flatMap((message): ChatMessage[] => {
    if (message.role === "action") return [{ role: "assistant", content: actionRecord(message.status, message.action) }];
    if (message.role === "assistant" && message.fallback) return [];
    if (message.role === "user") {
      const attachment = decodeVexAttachmentMessage(message.content);
      if (!attachment) return [{ role: "user", content: message.content }];
      return buildVexAttachmentChatMessages(attachment.prompt, attachment.file);
    }
    return [{ role: message.role, content: message.content }];
  });
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
  const memoriesQuery = useVexMemories(supabase, Boolean(userId));
  const memories = memoriesQuery.data;

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [liveStep, setLiveStep] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [notice, setNotice] = useState<VexNotice | null>(null);
  const [providerIssue, setProviderIssue] = useState<ProviderIssue | null>(null);

  const loadedFor = useRef<string | null>(null);
  const turnRef = useRef(0);
  const fallbackEpochRef = useRef(0);
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
    setMessages(messagesQuery.data.map((row) => {
      const completedAction = row.role !== "user" && row.content.startsWith(FALLBACK_AFTER_ACTION_MARKER);
      const fallback = completedAction || (row.role !== "user" && row.content.startsWith(FALLBACK_MESSAGE_MARKER));
      const marker = completedAction ? FALLBACK_AFTER_ACTION_MARKER : FALLBACK_MESSAGE_MARKER;
      return {
        id: row.id,
        role: row.role === "user" ? "user" as const : "assistant" as const,
        content: fallback ? row.content.slice(marker.length) : row.content,
        ...(fallback ? { fallback: true } : {}),
        ...(completedAction ? { completedAction: true } : {}),
      };
    }));
  }, [activeConversationId, messagesQuery.data]);

  useEffect(() => {
    const onProviderError = (event: Event) => {
      fallbackEpochRef.current += 1;
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
        ...vexMemoriesContext(memories ?? []),
        ...toChat(history),
      ]),
    [currentItem, firstName, location.pathname, memories, pageMeta.subtitle, pageMeta.title],
  );

  const applyResult = useCallback(
    (result: VexTurnResult, history: DisplayMessage[], conversationId: string, usedFallback = false) => {
      if (result.kind === "blocked") {
        setNotice({ text: result.reason, tone: "info" });
        return history;
      }
      if (result.kind === "confirmation_required") {
        setPending(planPending({ tool: result.tool, args: result.toolCall.arguments, action: result.action, steps: result.steps, conversationId, history }, tools));
        return history;
      }
      const content = result.content.trim() || "Não recebi uma resposta desta vez. Pode reformular?";
      const completedAction = latestVexRequestHasCompletedAction(history);
      const next: DisplayMessage[] = [...history, { id: uid(), role: "assistant", content, steps: result.steps, fallback: usedFallback, completedAction }];
      setMessages(next);
      const marker = completedAction ? FALLBACK_AFTER_ACTION_MARKER : FALLBACK_MESSAGE_MARKER;
      appendMessage.mutate({ conversationId, role: "assistant", content: usedFallback ? `${marker}${content}` : content });
      return next;
    },
    [appendMessage, tools],
  );

  const runTurn = useCallback(
    async (history: DisplayMessage[], conversationId: string) => {
      const turn = (turnRef.current += 1);
      setBusy(true);
      setLiveStep(null);
      try {
        const fallbackEpoch = fallbackEpochRef.current;
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
        applyResult(result, history, conversationId, fallbackEpochRef.current > fallbackEpoch);
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
    async (raw: string, options: { fresh?: boolean; attachment?: File } = {}) => {
      const typedText = raw.trim();
      if ((!typedText && !options.attachment) || !userId) return;
      const prompt = typedText || "Leia o arquivo anexado e me pergunte o que eu gostaria de fazer com ele.";
      setNotice(null);
      setProviderIssue(null);
      const sendTurn = (turnRef.current += 1);
      setBusy(true);
      setLiveStep(options.attachment ? "Lendo o arquivo" : null);

      let text = prompt;
      if (options.attachment) {
        try {
          const extractedFile = await extractVexFile(options.attachment);
          if (sendTurn !== turnRef.current) return;
          text = encodeVexAttachmentMessage(prompt, extractedFile);
        } catch (error) {
          if (sendTurn === turnRef.current) {
            const detail = error instanceof Error && error.message ? error.message : "Não consegui ler esse arquivo.";
            setBusy(false);
            setLiveStep(null);
            setNotice({ text: detail, tone: "error" });
          }
          return;
        }
      }
      if (sendTurn !== turnRef.current) return;
      setLiveStep(null);
      const skipped = pendingRef.current;
      setPending(null);
      // Escrever outra coisa com uma ação aguardando equivale a recusá-la.
      const base: DisplayMessage[] = options.fresh ? [] : skipped ? [...skipped.history, { id: uid(), role: "action", action: skipped.action, status: "cancelled" }] : messagesRef.current;
      const history: DisplayMessage[] = [...base, { id: uid(), role: "user", content: text }];
      setMessages(history);

      let conversationId = options.fresh ? null : conversationRef.current;
      try {
        if (!conversationId) {
          const conversation = await createConversation.mutateAsync();
          if (sendTurn !== turnRef.current) return;
          conversationId = conversation.id;
          loadedFor.current = conversationId;
          conversationRef.current = conversationId;
          setActiveConversationId(conversationId);
          renameConversation.mutate({ conversationId, title: titleFromPrompt(prompt) });
        }
        appendMessage.mutate({ conversationId, role: "user", content: text });
      } catch {
        if (sendTurn === turnRef.current) {
          setBusy(false);
          setNotice({ text: "Não consegui iniciar a conversa. Verifique a conexão e tente de novo.", tone: "error", retry: true });
        }
        return;
      }
      await runTurn(history, conversationId);
    },
    [appendMessage, createConversation, renameConversation, runTurn, setActiveConversationId, userId],
  );

  /** Refaz o último pedido sem duplicar a mensagem da pessoa. */
  const retry = useCallback(async () => {
    const history = messagesRef.current;
    const lastUser = [...history].reverse().find((message) => message.role === "user");
    setNotice(null);
    setProviderIssue(null);
    if (pendingRef.current || !lastUser || latestVexRequestHasCompletedAction(history)) return;
    const conversationId = conversationRef.current;
    if (!conversationId) {
      await send(lastUser.content, { fresh: true });
      return;
    }
    const retryHistory = prepareVexRetryHistory(history, uid());
    if (!retryHistory) return;
    setMessages(retryHistory);
    appendMessage.mutate({ conversationId, role: "user", content: lastUser.content });
    await runTurn(retryHistory, conversationId);
  }, [appendMessage, runTurn, send]);

  const stop = useCallback(() => {
    turnRef.current += 1;
    setBusy(false);
    setLiveStep(null);
    setNotice({ text: "Resposta interrompida.", tone: "info", retry: true });
  }, []);

  const confirm = useCallback(async () => {
    if (!pending) return;
    const current = pending;
    // Plano: só os passos que a pessoa manteve (índices originais).
    const kept = current.plan ? current.plan.map((_, index) => index).filter((index) => !current.excluded?.includes(index)) : [];
    if (current.plan && kept.length === 0) return cancelRef.current();
    const args = current.plan ? keepPlanSteps(current.args, kept) : current.args;
    setPending(null);
    setProviderIssue(null);
    const turn = (turnRef.current += 1);
    setBusy(true);
    try {
      const fallbackEpoch = fallbackEpochRef.current;
      const result = await confirmVexToolCall({
        provider,
        messages: contextFor(current.history),
        tools,
        vexStyle,
        tool: current.tool,
        args,
        onStep: (step) => {
          if (turn === turnRef.current) setLiveStep(step.label);
        },
      });
      void queryClient.invalidateQueries();
      const failed = result.kind === "message" && result.steps[0]?.ok === false;

      // Recibo do plano: o que foi feito, o que falhou e o que a pessoa retirou — o modelo também vê isso
      // e não repete o que já deu certo.
      const planResults = result.kind !== "blocked" ? ((result.executed?.data as { results?: PlanStepResult[] } | undefined)?.results ?? []) : [];
      const statusOf = (index: number): PlanStepStatus => {
        const position = kept.indexOf(index);
        if (position < 0) return "retirado";
        return planResults[position]?.ok ? "feito" : "falhou";
      };
      const planSteps = current.plan?.map((preview, index) => ({ title: preview.title, status: statusOf(index) }));
      const action: VexActionPreview = planSteps
        ? { title: current.action.title, fields: planSteps.map((step, index) => ({ label: `${index + 1}. ${step.title}`, value: step.status })) }
        : current.action;
      const history: DisplayMessage[] = [...current.history, { id: uid(), role: "action", action, status: failed ? "failed" : "done", ...(planSteps ? { planSteps } : {}) }];
      if (turn !== turnRef.current) {
        setMessages(history);
        return;
      }
      setMessages(history);
      // O primeiro passo é a própria ação confirmada (já aparece no recibo), não uma consulta.
      const after = applyResult(result.kind === "blocked" ? result : { ...result, steps: result.steps.slice(1) }, history, current.conversationId, fallbackEpochRef.current > fallbackEpoch);

      // Passos que falharam voltam como um novo plano, só com eles, para tentar de novo sem repetir o resto.
      const failedSteps = current.plan && planResults.length > 0 ? kept.filter((index) => statusOf(index) === "falhou") : [];
      if (failedSteps.length > 0 && result.kind === "message" && turn === turnRef.current) {
        const retryArgs = keepPlanSteps(current.args, failedSteps);
        setPending(
          planPending(
            {
              tool: current.tool,
              args: retryArgs,
              action: { title: failedSteps.length === 1 ? "Tentar de novo a ação que falhou" : `Tentar de novo as ${failedSteps.length} ações que falharam`, fields: [] },
              steps: [],
              conversationId: current.conversationId,
              history: after,
            },
            tools,
          ),
        );
      } else if (failed && fallbackEpochRef.current === fallbackEpoch) {
        setNotice({ text: "Não consegui concluir essa ação. O pedido original continua aqui; tente novamente quando a conexão estabilizar.", tone: "error", retry: true });
      }
    } catch {
      setMessages([...current.history, { id: uid(), role: "action", action: current.action, status: "failed" }]);
      setNotice({ text: "Não consegui verificar se a ação foi concluída. Confira a área correspondente antes de tentar novamente.", tone: "error" });
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
    setProviderIssue(null);
  }, [pending]);
  const cancelRef = useRef(cancel);
  cancelRef.current = cancel;

  /** Retira ou devolve um passo do plano antes de confirmar. */
  const toggleStep = useCallback((index: number) => {
    setPending((current) => {
      if (!current?.plan) return current;
      const excluded = current.excluded ?? [];
      return { ...current, excluded: excluded.includes(index) ? excluded.filter((item) => item !== index) : [...excluded, index] };
    });
  }, []);

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
    toggleStep,
    newConversation,
    selectConversation,
    dismissNotice: () => setNotice(null),
    dismissProviderIssue: () => setProviderIssue(null),
  };
}

export type VexChat = ReturnType<typeof useVexChat>;
