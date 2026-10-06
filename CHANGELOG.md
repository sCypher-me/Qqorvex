# Changelog do Qqorvex

Todas as mudanças importantes do app ficam registradas aqui. Os APKs beta são identificados com
`android-beta-<data>-v<versão>` e publicados como prereleases no GitHub.

## [0.2.1] — 2026-10-06

### Corrigido

- Confirmação de e-mail no navegador e no Android direciona automaticamente o cadastro por e-mail
  ao onboarding.
- Cadastros novos com Google, Discord e GitHub criam uma senha do Qqorvex antes do onboarding;
  convites mantêm o fluxo próprio de criar senha e depois configurar a conta.
- Contas de e-mail com identidade social vinculada não recebem uma solicitação redundante de senha.
- Ferramentas da Vex removem campos incompatíveis com o schema do Gemini, evitando erro 502 e o
  fallback antes da resposta do modelo.

### Atualizado

- Versão do app Android/Desktop atualizada para 0.2.1.
- Links de convite e confirmação de e-mail abrem o app Android quando instalado.
- Ícone adaptativo Android ajustado com mais margem ao redor da marca.

## [0.2.0] — 2026-10-06

### Adicionado

- Termos de Uso com identificação do responsável, link público, aceite obrigatório no cadastro por
  e-mail, OAuth e convite, e registro versionado do aceite no Supabase.
- Cargos vinculados ao Discord para Beta Tester, Plus, Lifetime e Parceiro, sincronizados com os
  benefícios atuais da conta.
- Testes do recibo temporário usado para retomar o aceite depois do cadastro OAuth.
- Smoke tests sem autenticação para as novas Edge Functions do Discord.

### Atualizado

- README refeito como apresentação do projeto, com visão do app, instruções, segurança e política
  de versões.
- Versão do app Android/Desktop atualizada para 0.2.0.
- APK beta ajustado para exigir Android 14 (API 34) ou superior.
- Auditorias do release estendidas para cobrir o callback e a sincronização de cargos do Discord.

## [0.1.6] — 2026-10-06

### Adicionado

- Carta de boas-vindas quando uma conta resgata um código Lifetime.
- Recuperação das cotações de ações, FIIs e criptomoedas na tela de investimentos.

## Política de versões

- Uma atualização pequena avança a versão menor: `1.0.0` → `1.1.0`.
- Uma nova geração do produto avança a versão principal: `1.1.0` → `2.0.0`.
- Correções pontuais avançam o último número: `1.1.0` → `1.1.1`.
