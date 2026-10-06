import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowDownIcon, ArrowsOutSimpleIcon, ClockCounterClockwiseIcon, ListIcon, NotePencilIcon, XIcon } from "@phosphor-icons/react";
import { Button, IconButton, Popover, Sheet, Skeleton, VexAvatar, cx } from "@qqorvex/ui";
import { useVexConversations } from "@qqorvex/vex";
import { supabase } from "../app/supabase";
import { useAccount } from "../app/account";
import { useCurrentPageMeta } from "../app/shell/PageMeta";
import { VexComposer, type VexComposerHandle } from "./VexComposer";
import { VexHistory } from "./VexHistory";
import { VexThread, VexWelcome, startersFor } from "./VexThread";
import { useVexChat } from "./useVexChat";

/** Mantém a conversa colada no fim enquanto a pessoa não rolar para cima. */
function useStickToBottom(enabled: boolean, deps: unknown[]) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const [showJump, setShowJump] = useState(false);

  const onScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    pinned.current = distance < 120;
    setShowJump(distance > 240);
  }, []);

  const jump = useCallback((behavior: ScrollBehavior = "smooth") => {
    const element = scrollRef.current;
    if (!element) return;
    pinned.current = true;
    element.scrollTo({ top: element.scrollHeight, behavior });
  }, []);

  useLayoutEffect(() => {
    if (enabled && pinned.current) jump("auto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return { scrollRef, onScroll, showJump, jump };
}

/**
 * Conversa com a Vex em dois formatos: painel lateral (`variant="panel"`, ao lado de qualquer
 * tela) e tela cheia (`/vex`, com histórico). A lógica é uma só (`useVexChat`).
 */
export function VexConversationView({ onClose, variant = "panel" }: { onClose?: () => void; variant?: "panel" | "page" }) {
  const chat = useVexChat();
  const navigate = useNavigate();
  const location = useLocation();
  const pageMeta = useCurrentPageMeta();
  const { firstName } = useAccount();
  const conversations = useVexConversations(supabase);
  const composerRef = useRef<VexComposerHandle>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const isPage = variant === "page";

  const empty = chat.messages.length === 0 && !chat.busy && !chat.pending && !chat.isLoadingConversation;
  const { scrollRef, onScroll, showJump, jump } = useStickToBottom(!empty, [chat.messages, chat.busy, chat.pending, chat.notice, chat.providerIssue, chat.liveStep]);

  const activeTitle = conversations.data?.find((conversation) => conversation.id === chat.activeConversationId)?.title;
  const starters = startersFor(isPage ? "/" : location.pathname);

  useEffect(() => {
    if (isPage && window.matchMedia("(pointer: fine)").matches) composerRef.current?.focus();
  }, [isPage, chat.activeConversationId]);

  function send(text: string, attachment?: File) {
    jump("auto");
    void chat.send(text, { attachment });
  }

  function selectConversation(id: string) {
    chat.selectConversation(id);
    setHistoryOpen(false);
  }

  function newConversation() {
    chat.newConversation();
    setHistoryOpen(false);
    window.requestAnimationFrame(() => composerRef.current?.focus());
  }

  const history = (
    <VexHistory
      activeId={chat.activeConversationId}
      onSelect={selectConversation}
      onDeleted={(id) => {
        if (id === chat.activeConversationId) chat.newConversation();
      }}
      className="h-full"
    />
  );

  const body = (
    <div className="relative min-h-0 flex-1">
      <div ref={scrollRef} onScroll={onScroll} className="h-full overflow-y-auto overscroll-contain" role="log" aria-label="Mensagens da conversa com a Vex" aria-busy={chat.busy}>
        <div className={cx("mx-auto w-full", isPage ? "max-w-3xl px-4 py-6 sm:px-6 sm:py-8" : "px-4 py-4")}>
          {chat.isLoadingConversation ? (
            <div className="flex flex-col gap-5" aria-busy="true">
              <Skeleton className="ml-auto h-10 w-[55%] rounded-2xl" />
              <Skeleton className="h-24 w-[85%] rounded-xl" />
              <Skeleton className="ml-auto h-10 w-[40%] rounded-2xl" />
            </div>
          ) : empty ? (
            <VexWelcome variant={variant} firstName={firstName} starters={starters} onPick={send} />
          ) : (
            <VexThread
              variant={variant}
              messages={chat.messages}
              busy={chat.busy}
              liveStep={chat.liveStep}
              pending={chat.pending}
              notice={chat.notice}
              providerIssue={chat.providerIssue}
              onConfirm={() => void chat.confirm()}
              onCancel={chat.cancel}
              onRetry={() => void chat.retry()}
              onDismissIssue={chat.dismissProviderIssue}
            />
          )}
        </div>
      </div>
      {showJump && (
        <button
          type="button"
          onClick={() => jump()}
          aria-label="Ir para a mensagem mais recente"
          className="absolute bottom-3 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-line bg-overlay text-fg-2 shadow-md hover:text-fg"
        >
          <ArrowDownIcon size={16} />
        </button>
      )}
    </div>
  );

  const composer = (
    <div className={cx("shrink-0", isPage ? "mx-auto w-full max-w-3xl px-4 pb-4 sm:px-6" : "border-t border-line-soft p-3")}>
      <VexComposer ref={composerRef} variant={variant} busy={chat.busy} onSend={send} onStop={chat.stop} />
      {isPage && <p className="mt-2 text-center text-[11px] text-fg-4">A Vex pode se enganar. Confira informações importantes.</p>}
    </div>
  );

  if (isPage) {
    return (
      <div className="flex h-[calc(100dvh-3.5rem-60px-env(safe-area-inset-bottom))] min-h-0 lg:h-[calc(100dvh-3.5rem)]">
        <aside aria-label="Conversas" className="hidden w-[272px] shrink-0 flex-col border-r border-line bg-surface lg:flex">
          <div className="flex items-center gap-2 px-3 pb-2 pt-3">
            <Button variant="secondary" size="sm" fullWidth leadingIcon={<NotePencilIcon size={15} />} onClick={newConversation}>
              Nova conversa
            </Button>
          </div>
          <div className="min-h-0 flex-1 px-2">{history}</div>
        </aside>

        <section aria-label="Conversa com a Vex" className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line-soft px-3 sm:px-4">
            <IconButton label="Conversas" className="lg:hidden" onClick={() => setHistoryOpen(true)}>
              <ListIcon />
            </IconButton>
            <p className="min-w-0 flex-1 truncate text-[14px] font-medium text-fg">{activeTitle ?? "Nova conversa"}</p>
            {chat.messages.length > 0 && (
              <IconButton label="Nova conversa" onClick={newConversation}>
                <NotePencilIcon />
              </IconButton>
            )}
          </header>
          {body}
          {composer}
        </section>

        <Sheet isOpen={historyOpen} onClose={() => setHistoryOpen(false)} title="Conversas" width={360} actions={
          <Button size="sm" variant="secondary" leadingIcon={<NotePencilIcon size={15} />} onClick={newConversation}>
            Nova
          </Button>
        }>
          <div className="-mx-4 h-full">{history}</div>
        </Sheet>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-surface">
      <header className="flex h-14 shrink-0 items-center gap-2.5 border-b border-line px-3">
        <VexAvatar size={30} status={chat.busy ? "thinking" : undefined} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold leading-tight text-fg">{activeTitle ?? "Vex"}</p>
          <p className="truncate text-[11.5px] text-fg-4">{chat.busy ? "Pensando…" : `Vendo ${pageMeta.title}`}</p>
        </div>
        <Popover
          label="Conversas"
          placement="bottom-end"
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          className="flex h-[min(440px,70dvh)] w-[300px] flex-col p-2"
          trigger={(props) => (
            <IconButton {...props} label="Conversas anteriores" active={historyOpen}>
              <ClockCounterClockwiseIcon />
            </IconButton>
          )}
        >
          {history}
        </Popover>
        <IconButton label="Nova conversa" onClick={newConversation}>
          <NotePencilIcon />
        </IconButton>
        <IconButton label="Abrir em tela cheia" onClick={() => navigate("/vex")}>
          <ArrowsOutSimpleIcon />
        </IconButton>
        {onClose && (
          <IconButton label="Fechar a Vex" onClick={onClose}>
            <XIcon />
          </IconButton>
        )}
      </header>
      {body}
      {composer}
    </div>
  );
}
