# Auditoria visual atual — Qqorvex

**Data:** 24/09/2026  
**Escopo:** shell, autenticação, componentes compartilhados, overlays e Vex; leitura estrutural das rotas protegidas.  
**Estado:** fundação do redesign aplicada; validação visual autenticada continua pendente.

## Evidência renderizada

As capturas públicas foram registradas em `preview-current-20260924/capturas/`:

- `login-1440x900.png` e `login-390x844.png`: baseline antes da fundação;
- `login-1440x900-after-foundation.png` e `login-390x844-after-foundation.png`: depois dos tokens e componentes compartilhados;
- `criar-conta-390x844.png`: estado público de cadastro;
- tentativas de `/tarefas` e `/vex`: redirecionaram para login por não haver sessão autenticada no navegador de captura.

## Achados que orientaram a primeira camada

1. As superfícies usavam tons muito próximos e as bordas tinham quase o mesmo peso em todos os níveis; isso achatava a leitura entre workspace, card, campo e overlay.
2. A ação primária tinha aparência de ação secundária, reduzindo a clareza do próximo passo.
3. Rail lateral, header, navegação móvel e Vex usavam contratos visuais diferentes para estados ativos, foco e profundidade.
4. Inputs com hint/erro visual não associavam automaticamente a descrição ao controle.
5. A paleta de comandos e o modal tinham boa base de foco, mas precisavam de uma hierarquia visual mais clara e de densidade responsiva mais previsível.
6. O rail recolhido da Vex carregava muita decoração vertical para uma ação única; a presença foi reduzida a um marcador de conversa legível, sem glow permanente.

## Limites

O usuário autorizou a captura automatizada, mas a sessão local usada pelo Playwright não possui a conta autenticada. Portanto, não considero as rotas protegidas visualmente auditadas nesta etapa. A avaliação dessas rotas será feita no preview com a conta real após a fundação; não uso screenshots antigas de protótipos como prova do estado atual.
