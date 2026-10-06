# Termos de Uso e registro de aceite

O documento público e canônico está em `apps/qqorvex/src/pages/Termos.tsx` e é servido em `/termos`. A versão atual é `2026-10-06-v1`.

## O que a implementação faz

- O cadastro por e-mail exige uma caixa desmarcada por padrão, com link para os Termos, e inclui a versão aceita nos metadados enviados ao Supabase Auth.
- A migration `20261006194848_terms_acceptance.sql` salva a data/hora do servidor, versão, usuário e origem em `public.user_terms_acceptances`; cada usuário só pode consultar seu próprio registro.
- O fluxo OAuth iniciado no cadastro exige a mesma caixa e retoma o registro do aceite após o redirecionamento. Uma nova conta OAuth ou por convite criada por outro caminho fica bloqueada até aceitar os Termos.
- O aceite também é exigido no fluxo de convite. Contas existentes permanecem acessíveis; o aceite se aplica a cadastros e contas novas criadas por OAuth ou convite depois da migration. O acesso ao restante do app fica bloqueado enquanto existir uma exigência de aceite no registro privado do banco; metadados editáveis da conta não controlam essa trava.
- A migration deve ser aplicada no Supabase antes de publicar o app que consulta o aceite.

## Pendências antes de divulgação pública

- Confirmar que o endereço completo publicado está correto: Rua A2, Q. 03, Lt. 1/21, Vila Alpes, Goiânia, GO, CEP 74310-030. Goiânia foi preenchida pela correspondência pública do CEP informado.
- Confirmar um telefone de contato do fornecedor, caso exigido para os canais de comércio eletrônico que vierem a ser habilitados.
- Solicitar revisão do documento por profissional jurídico brasileiro, em especial das cláusulas de consumidor, IA, retenção, transferências internacionais e do plano Lifetime.
- Publicar uma Política de Privacidade independente ou separar a seção de dados deste documento, com lista e configuração atualizadas dos operadores/suboperadores e respectivos locais de tratamento.
- Validar no Supabase de teste: cadastro por e-mail, OAuth novo, OAuth de conta existente, aceite pendente no primeiro acesso, convite, RLS de leitura própria, impossibilidade de inserir/alterar a tabela diretamente e RPC limitada ao usuário autenticado.
