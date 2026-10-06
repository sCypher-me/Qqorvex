# Download do APK Android

O site oferece o APK na seção inicial e no rodapé. Os dois links usam `APK_URL`, em
`apps/site/src/config.ts`, e apontam para um arquivo versionado de uma release do GitHub.
O arquivo não entra no Git nem no build do Cloudflare Pages (limite de 25 MiB por arquivo).

## Gerar e assinar

Com o SDK/NDK Android, JDK, Rust e Tauri CLI configurados, atualize a versão em
`src-tauri/tauri.conf.json` e `src-tauri/Cargo.toml` (e regenere o `Cargo.lock`), instale as
dependências e gere os ícones adaptativos e APKs separados para celulares ARM de 32 e 64 bits:

```powershell
corepack pnpm install --frozen-lockfile
cargo tauri icon src-tauri/icon-manifest.json
cargo tauri android build --apk --target aarch64 armv7 --split-per-abi
Get-ChildItem src-tauri/gen/android/app/build/outputs/apk -Recurse -File -Filter '*unsigned.apk'
```

O `minSdkVersion` do beta fica em 34 (Android 14). Confirme esse valor no manifesto dos dois APKs
assinados antes de publicar.

Confira os caminhos ARM64 e ARM32 retornados pelo Tauri. Execute o script abaixo uma vez para cada
arquivo, usando o caminho unsigned correspondente e nomes estáveis para os assets da release:

```powershell
pwsh -File tools/sign-android-apk.ps1 -InputApk "<APK ARM64 unsigned>" -OutputApk artifacts.local/0.2.1/qqorvex-android-arm64.apk -BuildTools "$env:ANDROID_HOME/build-tools/35.0.0"
pwsh -File tools/sign-android-apk.ps1 -InputApk "<APK ARM32 unsigned>" -OutputApk artifacts.local/0.2.1/qqorvex-android-arm32.apk -BuildTools "$env:ANDROID_HOME/build-tools/35.0.0"
```

O script alinha, assina, verifica o certificado e imprime o SHA-256 do APK. A primeira execução gera uma chave
RSA privada em `.android-signing.local/qqorvex-release.jks`. A senha é guardada pelo DPAPI do
Windows em `credentials.clixml`, vinculada ao usuário e computador que a geraram.
O diretório é ignorado pelo Git. Preserve um backup seguro da chave e das credenciais;
atualizações do mesmo aplicativo precisam da mesma assinatura. Não publique nenhum desses arquivos.

## Publicar

1. Valide o APK em um dispositivo Android (Android 14 ou superior), inclusive login e retorno OAuth.
2. Publique os dois APKs assinados e seus SHA-256 em uma prerelease do GitHub. Não coloque os binários
   no Pages: cada APK excede o limite de 25 MiB por arquivo.
3. Atualize `APK_RELEASE` em `apps/site/src/config.ts` para a tag da release, mantendo os nomes dos
   assets `qqorvex-android-arm64.apk` e `qqorvex-android-arm32.apk`, e compile
   `corepack pnpm --filter site build`.
4. Abra ou atualize o PR. Quando ele chegar à `main`, o Cloudflare publica o site automaticamente.

O download não concede acesso ao beta: a conta continua sujeita ao convite existente.
Esse APK é para instalação direta; não habilita cobrança nem publicação na Google Play.
