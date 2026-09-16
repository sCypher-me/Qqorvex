import { useState } from "react";
import { Card, Button, ConfirmDialog } from "@qqorvex/ui";
import type { Idea } from "../types";

export function IdeaCard({ idea, onDelete }: { idea: Idea; onDelete: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-sans text-sm text-text-primary">{idea.title}</p>
          {idea.description && <p className="font-sans text-xs text-text-secondary-warm">{idea.description}</p>}
        </div>
        <Button type="button" variant="chip" onClick={() => setConfirmOpen(true)}>
          Excluir
        </Button>
      </div>
      <ConfirmDialog
        isOpen={confirmOpen}
        title={`Excluir "${idea.title}"?`}
        description="Essa ação não pode ser desfeita."
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </Card>
  );
}
