import { useEffect, useRef, useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button } from "@qqorvex/ui";
import { useDocuments } from "@qqorvex/module-documentos";
import { useAllTasks } from "@qqorvex/module-tarefas";
import { useAllEvents } from "@qqorvex/module-agenda";
import {
  useBlocks,
  useCreateBlock,
  useCreateBlockAfter,
  useDeleteBlock,
  useMoveBlock,
  useUpdateBlockContent,
  useUpdateBlockType,
} from "../hooks/usePageDetail";
import { usePages } from "../hooks/usePages";
import { defaultContentForBlockType } from "../service";
import { BlockRow } from "./BlockRow";
import type { BlockType } from "../types";

/**
 * Container do Editor de Blocos Rico (docs/decisions/segundo-cerebro-editor-blocos-design.md) —
 * orquestra foco/teclado entre `BlockRow`s independentes; cada bloco é sua própria linha no
 * banco, sem aninhamento. `userId` (2ª rodada, imagem/arquivo) é só pra repassar pro
 * `uploadDocument()` de `@qqorvex/module-documentos` dentro de `BlockRow` — o Documento
 * continua sendo dono do arquivo, o bloco só guarda a referência.
 */
export function BlockEditor({ client, pageId, userId }: { client: SupabaseClient<Database>; pageId: string; userId: string }) {
  const { blocks } = useBlocks(client, pageId);
  const { documents } = useDocuments(client);
  const { pages } = usePages(client);
  const { tasks } = useAllTasks(client);
  const { events } = useAllEvents(client);
  const createBlock = useCreateBlock(client, pageId);
  const createBlockAfter = useCreateBlockAfter(client, pageId);
  const deleteBlock = useDeleteBlock(client, pageId);
  const updateContent = useUpdateBlockContent(client, pageId);
  const updateType = useUpdateBlockType(client, pageId);
  const moveBlock = useMoveBlock(client, pageId);

  const inputRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);

  useEffect(() => {
    if (pendingFocusId && inputRefs.current[pendingFocusId]) {
      inputRefs.current[pendingFocusId]?.focus();
      setPendingFocusId(null);
    }
  }, [blocks, pendingFocusId]);

  async function handleEnter(blockId: string) {
    const newBlock = await createBlockAfter.mutateAsync({ afterBlockId: blockId, blockType: "texto", content: { text: "" } });
    setPendingFocusId(newBlock.id);
  }

  function handleBackspaceEmpty(blockId: string) {
    const index = blocks.findIndex((b) => b.id === blockId);
    if (index <= 0) return;
    const previous = blocks[index - 1]!;
    deleteBlock.mutate(blockId);
    setPendingFocusId(previous.id);
  }

  async function handleAddFirstBlock(blockType: BlockType = "texto") {
    const newBlock = await createBlock.mutateAsync({ blockType, content: defaultContentForBlockType(blockType), orderIndex: 0 });
    setPendingFocusId(newBlock.id);
  }

  return (
    <div className="flex flex-col gap-[10px] text-[15px] leading-[1.75] text-fg-2">
      <div aria-live="polite" className="flex min-h-5 items-center justify-end text-[11px] text-fg-3">
        {updateContent.isPending ? "Salvando alterações…" : updateContent.isError ? <span className="text-danger">Não foi possível salvar. Saia do bloco novamente para tentar.</span> : updateContent.isSuccess ? "Alterações salvas" : "As alterações são salvas ao sair de cada bloco"}
      </div>
      {createBlock.isError && <span role="alert" className="text-xs text-danger">Não foi possível inserir o bloco. Tente novamente.</span>}
      {createBlockAfter.isError && <span role="alert" className="text-xs text-danger">Não foi possível criar o próximo bloco. Seu texto atual foi mantido.</span>}
      {blocks.length === 0 ? (
        <div className="min-w-0 rounded-lg border border-line-soft bg-canvas/40 flex flex-col gap-3 p-5 sm:p-6">
          <div className="flex flex-col gap-1">
            <strong className="text-sm font-semibold text-fg">Sua página está pronta para ganhar forma</strong>
            <span className="text-sm text-fg-3">Comece por uma ideia, organize próximos passos ou destaque um conceito.</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="primary" onClick={() => handleAddFirstBlock("texto")} disabled={createBlock.isPending}>Começar a escrever</Button>
            <Button type="button" variant="secondary" onClick={() => handleAddFirstBlock("checklist")} disabled={createBlock.isPending}>Criar checklist</Button>
            <Button type="button" variant="secondary" onClick={() => handleAddFirstBlock("callout")} disabled={createBlock.isPending}>Destacar uma ideia</Button>
          </div>
        </div>
      ) : (
        blocks.map((block, index) => (
          <BlockRow
            key={block.id}
            client={client}
            userId={userId}
            documents={documents}
            pages={pages}
            currentPageId={pageId}
            tasks={tasks}
            events={events}
            block={block}
            isFirst={index === 0}
            isLast={index === blocks.length - 1}
            registerInputRef={(blockId, el) => {
              inputRefs.current[blockId] = el;
            }}
            onUpdateContent={(blockId, content) => updateContent.mutate({ blockId, content })}
            onChangeType={(blockId, blockType: BlockType) =>
              updateType.mutate({ blockId, blockType, content: defaultContentForBlockType(blockType) })
            }
            onDelete={(blockId) => deleteBlock.mutate(blockId)}
            onMoveUp={(blockId) => moveBlock.mutate({ blockId, direction: "up" })}
            onMoveDown={(blockId) => moveBlock.mutate({ blockId, direction: "down" })}
            onEnter={handleEnter}
            onBackspaceEmpty={handleBackspaceEmpty}
          />
        ))
      )}
    </div>
  );
}
