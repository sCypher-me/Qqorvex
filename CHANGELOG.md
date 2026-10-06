# Changelog do Qqorvex

Todas as mudanças importantes do app ficam registradas aqui. Os APKs beta são identificados com
`android-beta-<data>-v<versão>` e publicados como prereleases no GitHub.

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
