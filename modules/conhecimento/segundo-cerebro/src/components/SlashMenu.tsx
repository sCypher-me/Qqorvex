import { BLOCK_TYPE_LABELS } from "../service";
import type { EditableBlockType } from "../types";
import { EDITABLE_BLOCK_TYPES } from "../types";

/** Aparece embutido no fluxo (não como overlay flutuante) quando um bloco vazio começa com "/" — filtra pelo texto digitado depois da barra. */
export function SlashMenu({ query, onSelect }: { query: string; onSelect: (blockType: EditableBlockType) => void }) {
  const normalizedQuery = query.trim().toLowerCase();
  const options = EDITABLE_BLOCK_TYPES.filter((type) => BLOCK_TYPE_LABELS[type].toLowerCase().includes(normalizedQuery));

  if (options.length === 0) {
    return (
      <div className="qv-popover w-[236px] px-3 py-[9px] text-[13px] leading-normal text-text-muted">
        Nenhum tipo encontrado.
      </div>
    );
  }

  return (
    <div className="qv-popover flex max-h-[320px] w-[236px] flex-col overflow-y-auto p-1.5 leading-normal" role="listbox">
      {options.map((type) => (
        <button
          key={type}
          type="button"
          role="option"
          aria-selected={false}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onSelect(type)}
          className="flex items-center gap-[10px] rounded-[10px] px-3 py-[9px] text-left text-[13px] text-text-primary transition-colors hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none"
        >
          <span className="flex-1">{BLOCK_TYPE_LABELS[type]}</span>
        </button>
      ))}
    </div>
  );
}
