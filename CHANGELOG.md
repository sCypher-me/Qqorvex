# Changelog do Qqorvex

Todas as mudanças importantes do app ficam registradas aqui. Os APKs beta são identificados com
`android-beta-<data>-v<versão>` e publicados como prereleases no GitHub.

## [Não lançado]

### Adicionado

- App web atualiza sem cair: depois de um deploy, a aba aberta troca para a versão nova na próxima
  mudança de tela (conferindo `/version.json`) e telas que perderam o código antigo recarregam
  sozinhas em vez de mostrar erro.
- APK baixa a atualização em segundo plano no Wi-Fi e instala quando o app vai para segundo plano,
  sem tela de confirmação quando o Android permite. Ao voltar, o app avisa que foi atualizado.

### Corrigido

- Ao voltar de suspensão ou do segundo plano, o app renova a sessão antes de recarregar os dados,
  em vez de disparar dezenas de consultas com o token vencido (401) por até dois minutos.
- Lembretes push, sincronização do Google Agenda e cargos do Discord não perdem mais a rodada quando o
  Supabase recusa a primeira leitura de `app_secrets`; a leitura tenta de novo e falhas de
  infraestrutura respondem 503 em vez de 401.
- QA visual (`tools/visual-qa/capture.mjs`) funciona no Windows.

## [0.3.0] — 2026-10-06

### Adicionado

- Atualização do APK dentro do app: verifica novas versões beta, baixa a arquitetura correta e
  confere o SHA-256 antes de abrir o instalador do Android.

### Corrigido

- Navegar entre telas não reinicia a verificação dos Termos durante a renovação da sessão.
- A barra superior no Android respeita a área segura da barra de status.
- A tela de investimentos identifica quais grupos de cotações a BrAPI negou e normaliza a chave
  configurada antes da consulta.

### Atualizado

- Versão do app Android/Desktop atualizada para 0.3.0.
- O site passa a oferecer o APK 0.3.0, primeiro beta com atualizações recebidas dentro do app.
- Após instalar esta versão inicial, as próximas atualizações podem ser baixadas pelo próprio app;
  o Android ainda pede autorização da fonte e confirmação da instalação.

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
