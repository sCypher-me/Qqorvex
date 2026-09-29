# Checklist de release — Web/Desktop

**Snapshot:** 23/09/2026  
**Escopo:** preview Web/Vite e builds Desktop/Tauri; Android está fora desta fase por decisão do usuário.

O manifesto de integridade dos artefatos está em [`SHA256SUMS-20260923.txt`](./SHA256SUMS-20260923.txt).

## Gates aprovados

- [x] `corepack pnpm typecheck` nos 19 workspaces com script.
- [x] `corepack pnpm test`: 14 arquivos e 106 testes.
- [x] `corepack pnpm --filter qqorvex build`.
- [x] `cargo tauri build` release x64: `app.exe`, MSI e instalador NSIS gerados.
- [x] `corepack pnpm audit:edge`.
- [x] `corepack pnpm audit:native`.
- [x] AccessLint sem violações no loading e nas cinco rotas públicas de autenticação.
- [x] Smoke runtime sem autenticação: funções protegidas retornam `401`.
- [x] Smoke HTTP do preview: 22 rotas registradas retornam `200` e entregam o elemento `#root`.
- [x] RLS entre as duas contas: usuário comum vê somente o próprio perfil e dado temporário;
      não vê badges/gamificação do Dono; Dono não vê a tarefa temporária do usuário comum.
- [x] A tarefa usada no teste RLS foi revertida; não há dado de teste persistido.

## Artefatos disponíveis

- Desktop release: `src-tauri/target/release/app.exe` — 66.812.928 bytes — SHA-256 `B15CFC1BC543CE8650FAA856AD5C566263667EA7DD05E8967692323837E3955E`.
- MSI release: `src-tauri/target/release/bundle/msi/qqorvex_0.1.0_x64_en-US.msi` — 60.989.440 bytes — SHA-256 `9B1A1C00FF5C5ED1D5AF0536F953DBB85FB15022BE45C7D15C9990434EDF7AD6`.
- NSIS release: `src-tauri/target/release/bundle/nsis/qqorvex_0.1.0_x64-setup.exe` — 60.257.830 bytes — SHA-256 `313B25E671007A72FA3D40F68C66AAB28492995D62C03086B478EF2875C3E790`.
- Artefatos debug anteriores continuam disponíveis em `src-tauri/target/debug/` para diagnóstico.
- APK debug atual: `src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk` — 925.302.339 bytes — SHA-256 `64AA77EEE27E5086AA432B7944F91C4DFC31400A4B66F92162C129F95EFB4411`.
- AAB debug atual: `src-tauri/gen/android/app/build/outputs/bundle/universalDebug/app-universal-debug.aab` — 364.618.764 bytes — SHA-256 `3141BEDA803C2EA3A77E4709C662C48710AF218E76A3E552FFBF8E39122EFF1E`.
- `aapt dump badging` confirmou pacote debug, `targetSdkVersion 36` e as permissões `INTERNET`/`RECORD_AUDIO`.

Os três artefatos Windows estão **sem assinatura digital de código** (`Authenticode: NotSigned`).
Isso não impede o teste local, mas pode gerar aviso do Windows e deve ser resolvido antes de uma
distribuição pública; não foi contratado nenhum certificado nesta fase.

## Aceite manual ainda recomendado

- [x] Usuário confirmou o teste manual do preview e das telas autenticadas principais com as duas contas.
- [x] Usuário confirmou o painel de gerenciamento da conta Dono.
- [ ] Criar e apagar uma tarefa real em cada conta, caso seja desejada uma validação visual do CRUD.
- [ ] Conferir viewport desktop, teclado, foco, Escape e overlays nas telas protegidas.
- [ ] Executar `corepack pnpm audit --prod` em um terminal com acesso autorizado ao registry npm.

## Fora do escopo desta fase

- [ ] Proteção nativa contra senhas vazadas: recurso Pro ou superior do Supabase; limitação
      documentada, sem cobrança obrigatória para continuar.
- [ ] Instalação/validação do APK em aparelho ou emulador: adiada pelo usuário.
- [ ] Aplicação da otimização ampla das 271 policies RLS: não aplicar diretamente em produção;
      o histórico de migrations continua sendo reconciliado de forma aditiva.
