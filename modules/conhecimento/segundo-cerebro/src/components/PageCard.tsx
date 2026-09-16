import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, Button, ConfirmDialog } from "@qqorvex/ui";
import type { Page } from "../types";

export function PageCard({ page, onDelete }: { page: Page; onDelete: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <Link to={`/segundo-cerebro/${page.id}`} className="flex-1">
          <p className="font-display text-sm font-semibold text-text-primary">
            {page.is_favorite && "★ "}
            {page.title}
          </p>
          <p className="font-sans text-xs text-text-secondary-warm">{page.page_type}</p>
        </Link>
        <Button type="button" variant="chip" onClick={() => setConfirmOpen(true)}>
          Excluir
        </Button>
      </div>
      <ConfirmDialog
        isOpen={confirmOpen}
        title={`Excluir "${page.title}"?`}
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
