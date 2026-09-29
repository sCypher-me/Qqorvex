# Estados de interface

Estados são visuais e textuais; cor ou animação isolada não pode ser o único sinal.

| Estado | Tratamento |
| --- | --- |
| Normal | Superfície fosca, borda sutil e rótulo de ação claro. |
| Hover | Pequena mudança de superfície/borda; não deslocar controles críticos nem acender glows. |
| Focus-visible | Contorno cyan visível e com offset; ordem de foco segue a leitura. |
| Selecionado/ativo | Tinta cyan discreta, texto/borda de ênfase e semântica persistente (`aria-selected`, `aria-pressed` ou `aria-current`). |
| Disabled | Cor de conteúdo desabilitado, affordance de bloqueio e operação realmente indisponível. |
| Loading | Indicador associado à tarefa, texto de status e botão busy quando aplicável; respeitar redução de movimento. |
| Empty | Explicar o que deveria aparecer e oferecer próximo passo quando existir. |
| Success | Verde semântico com confirmação explícita. |
| Warning | Âmbar semântico com consequência e orientação. |
| Error | Vermelho semântico, mensagem recuperável e preservação de entrada sempre que possível. |
| Critical | Vermelho crítico apenas para risco elevado/confirmação destrutiva. |

Transições ficam dentro de 160–320ms e desaparecem com `prefers-reduced-motion: reduce`. Operações assíncronas mantêm seus estados e chamadas reais; o redesign não os converte em conteúdo estático.
