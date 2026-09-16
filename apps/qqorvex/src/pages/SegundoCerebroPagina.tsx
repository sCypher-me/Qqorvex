import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Card, Input, Select } from "@qqorvex/ui";
import { useAuth } from "@qqorvex/auth";
import {
  usePage,
  usePageTags,
  useAddPageTag,
  useRemovePageTag,
  useBacklinks,
  useCreatePageLink,
  usePages,
  CheckpointsPanel,
  BlockEditor,
} from "@qqorvex/module-segundo-cerebro";
import { supabase } from "../app/supabase";

export function SegundoCerebroPaginaPage() {
  const { pageId } = useParams<{ pageId: string }>();
  const { session } = useAuth();
  if (!pageId) return null;

  const { page } = usePage(supabase, pageId);
  const { tags } = usePageTags(supabase, pageId);
  const addTag = useAddPageTag(supabase, pageId);
  const removeTag = useRemovePageTag(supabase, pageId);
  const { backlinks } = useBacklinks(supabase, pageId);
  const createLink = useCreatePageLink(supabase, pageId);
  const { pages } = usePages(supabase);

  const [tagInput, setTagInput] = useState("");
  const [linkTargetId, setLinkTargetId] = useState("");

  const linkablePages = pages.filter((p) => p.id !== pageId);

  return (
    <main className="min-h-screen bg-background px-4 py-8 flex flex-col items-center gap-8">
      <div className="w-full max-w-2xl flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-text-primary">{page?.title ?? "..."}</h1>
        <Link to="/segundo-cerebro" className="text-sm text-text-secondary-warm hover:text-text-primary">
          Voltar
        </Link>
      </div>

      <Card className="w-full max-w-2xl">
        <h2 className="font-display text-lg font-semibold text-text-primary">Blocos</h2>
        <BlockEditor client={supabase} pageId={pageId} userId={session!.user.id} />
      </Card>

      <Card className="w-full max-w-2xl">
        <h2 className="font-display text-lg font-semibold text-text-primary">Tags</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!tagInput.trim()) return;
            addTag.mutate(tagInput.trim());
            setTagInput("");
          }}
          className="flex gap-2 items-end"
        >
          <div className="flex-1">
            <Input label="Nova tag" value={tagInput} onChange={(e) => setTagInput(e.target.value)} />
          </div>
          <Button type="submit" variant="primary">
            Adicionar
          </Button>
        </form>
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <Button key={tag} type="button" variant="chip" onClick={() => removeTag.mutate(tag)} title="Clique para remover">
              {tag} ×
            </Button>
          ))}
        </div>
      </Card>

      <Card className="w-full max-w-2xl">
        <h2 className="font-display text-lg font-semibold text-text-primary">Links internos</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!linkTargetId) return;
            createLink.mutate(linkTargetId);
            setLinkTargetId("");
          }}
          className="flex gap-2 items-end"
        >
          <div className="flex-1">
            <Select label="Ligar a uma página" value={linkTargetId} onChange={(e) => setLinkTargetId(e.target.value)}>
              <option value="">Selecionar...</option>
              {linkablePages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" variant="primary">
            Ligar
          </Button>
        </form>

        <h3 className="font-sans text-sm font-semibold text-text-secondary-warm">
          Backlinks (páginas que referenciam esta)
        </h3>
        {backlinks.length === 0 ? (
          <p className="font-sans text-sm text-text-secondary-warm">Nenhum backlink ainda.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {backlinks.map((backlink) => (
              <li key={backlink.id}>
                <Link
                  to={`/segundo-cerebro/${backlink.id}`}
                  className="font-sans text-sm text-brand-cyan hover:underline"
                >
                  {backlink.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="w-full max-w-2xl">
        <CheckpointsPanel client={supabase} pageId={pageId} />
      </Card>
    </main>
  );
}
