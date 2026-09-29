# Etapa 2 — fontes e assets

## Usados no preview

- `Vex/VEX_AVATAR_TRANSPARENT_CIRCLE_128.png`: asset já existente no repositório, usado como identificação da Vex. Origem autoral/licença formal não está registrada no repositório; o preview permanece interno e não redistribui o arquivo.
- Marca Qqorvex: wordmark textual no preview. Os PNGs existentes em `Logotipos/` foram inspecionados, mas a direção nova precisa de lockup posterior; nenhum arquivo de marca foi sobrescrito.
- Textura: produzida apenas com gradientes CSS de 1px para pauta cartográfica funcional. Nenhum asset externo.

## Tipografia

- Manrope e JetBrains Mono já possuem WOFF2 locais em `packages/design-system/src/fonts/` e são usados na aplicação. A licença não está incluída nesse diretório; o preview usa a pilha do sistema e não copia esses binários.
- Space Grotesk permanece no código atual, mas não define a direção nova.
- A serif candidata é Fraunces. Ela não foi baixada nem incorporada porque esta etapa não encontrou arquivo/licença versionados localmente.
- Fallback aprovado para a prova: `Georgia, 'Times New Roman', serif`. A adoção futura de Fraunces exige WOFF2 auto-hospedado, licença OFL versionada, preload apenas dos pesos críticos e validação de métricas/reflow.

## Decisões que ainda mudam identidade

1. Aprovar a direção Cartografia Pessoal, pedir ajuste de temperatura/contraste ou refazer a linguagem gráfica.
2. Se a direção for aprovada, autorizar a pesquisa/licenciamento e adoção de uma serif própria no Ciclo 0; até lá, Georgia continua fallback.
3. Definir, no Ciclo 0, se os assets de marca atuais serão recoloridos/adaptados ou se haverá um lockup novo. O nome Qqorvex e a personagem Vex já estão preservados.

Não há decisão pendente sobre o layout de autenticação: duas colunas permanecem em desktop a partir de 1024px.
