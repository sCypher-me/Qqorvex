import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button } from "@qqorvex/ui";
import { uploadDocument, getDownloadUrl } from "@qqorvex/module-documentos";
import type { Document } from "@qqorvex/module-documentos";
import type { Task } from "@qqorvex/module-tarefas";
import type { CalendarEvent } from "@qqorvex/module-agenda";
import { BLOCK_TYPE_LABELS, defaultContentForBlockType, resolveEmbedUrl } from "../service";
import { SlashMenu } from "./SlashMenu";
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
  titulo1: "font-display text-xl font-bold text-text-primary",
  titulo2: "font-display text-lg font-bold text-text-primary",
  titulo3: "font-display text-base font-bold text-text-primary",
  citacao: "font-sans italic text-text-secondary-warm border-l-2 border-border pl-2",
  callout: "font-sans text-text-primary bg-surface-2 rounded-md px-2 py-1",
};

const BLOCK_TYPE_ICON: Partial<Record<EditableBlockType, string>> = {
  lista: "•",
  callout: "💡",
};

function isCaretAtStart(el: HTMLInputElement | HTMLTextAreaElement): boolean {
  return el.selectionStart === 0 && el.selectionEnd === 0;
}

/**
 * Um bloco = um componente, `key={block.id}` no pai preserva esta instância (e seu estado local
 * de digitação) entre reordenações — só remonta quando o bloco realmente muda de identidade.
 * Salva no blur/Enter/checkbox, nunca a cada tecla (docs/decisions/segundo-cerebro-editor-blocos-design.md).
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

  function handlePrimaryKeyDown(event: KeyboardEvent<HTMLInputElement>, currentText: string) {
    if (event.key === "Enter") {
      event.preventDefault();
      onUpdateContent(block.id, content);
      onEnter(block.id);
    } else if (event.key === "Backspace" && currentText === "" && isCaretAtStart(event.currentTarget)) {
      event.preventDefault();
      onBackspaceEmpty(block.id);
    }
  }

  const controls = (
    <div className="flex items-center gap-1 shrink-0">
      {isEditableType && (
        <select
          value={block.block_type}
          onChange={(e) => {
            const nextType = e.target.value as BlockType;
            setContent(defaultContentForBlockType(nextType));
            onChangeType(block.id, nextType);
          }}
          className="text-xs rounded-md border border-border bg-surface-1 px-1 py-1 text-text-primary"
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
        className="text-xs px-1.5 py-1 rounded-md border border-border text-text-primary hover:bg-surface-1 disabled:opacity-30"
      >
        ▲
      </button>
      <button
        type="button"
        onClick={() => onMoveDown(block.id)}
        disabled={isLast}
        className="text-xs px-1.5 py-1 rounded-md border border-border text-text-primary hover:bg-surface-1 disabled:opacity-30"
      >
        ▼
      </button>
      <button
        type="button"
        onClick={() => onDelete(block.id)}
        className="text-xs px-1.5 py-1 rounded-md border border-error/40 text-error hover:bg-error-bg"
      >
        ✕
      </button>
    </div>
  );

  if (block.block_type === "divisor") {
    return (
      <div className="flex items-center gap-2">
        <hr className="flex-1 border-border" />
        {controls}
      </div>
    );
  }

  if (block.block_type === "checklist") {
    const checklist = content as unknown as ChecklistBlockContent;
    return (
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={checklist.checked}
          onChange={(e) => {
            const next = { ...checklist, checked: e.target.checked };
            setContent(next);
            onUpdateContent(block.id, next);
          }}
        />
        <input
          ref={(el) => registerInputRef(block.id, el)}
          value={checklist.text}
          onChange={(e) => setContent({ ...checklist, text: e.target.value })}
          onBlur={() => onUpdateContent(block.id, content)}
          onKeyDown={(e) => handlePrimaryKeyDown(e, checklist.text)}
          className={`flex-1 bg-transparent outline-none font-sans text-text-primary ${checklist.checked ? "line-through opacity-60" : ""}`}
        />
        {controls}
      </div>
    );
  }

  if (block.block_type === "codigo") {
    const code = content as unknown as CodeBlockContent;
    return (
      <div className="flex items-start gap-2">
        <textarea
          ref={(el) => registerInputRef(block.id, el)}
          value={code.text}
          onChange={(e) => setContent({ ...code, text: e.target.value })}
          onBlur={() => onUpdateContent(block.id, content)}
          rows={4}
          className="flex-1 bg-surface-2 border border-border rounded-md p-2 font-mono text-sm text-text-primary outline-none focus:border-brand-cyan"
        />
        {controls}
      </div>
    );
  }

  if (block.block_type === "toggle") {
    const toggle = content as unknown as ToggleBlockContent;
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setIsToggleOpen((v) => !v)} className="text-text-secondary-warm text-xs">
            {isToggleOpen ? "▼" : "▶"}
          </button>
          <input
            ref={(el) => registerInputRef(block.id, el)}
            value={toggle.summary}
            onChange={(e) => setContent({ ...toggle, summary: e.target.value })}
            onBlur={() => onUpdateContent(block.id, content)}
            onKeyDown={(e) => handlePrimaryKeyDown(e, toggle.summary)}
            placeholder="Resumo do toggle..."
            className="flex-1 bg-transparent outline-none font-sans font-medium text-text-primary"
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
            className="ml-6 bg-surface-2 border border-border rounded-md p-2 font-sans text-sm text-text-primary outline-none focus:border-brand-cyan"
          />
        )}
      </div>
    );
  }

  if (block.block_type === "link") {
    const link = content as unknown as LinkBlockContent;
    return (
      <div className="flex items-center gap-2">
        <span className="text-text-secondary-warm">🔗</span>
        <input
          ref={(el) => registerInputRef(block.id, el)}
          type="url"
          value={link.url}
          onChange={(e) => setContent({ url: e.target.value })}
          onBlur={() => onUpdateContent(block.id, content)}
          onKeyDown={(e) => handlePrimaryKeyDown(e, link.url)}
          placeholder="https://..."
          className="flex-1 bg-transparent outline-none font-sans text-brand-cyan"
        />
        {link.url && (
          <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-text-secondary-warm hover:underline shrink-0">
            Abrir
          </a>
        )}
        {controls}
      </div>
    );
  }

  if (block.block_type === "imagem" || block.block_type === "arquivo") {
    const media = content as unknown as MediaBlockContent;
    return (
      <div className="flex items-center gap-2">
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
      <div className="flex items-center gap-2">
        {referencedPage ? (
          <div className="flex flex-1 items-center gap-2">
            <span className="text-text-secondary-warm">📄</span>
            <Link to={`/segundo-cerebro/${referencedPage.id}`} className="flex-1 text-sm text-brand-cyan hover:underline">
              {referencedPage.title}
            </Link>
            <Button
              type="button"
              variant="chip"
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
            className="flex-1 rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm"
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
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 flex flex-col gap-1 overflow-x-auto">
          <table className="text-sm border-collapse">
            <thead>
              <tr>
                {table.columns.map((column, colIndex) => (
                  <th key={colIndex} className="border border-border p-1 text-left">
                    <div className="flex items-center gap-1">
                      <input
                        value={column}
                        onChange={(e) => {
                          const columns = table.columns.map((c, ci) => (ci === colIndex ? e.target.value : c));
                          setContent({ ...table, columns });
                        }}
                        onBlur={() => onUpdateContent(block.id, content)}
                        className="min-w-[80px] bg-transparent outline-none font-sans font-semibold text-text-primary"
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
                          className="text-xs text-text-secondary-warm hover:text-error shrink-0"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th className="p-1">
                  <Button
                    type="button"
                    variant="chip"
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
                    <td key={colIndex} className="border border-border p-1">
                      <input
                        value={cell}
                        onChange={(e) => {
                          const rows = table.rows.map((r, ri) =>
                            ri === rowIndex ? r.map((c, ci) => (ci === colIndex ? e.target.value : c)) : r,
                          );
                          setContent({ ...table, rows });
                        }}
                        onBlur={() => onUpdateContent(block.id, content)}
                        className="min-w-[80px] bg-transparent outline-none font-sans text-text-primary"
                      />
                    </td>
                  ))}
                  <td className="p-1">
                    {table.rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => saveTable({ ...table, rows: table.rows.filter((_, ri) => ri !== rowIndex) })}
                        className="text-xs text-text-secondary-warm hover:text-error"
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
            variant="chip"
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
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-text-secondary-warm">Σ</span>
          <input
            ref={(el) => registerInputRef(block.id, el)}
            value={equation.latex}
            onChange={(e) => setContent({ latex: e.target.value })}
            onBlur={() => onUpdateContent(block.id, content)}
            onKeyDown={(e) => handlePrimaryKeyDown(e, equation.latex)}
            placeholder="LaTeX, ex.: E = mc^2"
            className="flex-1 bg-transparent outline-none font-mono text-sm text-text-primary"
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
      <div className="flex items-center gap-2">
        {referencedTask ? (
          <div className="flex flex-1 items-center gap-2 flex-wrap">
            <span className="text-text-secondary-warm">📌</span>
            <span className="text-sm text-text-primary">{referencedTask.title}</span>
            <span className="text-xs px-2 py-0.5 rounded-full border border-border text-text-secondary-warm">
              {TASK_STATUS_LABEL[referencedTask.status]}
            </span>
            <Button
              type="button"
              variant="chip"
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
          <div className="flex flex-1 items-center gap-2 flex-wrap">
            <span className="text-text-secondary-warm">📅</span>
            <span className="text-sm text-text-primary">{referencedEvent.title}</span>
            <span className="text-xs px-2 py-0.5 rounded-full border border-border text-text-secondary-warm">
              {new Date(referencedEvent.start_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
            </span>
            <Button
              type="button"
              variant="chip"
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
            className="flex-1 rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm"
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
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-text-secondary-warm">🌐</span>
          <input
            ref={(el) => registerInputRef(block.id, el)}
            type="url"
            value={embed.url}
            onChange={(e) => setContent({ url: e.target.value })}
            onBlur={() => onUpdateContent(block.id, content)}
            onKeyDown={(e) => handlePrimaryKeyDown(e, embed.url)}
            placeholder="Link do YouTube, Vimeo, Spotify, Figma ou CodePen..."
            className="flex-1 bg-transparent outline-none font-sans text-brand-cyan"
          />
          {controls}
        </div>
        {embed.url && embedUrl && (
          <iframe
            src={embedUrl}
            className="w-full aspect-video rounded-md border border-border"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
            title="Conteúdo embutido"
          />
        )}
        {embed.url && !embedUrl && (
          <p className="font-sans text-xs text-error">
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
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {icon && <span className="text-text-secondary-warm">{icon}</span>}
        <input
          ref={(el) => registerInputRef(block.id, el)}
          value={text}
          onChange={(e) => setContent({ text: e.target.value })}
          onBlur={() => onUpdateContent(block.id, content)}
          onKeyDown={(e) => handlePrimaryKeyDown(e, text)}
          placeholder="Escreva algo, ou / para escolher um tipo..."
          className={`flex-1 bg-transparent outline-none ${TEXT_INPUT_CLASS_BY_TYPE[block.block_type as EditableBlockType] ?? "font-sans text-text-primary"}`}
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
  block,
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
          className="flex-1 min-w-0 text-sm text-text-primary"
        />
        {isUploading && <span className="text-xs text-text-secondary-warm shrink-0">Enviando...</span>}
        {error && <span className="text-xs text-error shrink-0">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center gap-2 flex-wrap">
      {isImage && url ? (
        <img src={url} alt={document.file_name} className="max-h-48 rounded-md border border-border" />
      ) : (
        <span className="font-sans text-sm text-text-primary">📎 {document.file_name}</span>
      )}
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-text-secondary-warm hover:underline shrink-0">
          Abrir
        </a>
      )}
      <Button type="button" variant="chip" onClick={() => onUpdateContent({ documentId: null })}>
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
        message.className = "font-sans text-xs text-error";
        message.textContent = "Não consegui interpretar esse LaTeX.";
        el.appendChild(message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [latex]);

  return <div ref={containerRef} className="bg-surface-2 border border-border rounded-md p-2 overflow-x-auto" />;
}
