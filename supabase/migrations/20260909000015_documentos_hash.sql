-- Detecção de duplicados por hash. "Evolução futura"/"definido na implementação" no Xmind, v1
-- lean: hash do conteúdo calculado no cliente (Web Crypto, SHA-256) no momento do upload —
-- Documentos continua dono do arquivo, isto só permite avisar "você já enviou isso" antes de
-- duplicar espaço no Storage.
alter table public.documents add column content_hash text;

create index documents_content_hash_idx on public.documents (user_id, content_hash) where content_hash is not null;
