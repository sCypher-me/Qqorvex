import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, Button, ConfirmDialog } from "@qqorvex/ui";
import type { Notebook } from "../types";

export function NotebookCard({ notebook, onDelete }: { notebook: Notebook; onDelete: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <Link to={`/estudos/${notebook.id}`} className="flex-1">
          <p className="font-display text-sm font-semibold text-text-primary">
            {notebook.is_favorite && "★ "}
            {notebook.name}
          </p>
          <p className="font-sans text-xs text-text-secondary-warm">
            {notebook.notebook_type} · {notebook.status}
            {notebook.area && ` · ${notebook.area}`}
          </p>
        </Link>
        <Button type="button" variant="chip" onClick={() => setConfirmOpen(true)}>
          Excluir
        </Button>
      </div>
      <ConfirmDialog
        isOpen={confirmOpen}
        title={`Excluir "${notebook.name}"?`}
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
