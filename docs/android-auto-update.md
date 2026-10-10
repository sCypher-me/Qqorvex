# Atualizações do app Android

O app beta verifica o GitHub Releases ao abrir, ao voltar para a tela e a cada 30 minutos (com cache
de seis horas da consulta). Quando encontra uma versão mais nova para o seu canal e arquitetura:

1. **Download em segundo plano.** No Wi-Fi (rede não medida) o APK é baixado sozinho e o SHA-256 é
   conferido antes de qualquer instalação. Em dados móveis o app espera; o aviso oferece
   "Atualizar agora" para quem quiser baixar mesmo assim.
2. **Instalação quando você sai do app.** Com o APK pronto, a instalação acontece quando o Qqorvex vai
   para segundo plano, pelo `PackageInstaller` do Android pedindo `USER_ACTION_NOT_REQUIRED`. Ao voltar,
   o app já abre na versão nova e mostra "Qqorvex atualizado". Nada é instalado enquanto a tela está em
   uso; "Instalar agora" no aviso antecipa a troca.
3. **Quando o Android pede confirmação.** Se o sistema exigir confirmação (por exemplo, a primeira
   atualização depois de instalar o APK pelo navegador), o aviso dentro do app mostra "Instalar agora".
   A tentativa automática não se repete para a mesma versão antes de 6 horas.

## O que o Android ainda exige

- **Autorização "Instalar apps desconhecidos"** para o Qqorvex, uma vez por aparelho. Sem ela, a
  instalação automática não é tentada (abrir as configurações com o app em segundo plano seria
  intrusivo); o aviso leva às configurações quando a pessoa tocar em Instalar.
- **Atualização sem confirmação** vale quando o próprio app atualiza a si mesmo, com a autorização acima,
  o mesmo certificado de assinatura e `targetSdk` recente. O Android pode, ainda assim, pedir
  confirmação em casos que ele decidir; o fluxo de confirmação continua funcionando.
- A primeira versão que contém este atualizador precisa ser instalada manualmente.
- O APK baixado fica no cache do app e é apagado na abertura seguinte, quando a versão instalada já é
  igual ou mais nova.

## Publicar uma versão que o app reconhece

1. Aumente a versão em `src-tauri/tauri.conf.json` e `src-tauri/Cargo.toml`.
2. Gere os APKs de release e assine todos com o mesmo certificado já usado pelo Qqorvex. Uma troca de certificado impede a atualização da instalação existente.
3. Publique um GitHub Release com uma tag no formato `android-beta-AAAAMMDD-vX.Y.Z` para o canal beta ou `android-stable-AAAAMMDD-vX.Y.Z` para o estável. Defina `VITE_APP_UPDATE_CHANNEL=beta` ao compilar APKs beta; builds estáveis usam `VITE_APP_UPDATE_CHANNEL=stable`.
4. Anexe os APKs com os nomes usados pelo projeto: `qqorvex-android-arm64.apk` e `qqorvex-android-arm32.apk`.
5. O GitHub Release precisa expor o digest SHA-256 do asset (`sha256:...`). Releases sem digest são ignorados pelo app.

O app escolhe a versão mais nova que corresponde ao seu canal e arquitetura. Uma release com versão igual ou inferior à instalada não aparece como atualização. O canal estável é o padrão; para gerar um APK de teste, defina `VITE_APP_UPDATE_CHANNEL=beta`. Assim, publicar um beta não troca a atualização oferecida a quem usa o canal estável.

## Limite entre app e site

Esta distribuição do Tauri inclui a interface dentro do APK. Por isso, publicar apenas mudanças no site não altera a cópia instalada. Uma alteração na interface ou nas funções do app ainda exige gerar e publicar um APK; depois disso, os usuários recebem a atualização pelo app, sem procurar e baixar o arquivo no site. Atualizações de dados e serviços hospedados continuam podendo chegar sem novo APK.
