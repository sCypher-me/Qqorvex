import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from "@phosphor-icons/react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button } from "@qqorvex/ui";
import { uploadDocument, getDownloadUrl } from "@qqorvex/module-documentos";
import type { Document } from "@qqorvex/module-documentos";
import type { Task } from "@qqorvex/module-tarefas";
import type { CalendarEvent } from "@qqorvex/module-agenda";
import { BLOCK_TYPE_LABELS, defaultContentForBlockType, resolveEmbedUrl } from "../service";
import { SlashMenu } from "./SlashMenu";
import { CodeSnippetEditor } from "./CodeSnippetEditor";
import { EDITABLE_BLOCK_TYPES } from "../types";
import type {
  Block,
  BlockType,
  ChecklistBlockContent,
  CodeBlockContent,
  EditableBlockType,
  EmbedBlockContent,
  EntityReferenceBlockContent,
  EquationBlockContent,
  LinkBlockContent,
  MediaBlockContent,
  Page,
  PageReferenceBlockContent,
  TableBlockContent,
  TextBlockContent,
  ToggleBlockContent,
} from "../types";

const TASK_STATUS_LABEL: Record<Task["status"], string> = {
  nao_iniciado: "Não iniciado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

const TEXT_SHAPED_TYPES: EditableBlockType[] = ["texto", "titulo1", "titulo2", "titulo3", "lista", "citacao", "callout"];

const TEXT_INPUT_CLASS_BY_TYPE: Partial<Record<EditableBlockType, string>> = {
  titulo1: "font-display text-[22px] leading-[1.35] font-semibold text-fg",
  titulo2: "font-display text-lg leading-[1.4] font-semibold text-fg",
  titulo3: "font-display text-base leading-[1.5] font-semibold text-fg",
  citacao:
    "text-[15px] leading-[1.75] text-fg border-l-2 border-gold-line bg-surface rounded-r-[12px] px-4 py-[14px]",
  callout: "text-[15px] leading-[1.75] text-fg bg-surface border border-line rounded-[12px] px-4 py-3",
};

const BLOCK_TYPE_ICON: Partial<Record<EditableBlockType, string>> = {
  lista: "•",
};

/** Campo "invisível" do corpo do editor — o texto fica no fluxo da página, sem caixa. */
const INLINE_INPUT_CLASS = "flex-1 min-w-0 bg-transparent outline-none placeholder:text-fg-4";

/** Rótulo discreto que substitui ícones decorativos nos blocos de referência/mídia. */
function KindLabel({ children }: { children: string }) {
  return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-hover text-fg-2 shrink-0">{children}</span>;
}

const CONTROL_BUTTON_CLASS = "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-fg-3 transition-colors hover:bg-hover hover:text-fg disabled:pointer-events-none disabled:opacity-30";

/** Textarea que cresce com o texto (blocos de texto quebram linha em vez de rolar para o lado). */
function autoGrow(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

function isCaretAtStart(el: HTMLInputElement | HTMLTextAreaElement): boolean {
  return el.selectionStart === 0 && el.selectionEnd === 0;
}

/**
 * Um bloco = um componente, `key={block.id}` no pai preserva esta instância (e seu estado local
 * de digitação) entre reordenações — só remonta quando o bloco realmente muda de identidade.
 * Salva no blur/Enter/checkbox, nunca a cada tecla.
 */
export function BlockRow({
  block,
  isFirst,
  isLast,
  client,
  userId,
  documents,
  pages,
  currentPageId,
  tasks,
  events,
  registerInputRef,
  onUpdateContent,
  onChangeType,
  onDelete,
  onMoveUp,
  onMoveDown,
  onEnter,
  onBackspaceEmpty,
}: {
  block: Block;
  isFirst: boolean;
  isLast: boolean;
  /** Só usados pelos blocos imagem/arquivo (2ª rodada) pra reaproveitar `uploadDocument()`/`getDownloadUrl()`. */
  client: SupabaseClient<Database>;
  userId: string;
  documents: Document[];
  /** Só usados pelo bloco referência de página (3ª rodada) — `currentPageId` exclui a própria página do seletor. */
  pages: Page[];
  currentPageId: string;
  /** Só usados pelo bloco referência de entidade (6ª rodada: Tarefa; 8ª rodada: + Evento). */
  tasks: Task[];
  events: CalendarEvent[];
  registerInputRef: (blockId: string, el: HTMLInputElement | HTMLTextAreaElement | null) => void;
  onUpdateContent: (blockId: string, content: Record<string, unknown>) => void;
  onChangeType: (blockId: string, blockType: BlockType) => void;
  onDelete: (blockId: string) => void;
  onMoveUp: (blockId: string) => void;
  onMoveDown: (blockId: string) => void;
  onEnter: (blockId: string) => void;
  onBackspaceEmpty: (blockId: string) => void;
}) {
  const [content, setContent] = useState<Record<string, unknown>>(() => block.content as Record<string, unknown>);
  const [isToggleOpen, setIsToggleOpen] = useState(false);

  const isEditableType = EDITABLE_BLOCK_TYPES.includes(block.block_type as EditableBlockType);

  function handlePrimaryKeyDown(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, currentText: string) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      onUpdateContent(block.id, content);
      onEnter(block.id);
    } else if (event.key === "Backspace" && currentText === "" && isCaretAtStart(event.currentTarget)) {
      event.preventDefault();
      onBackspaceEmpty(block.id);
    }
  }

  const controls = (
    <div className="pointer-events-none absolute -top-8 right-0 z-10 flex items-center gap-0.5 rounded-lg border border-line bg-overlay p-0.5 leading-none opacity-0 shadow-md transition-opacity group-focus-within/block:pointer-events-auto group-focus-within/block:opacity-100 sm:group-hover/block:pointer-events-auto sm:group-hover/block:opacity-100">
      {isEditableType && (
        <select
          value={block.block_type}
          onChange={(e) => {
            const nextType = e.target.value as BlockType;
            setContent(defaultContentForBlockType(nextType));
            onChangeType(block.id, nextType);
          }}
          aria-label="Tipo do bloco"
          data-size="sm"
          className="q-input h-7! w-auto border-transparent bg-transparent text-xs"
        >
          {EDITABLE_BLOCK_TYPES.map((type) => (
            <option key={type} value={type}>
              {BLOCK_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        onClick={() => onMoveUp(block.id)}
        disabled={isFirst}
        aria-label="Mover bloco para cima"
        title="Mover para cima"
        className={CONTROL_BUTTON_CLASS}
      >
        <ArrowUpIcon size={14} />
      </button>
      <button
        type="button"
        onClick={() => onMoveDown(block.id)}
        disabled={isLast}
        aria-label="Mover bloco para baixo"
        title="Mover para baixo"
        className={CONTROL_BUTTON_CLASS}
      >
        <ArrowDownIcon size={14} />
      </button>
      <button
        type="button"
        onClick={() => onDelete(block.id)}
        aria-label="Excluir bloco"
        title="Excluir bloco"
        className={`${CONTROL_BUTTON_CLASS} hover:bg-danger-soft hover:text-danger`}
      >
        <TrashIcon size={14} />
      </button>
    </div>
  );

  if (block.block_type === "divisor") {
    return (
      <div className="group/block relative flex items-center gap-2 py-1">
        <hr className="flex-1 border-0 border-t border-line" />
        {controls}
      </div>
    );
  }

  if (block.block_type === "checklist") {
    const checklist = content as unknown as ChecklistBlockContent;
    return (
      <div className="group/block relative flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-[5px] h-4 w-4 shrink-0 accent-[var(--q-gold)]"
          aria-label="Concluído"
          checked={checklist.checked}
          onChange={(e) => {
            const next = { ...checklist, checked: e.target.checked };
            setContent(next);
            onUpdateContent(block.id, next);
          }}
        />
        <textarea
          ref={(el) => {
            registerInputRef(block.id, el);
            autoGrow(el);
          }}
          rows={1}
          value={checklist.text}
          onChange={(e) => {
            setContent({ ...checklist, text: e.target.value });
            autoGrow(e.currentTarget);
          }}
          onBlur={() => onUpdateContent(block.id, content)}
          onKeyDown={(e) => handlePrimaryKeyDown(e, checklist.text)}
          className={`${INLINE_INPUT_CLASS} resize-none overflow-hidden ${checklist.checked ? "line-through text-fg-3" : "text-fg"}`}
        />
        {controls}
      </div>
    );
  }

  if (block.block_type === "codigo") {
    const code = content as unknown as CodeBlockContent;
    return (
      <div className="group/block relative flex items-start gap-2">
        <CodeSnippetEditor
          value={code}
          inputRef={(el) => registerInputRef(block.id, el)}
          onChange={(next) => setContent(next as unknown as Record<string, unknown>)}
          onCommit={(next) => {
            const nextContent = (next ?? code) as unknown as Record<string, unknown>;
            setContent(nextContent);
            onUpdateContent(block.id, nextContent);
          }}
          controls={controls}
        />
      </div>
    );
  }

  if (block.block_type === "toggle") {
    const toggle = content as unknown as ToggleBlockContent;
    return (
      <div className="group/block relative flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsToggleOpen((v) => !v)}
            aria-expanded={isToggleOpen}
            aria-label={isToggleOpen ? "Recolher" : "Expandir"}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-fg-3 hover:text-fg"
          >
            <span className={`inline-block text-base leading-none transition-transform ${isToggleOpen ? "rotate-90" : ""}`}>›</span>
          </button>
          <input
            ref={(el) => registerInputRef(block.id, el)}
            value={toggle.summary}
            onChange={(e) => setContent({ ...toggle, summary: e.target.value })}
            onBlur={() => onUpdateContent(block.id, content)}
            onKeyDown={(e) => handlePrimaryKeyDown(e, toggle.summary)}
            placeholder="Resumo do toggle..."
            className={`${INLINE_INPUT_CLASS} font-medium text-fg`}
          />
          {controls}
        </div>
        {isToggleOpen && (
          <textarea
            value={toggle.details}
            onChange={(e) => setContent({ ...toggle, details: e.target.value })}
            onBlur={() => onUpdateContent(block.id, content)}
            rows={2}
            placeholder="Detalhes..."
            aria-label="Detalhes do toggle"
            className="q-input ml-8 w-auto text-sm"
          />
        )}
      </div>
    );
  }

  if (block.block_type === "link") {
    const link = content as unknown as LinkBlockContent;
    return (
      <div className="group/block relative flex items-center gap-2.5">
        <KindLabel>Link</KindLabel>
        <input
          ref={(el) => registerInputRef(block.id, el)}
          type="url"
          value={link.url}
          onChange={(e) => setContent({ url: e.target.value })}
          onBlur={() => onUpdateContent(block.id, content)}
          onKeyDown={(e) => handlePrimaryKeyDown(e, link.url)}
          placeholder="https://..."
          className={`${INLINE_INPUT_CLASS} text-gold-fg`}
        />
        {link.url && (
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs font-semibold text-fg-2 hover:text-fg"
          >
            Abrir →
          </a>
        )}
        {controls}
      </div>
    );
  }

  if (block.block_type === "imagem" || block.block_type === "arquivo") {
    const media = content as unknown as MediaBlockContent;
    return (
      <div className="group/block relative flex items-center gap-2">
        <MediaBlockBody
          block={block}
          documents={documents}
          client={client}
          userId={userId}
          content={media}
          isImage={block.block_type === "imagem"}
          onUpdateContent={(nextContent) => {
            setContent(nextContent);
            onUpdateContent(block.id, nextContent);
          }}
        />
        {controls}
      </div>
    );
  }

  if (block.block_type === "referencia_pagina") {
    const reference = content as unknown as PageReferenceBlockContent;
    const referencedPage = reference.pageId ? (pages.find((p) => p.id === reference.pageId) ?? null) : null;
    const linkablePages = pages.filter((p) => p.id !== currentPageId);

    return (
      <div className="group/block relative flex items-center gap-2">
        {referencedPage ? (
          <div className="flex flex-1 items-center gap-2.5">
            <KindLabel>Página</KindLabel>
            <Link
              to={`/conhecimento/notas/${referencedPage.id}`}
              className="flex-1 text-[15px] font-medium text-gold-fg hover:underline"
            >
              {referencedPage.title} →
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => {
                const next = { pageId: null };
                setContent(next);
                onUpdateContent(block.id, next);
              }}
            >
              Trocar
            </Button>
          </div>
        ) : (
          <select
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) return;
              const next = { pageId: e.target.value };
              setContent(next);
              onUpdateContent(block.id, next);
            }}
            aria-label="Referenciar uma página"
            className="q-input flex-1 py-2 text-sm"
          >
            <option value="">Referenciar uma página...</option>
            {linkablePages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.title}
              </option>
            ))}
          </select>
        )}
        {controls}
      </div>
    );
  }

  if (block.block_type === "tabela") {
    const table = content as unknown as TableBlockContent;
    const saveTable = (next: TableBlockContent) => {
      const nextContent = next as unknown as Record<string, unknown>;
      setContent(nextContent);
      onUpdateContent(block.id, nextContent);
    };

    return (
      <div className="group/block relative flex items-start justify-between gap-2">
        <div className="min-w-0 rounded-lg border border-line-soft bg-canvas/40 flex flex-1 flex-col gap-2 overflow-x-auto p-3">
          <table className="border-collapse text-sm leading-normal">
            <thead>
              <tr>
                {table.columns.map((column, colIndex) => (
                  <th key={colIndex} className="border border-line px-2 py-1.5 text-left">
                    <div className="flex items-center gap-1">
                      <input
                        value={column}
                        onChange={(e) => {
                          const columns = table.columns.map((c, ci) => (ci === colIndex ? e.target.value : c));
                          setContent({ ...table, columns });
                        }}
                        onBlur={() => onUpdateContent(block.id, content)}
                        aria-label={`Nome da coluna ${colIndex + 1}`}
                        className="min-w-[80px] bg-transparent text-[11px] font-medium uppercase tracking-[0.08em] text-fg-3 outline-none focus:text-fg"
                      />
                      {table.columns.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            saveTable({
                              columns: table.columns.filter((_, ci) => ci !== colIndex),
                              rows: table.rows.map((row) => row.filter((_, ci) => ci !== colIndex)),
                            })
                          }
                          aria-label="Remover coluna"
                          className="shrink-0 text-xs text-fg-3 hover:text-danger"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-2 py-1.5">
                  <Button
                    type="button"
                    variant="dashed"
                    size="xs"
                    onClick={() =>
                      saveTable({
                        columns: [...table.columns, `Coluna ${table.columns.length + 1}`],
                        rows: table.rows.map((row) => [...row, ""]),
                      })
                    }
                  >
                    + Coluna
                  </Button>
                </th>
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, colIndex) => (
                    <td key={colIndex} className="border border-line px-2 py-1.5">
                      <input
                        value={cell}
                        onChange={(e) => {
                          const rows = table.rows.map((r, ri) =>
                            ri === rowIndex ? r.map((c, ci) => (ci === colIndex ? e.target.value : c)) : r,
                          );
                          setContent({ ...table, rows });
                        }}
                        onBlur={() => onUpdateContent(block.id, content)}
                        aria-label={`Linha ${rowIndex + 1}, coluna ${colIndex + 1}`}
                        className="min-w-[80px] bg-transparent text-fg outline-none"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1.5">
                    {table.rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => saveTable({ ...table, rows: table.rows.filter((_, ri) => ri !== rowIndex) })}
                        aria-label="Remover linha"
                        className="text-xs text-fg-3 hover:text-danger"
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button
            type="button"
            variant="dashed"
            size="xs"
            className="self-start"
            onClick={() => saveTable({ ...table, rows: [...table.rows, table.columns.map(() => "")] })}
          >
            + Linha
          </Button>
        </div>
        {controls}
      </div>
    );
  }

  if (block.block_type === "equacao") {
    const equation = content as unknown as EquationBlockContent;
    return (
      <div className="group/block relative flex flex-col gap-2">
        <div className="flex items-center gap-2.5">
          <span className="w-5 shrink-0 text-center text-fg-3">Σ</span>
          <input
            ref={(el) => registerInputRef(block.id, el)}
            value={equation.latex}
            onChange={(e) => setContent({ latex: e.target.value })}
            onBlur={() => onUpdateContent(block.id, content)}
            onKeyDown={(e) => handlePrimaryKeyDown(e, equation.latex)}
            placeholder="LaTeX, ex.: E = mc^2"
            className={`${INLINE_INPUT_CLASS} font-mono text-[13px] text-fg`}
          />
          {controls}
        </div>
        {equation.latex && <EquationPreview latex={equation.latex} />}
      </div>
    );
  }

  if (block.block_type === "referencia_entidade") {
    const reference = content as unknown as EntityReferenceBlockContent;
    const referencedTask =
      reference.entityType === "tarefa" && reference.entityId
        ? (tasks.find((t) => t.id === reference.entityId) ?? null)
        : null;
    const referencedEvent =
      reference.entityType === "evento" && reference.entityId
        ? (events.find((e) => e.id === reference.entityId) ?? null)
        : null;

    return (
      <div className="group/block relative flex items-center gap-2">
        {referencedTask ? (
          <div className="flex flex-1 flex-wrap items-center gap-2.5">
            <KindLabel>Tarefa</KindLabel>
            <span className="text-[15px] font-medium text-fg">{referencedTask.title}</span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${referencedTask.status === "concluido" ? "bg-success-soft text-success" : referencedTask.status === "em_andamento" ? "bg-info-soft text-info" : ""}`}
            >
              {TASK_STATUS_LABEL[referencedTask.status]}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => {
                const next = { entityType: null, entityId: null };
                setContent(next);
                onUpdateContent(block.id, next);
              }}
            >
              Trocar
            </Button>
          </div>
        ) : referencedEvent ? (
          <div className="flex flex-1 flex-wrap items-center gap-2.5">
            <KindLabel>Evento</KindLabel>
            <span className="text-[15px] font-medium text-fg">{referencedEvent.title}</span>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border border-line text-fg-2 font-mono">
              {new Date(referencedEvent.start_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => {
                const next = { entityType: null, entityId: null };
                setContent(next);
                onUpdateContent(block.id, next);
              }}
            >
              Trocar
            </Button>
          </div>
        ) : (
          <select
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) return;
              const [entityType, entityId] = e.target.value.split(":");
              const next = { entityType, entityId };
              setContent(next);
              onUpdateContent(block.id, next);
            }}
            aria-label="Referenciar uma tarefa ou evento"
            className="q-input flex-1 py-2 text-sm"
          >
            <option value="">Referenciar uma tarefa ou evento...</option>
            <optgroup label="Tarefas">
              {tasks.map((task) => (
                <option key={task.id} value={`tarefa:${task.id}`}>
                  {task.title}
                </option>
              ))}
            </optgroup>
            <optgroup label="Eventos">
              {events.map((event) => (
                <option key={event.id} value={`evento:${event.id}`}>
                  {event.title}
                </option>
              ))}
            </optgroup>
          </select>
        )}
        {controls}
      </div>
    );
  }

  if (block.block_type === "embed") {
    const embed = content as unknown as EmbedBlockContent;
    const embedUrl = embed.url ? resolveEmbedUrl(embed.url) : null;
    return (
      <div className="group/block relative flex flex-col gap-2">
        <div className="flex items-center gap-2.5">
          <KindLabel>Embed</KindLabel>
          <input
            ref={(el) => registerInputRef(block.id, el)}
            type="url"
            value={embed.url}
            onChange={(e) => setContent({ url: e.target.value })}
            onBlur={() => onUpdateContent(block.id, content)}
            onKeyDown={(e) => handlePrimaryKeyDown(e, embed.url)}
            placeholder="Link do YouTube, Vimeo, Spotify, Figma ou CodePen..."
            className={`${INLINE_INPUT_CLASS} text-gold-fg`}
          />
          {controls}
        </div>
        {embed.url && embedUrl && (
          <iframe
            src={embedUrl}
            className="aspect-video w-full rounded-[12px] border border-line"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
            title="Conteúdo embutido"
          />
        )}
        {embed.url && !embedUrl && (
          <p className="text-xs leading-normal text-danger">
            Esse link não é suportado. Provedores aceitos: YouTube, Vimeo, Spotify, Figma, CodePen.
          </p>
        )}
      </div>
    );
  }

  // Tipos "de texto simples": texto, titulo1-3, lista, citacao, callout — todos {text}.
  const text = (content as unknown as TextBlockContent).text ?? "";
  const showSlashMenu = TEXT_SHAPED_TYPES.includes(block.block_type as EditableBlockType) && text.startsWith("/");
  const icon = BLOCK_TYPE_ICON[block.block_type as EditableBlockType];

  return (
    <div className="group/block relative flex flex-col gap-1.5">
      <div className="flex items-start gap-2">
        {icon && <span className="w-4 shrink-0 pt-[3px] text-center text-fg-3">{icon}</span>}
        <textarea
          ref={(el) => {
            registerInputRef(block.id, el);
            autoGrow(el);
          }}
          rows={1}
          value={text}
          onChange={(e) => {
            setContent({ text: e.target.value });
            autoGrow(e.currentTarget);
          }}
          onBlur={() => onUpdateContent(block.id, content)}
          onKeyDown={(e) => handlePrimaryKeyDown(e, text)}
          placeholder="Escreva algo, ou / para escolher um tipo..."
          className={`${INLINE_INPUT_CLASS} resize-none overflow-hidden ${TEXT_INPUT_CLASS_BY_TYPE[block.block_type as EditableBlockType] ?? "text-[15px] leading-[1.75] text-fg-2 focus:text-fg"}`}
        />
        {controls}
      </div>
      {showSlashMenu && (
        <SlashMenu
          query={text.slice(1)}
          onSelect={(type) => {
            const nextContent = defaultContentForBlockType(type);
            setContent(nextContent);
            onChangeType(block.id, type);
          }}
        />
      )}
    </div>
  );
}

/**
 * Corpo dos blocos imagem/arquivo — sem `documentId` ainda mostra o `<input type="file">`; depois
 * de enviado, mostra a prévia (imagem) ou o nome do arquivo, com link "Abrir" (URL assinada via
 * `getDownloadUrl`) e "Trocar" (só limpa a referência — nunca apaga o Documento, mesmo princípio
 * do `AttachDocumentPanel`: quem é dono do arquivo é o Documento, o bloco só referencia).
 */
function MediaBlockBody({
  documents,
  client,
  userId,
  content,
  isImage,
  onUpdateContent,
}: {
  block: Block;
  documents: Document[];
  client: SupabaseClient<Database>;
  userId: string;
  content: MediaBlockContent;
  isImage: boolean;
  onUpdateContent: (content: Record<string, unknown>) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const document = content.documentId ? (documents.find((d) => d.id === content.documentId) ?? null) : null;

  useEffect(() => {
    if (!document) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    getDownloadUrl(client, document.storage_path).then((resolved) => {
      if (!cancelled) setUrl(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [client, document?.storage_path]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const doc = await uploadDocument(client, userId, file, file.name);
      onUpdateContent({ documentId: doc.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no upload.");
    } finally {
      setIsUploading(false);
    }
  }

  if (!document) {
    return (
      <div className="flex flex-1 items-center gap-2 flex-wrap">
        <input
          type="file"
          accept={isImage ? "image/*" : undefined}
          disabled={isUploading}
          onChange={handleFileChange}
          aria-label={isImage ? "Enviar imagem" : "Enviar arquivo"}
          className="min-w-0 flex-1 text-sm text-fg-2 file:mr-3 file:cursor-pointer file:rounded-[10px] file:border file:border-solid file:border-line file:bg-transparent file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-fg hover:file:border-line-strong"
        />
        {isUploading && <span className="shrink-0 text-xs text-fg-2">Enviando...</span>}
        {error && <span className="text-xs text-danger shrink-0">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-wrap items-center gap-2.5">
      {isImage && url ? (
        <img src={url} alt={document.file_name} className="max-h-48 rounded-[12px] border border-line" />
      ) : (
        <>
          <KindLabel>Anexo</KindLabel>
          <span className="text-sm text-fg">{document.file_name}</span>
        </>
      )}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-xs font-semibold text-fg-2 hover:text-fg"
        >
          Abrir →
        </a>
      )}
      <Button type="button" variant="ghost" size="xs" onClick={() => onUpdateContent({ documentId: null })}>
        Trocar
      </Button>
    </div>
  );
}

/**
 * Renderiza LaTeX com KaTeX no navegador (sem servidor) — LaTeX inválido mostra uma mensagem
 * amigável em vez de quebrar o bloco. `katex` é `import()` dinâmico (não estático no topo do
 * arquivo) — mesmo padrão do Tesseract.js em `modules/gestao/documentos/src/ocr.ts` — pra não
 * inflar o chunk principal com uma lib pesada que só quem usa bloco de equação precisa baixar.
 */
function EquationPreview({ latex }: { latex: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ default: katex }] = await Promise.all([import("katex"), import("katex/dist/katex.min.css")]);
      if (cancelled || !containerRef.current) return;
      try {
        katex.render(latex, containerRef.current, { throwOnError: true, displayMode: true });
      } catch {
        const el = containerRef.current;
        el.textContent = "";
        const message = document.createElement("span");
        message.className = "font-sans text-xs text-danger";
        message.textContent = "Não consegui interpretar esse LaTeX.";
        el.appendChild(message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [latex]);

  return <div ref={containerRef} className="min-w-0 rounded-lg border border-line-soft bg-canvas/40 overflow-x-auto p-3 text-fg" />;
}
