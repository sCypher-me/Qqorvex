# Segundo Cérebro — Histórico de Versões/Checkpoints (design)

Definido com o usuário em 12/09/2026 via brainstorming, sem consultar o Xmind original (não
disponível nesta sessão) — mesmo espírito de quando Vida Pessoal foi reconstruído do zero.

## Decisões

- Gatilho: **manual**, botão "Salvar checkpoint" — não automático a cada edição (evitaria dezenas
  de versões de digitação em tempo real).
- Conteúdo de um checkpoint: **título + todos os blocos da página** naquele momento (snapshot
  completo, não só os blocos).
- Restaurar segue o mesmo espírito "git revert" já usado em Documentos
  (`restoreDocumentVersion()`): nunca é "git reset" — o estado atual é arquivado como um checkpoint
  automático antes de aplicar o antigo, então nada desaparece do histórico.

## Schema

```sql
create table public.page_checkpoints (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references pages(id) on delete cascade,
  title text not null,
  blocks_snapshot jsonb not null,
  created_at timestamptz not null default now()
);
```
`blocks_snapshot` guarda a lista ordenada de blocos (`block_type`+`content`+`order_index`) naquele
momento. RLS via join à página dona, mesmo padrão de `page_properties`/`page_tags`.

## Repositório

`createCheckpoint(client, pageId)` — lê o título da página + `listBlocks()` atual, insere o
snapshot.

`restoreCheckpoint(client, pageId, checkpoint)` — sequência "git revert": (1) cria um checkpoint
automático do estado atual (mesmo `createCheckpoint()`, chamado internamente — garante que o
estado anterior à restauração nunca se perde); (2) apaga todos os blocos atuais da página; (3)
recria os blocos a partir de `checkpoint.blocks_snapshot`; (4) atualiza o título da página pro
`checkpoint.title`.

## UI

Novo `CheckpointsPanel` na página do Segundo Cérebro: botão "Salvar checkpoint" (mostra a
data/hora), lista de checkpoints existentes com "Restaurar" por item.

## Teste

**Implementado e testado em 12/09/2026.** Migration + RLS verificadas ao vivo. Fluxo completo
testado via SQL direto reproduzindo exatamente os passos de `restoreCheckpoint()`: página criada
com um bloco, checkpoint salvo ("versão original"), bloco editado ("versão editada"), restaurado —
confirmado que o título e o conteúdo do bloco voltaram exatamente ao snapshot original, e que os
**dois** checkpoints (o original e o automático da versão editada, criado antes da restauração)
sobreviveram — nada foi perdido, confirmando a semântica "git revert, nunca git reset". Cascata de
`page_checkpoints` ao apagar a página também confirmada. Typecheck e build limpos. UI (seção
"Histórico" na página do Segundo Cérebro) sem teste de clique real — fica pro usuário.
