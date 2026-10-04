# Download do APK Android

O site oferece o APK na seção inicial e no rodapé. Os dois links usam `APK_URL`, em
`apps/site/src/config.ts`, e apontam para um arquivo versionado de uma release do GitHub.
O arquivo não entra no Git nem no build do Cloudflare Pages (limite de 25 MiB por arquivo).

## Gerar e assinar

Com o SDK/NDK Android, JDK, Rust e Tauri CLI configurados, instale as dependências e gere
o APK de release para celulares ARM de 32 e 64 bits:

```powershell
corepack pnpm install --frozen-lockfile
cargo tauri android build --apk --target aarch64 armv7 --ci
pwsh -File tools/sign-android-apk.ps1 -InputApk src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk -OutputApk artifacts.local/qqorvex-android-beta.apk -BuildTools "$env:ANDROID_HOME/build-tools/35.0.0"
```

Confira o caminho retornado pelo Tauri, pois o nome da saída pode variar. O script alinha,
assina, verifica o certificado e imprime o SHA-256 do APK. A primeira execução gera uma chave
RSA privada em `.android-signing.local/qqorvex-release.jks`. A senha é guardada pelo DPAPI do
Windows em `credentials.clixml`, vinculada ao usuário e computador que a geraram.
O diretório é ignorado pelo Git. Preserve um backup seguro da chave e das credenciais;
atualizações do mesmo aplicativo precisam da mesma assinatura. Não publique nenhum desses arquivos.

## Publicar

1. Valide o APK em um dispositivo Android (Android 7 ou superior), inclusive login e retorno OAuth.
2. Publique somente o APK assinado e seu SHA-256 em uma prerelease do GitHub.
3. Atualize `APK_URL` para o endereço exato do asset e compile `corepack pnpm --filter site build`.
4. Abra o PR. Quando ele chegar à `main`, o Cloudflare publica o site automaticamente.

O download não concede acesso ao beta: a conta continua sujeita ao convite existente.
Esse APK é para instalação direta; não habilita cobrança nem publicação na Google Play.
