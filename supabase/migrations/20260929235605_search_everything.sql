-- Busca global (Ctrl K e ferramenta search_everything da Vex): títulos E conteúdo, sem acento.
-- SECURITY INVOKER: roda como a pessoa logada, então as RLS de cada tabela continuam valendo.
-- Documentos do Cofre e da lixeira nunca aparecem (o nome de um arquivo do Cofre não pode vazar
-- fora de Documentos sem o PIN).

create extension if not exists unaccent with schema extensions;

-- unaccent() não é IMMUTABLE; fixar o dicionário permite marcar o wrapper como IMMUTABLE.
create or replace function public.search_normalize(value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(value, '')))
$$;

-- Todo o texto de um bloco do Segundo Cérebro (valores string do JSON, sem as chaves), para que
-- buscar "text" não case com todo bloco que tem a chave "text".
create or replace function public.search_jsonb_text(value jsonb)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select string_agg(item #>> '{}', ' ')
  from jsonb_path_query(coalesce(value, '{}'::jsonb), 'strict $.** ? (@.type() == "string")') as found(item)
$$;

-- Trecho de ~100 caracteres em volta da primeira ocorrência (needle já normalizado).
create or replace function public.search_snippet(value text, needle text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when value is null or btrim(value) = '' then null
    else (
      select case
        when found.pos = 0 then left(value, 100)
        else concat(
          case when found.pos > 45 then '…' end,
          substr(value, greatest(found.pos - 45, 1), length(needle) + 90),
          case when found.pos + length(needle) + 45 <= length(value) then '…' end
        )
      end
      from (select strpos(public.search_normalize(value), needle) as pos) as found
    )
  end
$$;

create or replace function public.search_everything(query text, per_kind integer default 5)
returns table (kind text, id uuid, title text, snippet text, parent_id uuid, sort_date timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select
      public.search_normalize(btrim(query)) as needle,
      '%' || replace(replace(replace(public.search_normalize(btrim(query)), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
  )
  select results.*
  from q, lateral (
    (select 'tarefa'::text, t.id, t.title,
            case when public.search_normalize(t.title) like q.pattern then null else public.search_snippet(t.description, q.needle) end,
            null::uuid, t.updated_at
     from public.tasks t
     where not t.is_cancelled
       and (public.search_normalize(t.title) like q.pattern or public.search_normalize(t.description) like q.pattern)
     order by t.updated_at desc
     limit least(greatest(coalesce(per_kind, 5), 1), 20))
    union all
    (select 'evento', e.id, e.title,
            case when public.search_normalize(e.title) like q.pattern then null else public.search_snippet(coalesce(e.description, e.location), q.needle) end,
            null::uuid, e.start_at
     from public.events e
     where public.search_normalize(e.title) like q.pattern
        or public.search_normalize(e.description) like q.pattern
        or public.search_normalize(e.location) like q.pattern
     order by e.start_at desc
     limit least(greatest(coalesce(per_kind, 5), 1), 20))
    union all
    (select 'nota', p.id, coalesce(nullif(p.title, ''), 'Sem título'), body.snippet, null::uuid, p.updated_at
     from public.pages p
     left join lateral (
       select public.search_snippet(public.search_jsonb_text(b.content), q.needle) as snippet
       from public.blocks b
       where b.page_id = p.id
         and public.search_normalize(public.search_jsonb_text(b.content)) like q.pattern
       order by b.order_index
       limit 1
     ) as body on true
     where not p.is_archived
       and (public.search_normalize(p.title) like q.pattern or body.snippet is not null)
     order by p.updated_at desc
     limit least(greatest(coalesce(per_kind, 5), 1), 20))
    union all
    (select 'resumo', s.id, s.title,
            case when public.search_normalize(s.title) like q.pattern then null else public.search_snippet(s.content, q.needle) end,
            s.notebook_id, s.updated_at
     from public.summaries s
     where public.search_normalize(s.title) like q.pattern or public.search_normalize(s.content) like q.pattern
     order by s.updated_at desc
     limit least(greatest(coalesce(per_kind, 5), 1), 20))
    union all
    (select 'flashcard', f.id, f.front, public.search_snippet(f.back, q.needle), f.notebook_id, f.updated_at
     from public.flashcards f
     where public.search_normalize(f.front) like q.pattern or public.search_normalize(f.back) like q.pattern
     order by f.updated_at desc
     limit least(greatest(coalesce(per_kind, 5), 1), 20))
    union all
    (select 'caderno', n.id, n.name,
            case when public.search_normalize(n.name) like q.pattern then null else public.search_snippet(n.description, q.needle) end,
            null::uuid, n.updated_at
     from public.notebooks n
     where public.search_normalize(n.name) like q.pattern or public.search_normalize(n.description) like q.pattern
     order by n.updated_at desc
     limit least(greatest(coalesce(per_kind, 5), 1), 20))
    union all
    (select 'meta', g.id, g.title,
            case when public.search_normalize(g.title) like q.pattern then null else public.search_snippet(coalesce(g.description, g.motivation_note), q.needle) end,
            null::uuid, g.updated_at
     from public.goals g
     where public.search_normalize(g.title) like q.pattern
        or public.search_normalize(g.description) like q.pattern
        or public.search_normalize(g.motivation_note) like q.pattern
     order by g.updated_at desc
     limit least(greatest(coalesce(per_kind, 5), 1), 20))
    union all
    (select 'habito', h.id, h.name,
            case when public.search_normalize(h.name) like q.pattern then null else public.search_snippet(h.description, q.needle) end,
            null::uuid, h.updated_at
     from public.habits h
     where public.search_normalize(h.name) like q.pattern or public.search_normalize(h.description) like q.pattern
     order by h.updated_at desc
     limit least(greatest(coalesce(per_kind, 5), 1), 20))
    union all
    (select 'biblioteca', l.id, l.title,
            case when public.search_normalize(l.title) like q.pattern then l.subtitle else public.search_snippet(coalesce(l.subtitle, l.description, l.short_note), q.needle) end,
            null::uuid, l.updated_at
     from public.library_items l
     where public.search_normalize(l.title) like q.pattern
        or public.search_normalize(l.subtitle) like q.pattern
        or public.search_normalize(l.description) like q.pattern
        or public.search_normalize(l.short_note) like q.pattern
     order by l.updated_at desc
     limit least(greatest(coalesce(per_kind, 5), 1), 20))
    union all
    (select 'documento', d.id, d.file_name,
            case when public.search_normalize(d.file_name) like q.pattern then null else public.search_snippet(d.extracted_text, q.needle) end,
            null::uuid, d.updated_at
     from public.documents d
     where d.deleted_at is null
       and not d.is_vault
       and (public.search_normalize(d.file_name) like q.pattern or public.search_normalize(d.extracted_text) like q.pattern)
     order by d.updated_at desc
     limit least(greatest(coalesce(per_kind, 5), 1), 20))
    union all
    (select 'lancamento', tr.id, tr.name,
            case when public.search_normalize(tr.name) like q.pattern then null else public.search_snippet(tr.note, q.needle) end,
            null::uuid, tr.date::timestamptz
     from public.transactions tr
     where public.search_normalize(tr.name) like q.pattern or public.search_normalize(tr.note) like q.pattern
     order by tr.date desc
     limit least(greatest(coalesce(per_kind, 5), 1), 20))
    union all
    (select 'ideia', i.id, i.title,
            case when public.search_normalize(i.title) like q.pattern then null else public.search_snippet(i.description, q.needle) end,
            null::uuid, i.updated_at
     from public.ideas i
     where public.search_normalize(i.title) like q.pattern or public.search_normalize(i.description) like q.pattern
     order by i.updated_at desc
     limit least(greatest(coalesce(per_kind, 5), 1), 20))
  ) as results(kind, id, title, snippet, parent_id, sort_date)
  where length(q.needle) >= 2
$$;

revoke all on function public.search_everything(text, integer) from public, anon;
grant execute on function public.search_everything(text, integer) to authenticated;
revoke all on function public.search_snippet(text, text) from public, anon;
grant execute on function public.search_snippet(text, text) to authenticated;
revoke all on function public.search_jsonb_text(jsonb) from public, anon;
grant execute on function public.search_jsonb_text(jsonb) to authenticated;
revoke all on function public.search_normalize(text) from public, anon;
grant execute on function public.search_normalize(text) to authenticated;
