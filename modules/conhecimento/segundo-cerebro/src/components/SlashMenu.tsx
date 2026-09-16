import { BLOCK_TYPE_LABELS } from "../service";
import type { EditableBlockType } from "../types";
import { EDITABLE_BLOCK_TYPES } from "../types";

/** Aparece embutido no fluxo (não como overlay flutuante) quando um bloco vazio começa com "/" — filtra pelo texto digitado depois da barra. */
export function SlashMenu({ query, onSelect }: { query: string; onSelect: (blockType: EditableBlockType) => void }) {
  const normalizedQuery = query.trim().toLowerCase();
  const options = EDITABLE_BLOCK_TYPES.filter((type) => BLOCK_TYPE_LABELS[type].toLowerCase().includes(normalizedQuery));

  if (options.length === 0) {
    return <p className="font-sans text-xs text-text-secondary-warm px-2 py-1">Nenhum tipo encontrado.</p>;
  }

  return (
    <div className="bg-surface-2 border border-border rounded-md flex flex-col overflow-hidden">
      {options.map((type) => (
        <button
          key={type}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onSelect(type)}
          className="text-left px-3 py-1.5 text-sm font-sans text-text-primary hover:bg-surface-1"
        >
          {BLOCK_TYPE_LABELS[type]}
        </button>
      ))}
    </div>
  );
}
