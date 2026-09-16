# Central de Segurança — PIN do Cofre (design)

Segundo sub-projeto da Central de Segurança (sessões/dispositivos já implementado, ver
`docs/decisions/central-seguranca-sessoes-design.md`). Definido com o usuário em 11/09/2026 via
brainstorming.

## Decisões

- **Propósito**: o PIN destrava só o Cofre de Documentos — não é desbloqueio geral do app.
- **Validação**: no servidor, via função Postgres (`security definer`), não no cliente — mais
  difícil de burlar pelo DevTools.
- **Escopo**: inclui a integração com a barreira do Cofre da Vex (Fase 7 do Context Engine, hoje
  bloqueio total) — as duas pontas saem juntas.
- **Proteção**: os dois caminhos de acesso ao Cofre — direto pela tela de Documentos e via Vex —
  ficam protegidos, não só um deles.
- **PIN na Vex**: pedido na própria conversa (reaproveita o mecanismo já existente de "pergunte o
  que falta" da Fase 4 do Context Engine), não uma etapa de confirmação separada. Trade-off aceito
  conscientemente: o PIN fica registrado no histórico da conversa — aceitável porque o histórico já
  é 100% privado por RLS (só o próprio usuário vê) e o app é de usuário único.

## Armazenamento e força-bruta

`profiles` ganha `pin_hash text`, `pin_failed_attempts int not null default 0`,
`pin_locked_until timestamptz`. Hash via `pgcrypto` (`extensions.crypt()`/`gen_salt('bf')`, já
instalado, mesmo padrão de extensão isolada do schema `public` usado desde `profiles_hardening`).
PIN de 6 dígitos mínimo; 5 tentativas erradas bloqueiam por 5 minutos — sem isso um PIN de 6
dígitos seria só ~10 mil combinações testáveis via API.

## Funções RPC

```sql
create or replace function public.has_security_pin() returns boolean
  language sql security definer set search_path = ''
  as $$ select pin_hash is not null from public.profiles where id = auth.uid(); $$;

create or replace function public.set_security_pin(new_pin text) returns void
  language plpgsql security definer set search_path = ''
  as $$
  begin
    if length(new_pin) < 6 or new_pin !~ '^[0-9]+$' then
      raise exception 'O PIN precisa ter pelo menos 6 dígitos numéricos.';
    end if;
    update public.profiles
    set pin_hash = extensions.crypt(new_pin, extensions.gen_salt('bf')),
        pin_failed_attempts = 0, pin_locked_until = null
    where id = auth.uid();
  end; $$;

create or replace function public.verify_security_pin(candidate_pin text) returns boolean
  language plpgsql security definer set search_path = ''
  as $$
  declare
    stored_hash text;
    failed_attempts int;
    locked_until timestamptz;
    is_correct boolean;
  begin
    select pin_hash, pin_failed_attempts, pin_locked_until
      into stored_hash, failed_attempts, locked_until
      from public.profiles where id = auth.uid();

    if stored_hash is null then return false; end if;
    if locked_until is not null and locked_until > now() then return false; end if;

    is_correct := stored_hash = extensions.crypt(candidate_pin, stored_hash);

    if is_correct then
      update public.profiles set pin_failed_attempts = 0, pin_locked_until = null where id = auth.uid();
    else
      failed_attempts := failed_attempts + 1;
      update public.profiles
      set pin_failed_attempts = failed_attempts,
          pin_locked_until = case when failed_attempts >= 5 then now() + interval '5 minutes' else null end
      where id = auth.uid();
    end if;

    return is_correct;
  end; $$;

revoke execute on function public.has_security_pin() from anon;
revoke execute on function public.set_security_pin(text) from anon;
revoke execute on function public.verify_security_pin(text) from anon;
grant execute on function public.has_security_pin() to authenticated;
grant execute on function public.set_security_pin(text) to authenticated;
grant execute on function public.verify_security_pin(text) to authenticated;
```

Mesmo padrão `security definer` de `list_my_sessions`/`revoke_my_session` — e mesmo cuidado de
revogar `anon` explicitamente (Supabase concede `EXECUTE` a `anon` por padrão na criação da
função, revogar de `public` não basta).

## Cliente (`packages/auth`)

Novo `packages/auth/src/pin.ts` (`hasSecurityPin`/`setSecurityPin`/`verifySecurityPin`) +
`usePin.ts` (mesmo padrão local de `useMfaFactors`/`useSessions`). Nova seção "PIN do Cofre" em
`/seguranca` — cadastrar/trocar PIN (sempre pede o PIN atual pra trocar, se já existir um).

## Documentos — Cofre de verdade na UI

Hoje `is_vault` não tem nenhuma UI. Novo `toggleVault()` em `@qqorvex/module-documentos/repository.ts`
(mesmo padrão de `toggleImportant()`) + hook `useToggleVault`; `DocumentCard` ganha botão
"Marcar no Cofre"/"Tirar do Cofre". Em `Documentos.tsx` (nível do app, não do módulo — só a página
sabe de `@qqorvex/auth`, módulos continuam auth-agnósticos, recebendo `client`/`userId` prontos),
documentos com `is_vault` aparecem mascarados ("🔒 Documento no Cofre", sem nome/ações) até
desbloquear com o PIN; desbloqueio é um estado local de sessão de navegação (não persiste —
recarregar a página tranca de novo). Botão "Desbloquear Cofre" aparece quando há algo trancado.

## Vex — Fase 7 evolui de bloqueio total pra "autorizar com PIN"

`toggle_important_by_name` (e qualquer ferramenta futura sobre Documentos que precise tocar um
item do Cofre) ganha um parâmetro opcional `pin`. `execute()`: se o documento encontrado for
`is_vault` e não vier `pin` (ou vier errado), recusa com uma mensagem pedindo o PIN — a Vex, pela
instrução do prompt geral de "pergunte o que falta" (Fase 4), pergunta ao usuário e tenta de novo
com o PIN informado. `list_documents` continua sempre excluindo documentos do Cofre da listagem —
isso não muda; só a ação pontual sobre um documento específico já conhecido pelo nome passa a ser
possível com PIN correto.

## Teste

**Implementado e testado em 11/09/2026.** Dois bugs reais encontrados e corrigidos durante o
teste:
1. **`set_security_pin` com assinatura nova criou um overload, não substituiu a antiga** —
   `create or replace function` no Postgres identifica a função pela lista de tipos de parâmetro;
   adicionar `current_pin` mudou a assinatura, então a versão de 1 argumento (sem exigir PIN atual)
   ficou viva e chamável em paralelo, contornando a proteção. Corrigido com `drop function
   set_security_pin(text)` explícito antes de recriar.
2. **`set_security_pin` não respeitava o bloqueio de tentativas** — o `current_pin` era comparado
   direto, sem checar `pin_locked_until`, dando uma segunda porta pra forçar o PIN por tentativa e
   erro sem passar pelo limite de 5 do `verify_security_pin`. Corrigido: agora também confere o
   bloqueio e conta tentativa errada quando o `current_pin` não bate.

Testado ao vivo contra o Supabase real simulando `auth.uid()` via `set_config` (mesma técnica de
sessões/dispositivos), contra o perfil do usuário confirmado, tudo restaurado ao estado original
(`pin_hash = null`) ao final: PIN cadastrado, `verify_security_pin` aceitando o PIN certo e
recusando o errado, contador de tentativas incrementando a cada erro e resetando a cada acerto,
bloqueio disparando exatamente na 5ª tentativa errada, PIN correto continuando recusado enquanto
bloqueado, `set_security_pin` exigindo e validando o PIN atual pra trocar (recusa sem ele, recusa
com o errado, recusa mesmo com o certo enquanto bloqueado, aceita com o certo depois de
desbloqueado). Typecheck e build limpos. UI (cadastrar PIN em `/seguranca`, desbloquear Cofre em
`/documentos`, Vex pedindo PIN em conversa) sem teste de clique real — fica pro usuário.
