# Atualizações do app Android

O app beta verifica o GitHub Releases ao abrir e depois a cada seis horas enquanto permanece aberto. Quando encontra uma versão mais nova, apresenta um aviso dentro do Qqorvex. O botão de atualização baixa o APK no próprio app, confere o SHA-256 e abre o instalador do Android.

## O que o Android ainda exige

Como o Qqorvex é distribuído por APK fora da Play Store, o Android pede autorização para instalar apps dessa fonte (uma vez por aparelho) e confirmação para cada atualização. O app não instala APKs silenciosamente. A primeira versão que contém o atualizador também precisa ser instalada manualmente; as seguintes podem ser recebidas pelo aviso dentro do app.

## Publicar uma versão que o app reconhece

1. Aumente a versão em `src-tauri/tauri.conf.json` e `src-tauri/Cargo.toml`.
2. Gere os APKs de release e assine todos com o mesmo certificado já usado pelo Qqorvex. Uma troca de certificado impede a atualização da instalação existente.
3. Publique um GitHub Release com uma tag no formato `android-beta-AAAAMMDD-vX.Y.Z` para o canal beta ou `android-stable-AAAAMMDD-vX.Y.Z` para o estável. Defina `VITE_APP_UPDATE_CHANNEL=beta` ao compilar APKs beta; builds estáveis usam `VITE_APP_UPDATE_CHANNEL=stable`.
4. Anexe os APKs com os nomes usados pelo projeto: `qqorvex-android-arm64.apk` e `qqorvex-android-arm32.apk`.
5. O GitHub Release precisa expor o digest SHA-256 do asset (`sha256:...`). Releases sem digest são ignorados pelo app.

O app escolhe a versão mais nova que corresponde ao seu canal e arquitetura. Uma release com versão igual ou inferior à instalada não aparece como atualização. O canal estável é o padrão; para gerar um APK de teste, defina `VITE_APP_UPDATE_CHANNEL=beta`. Assim, publicar um beta não troca a atualização oferecida a quem usa o canal estável.

## Limite entre app e site

Esta distribuição do Tauri inclui a interface dentro do APK. Por isso, publicar apenas mudanças no site não altera a cópia instalada. Uma alteração na interface ou nas funções do app ainda exige gerar e publicar um APK; depois disso, os usuários recebem a atualização pelo app, sem procurar e baixar o arquivo no site. Atualizações de dados e serviços hospedados continuam podendo chegar sem novo APK.
