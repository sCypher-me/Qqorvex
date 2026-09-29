# Redesign Qqorvex — Etapa 0: Skills

Status: **aprovada pelo Agente Revisor**.

## Critério de seleção

As skills foram escolhidas pela contribuição direta ao redesign: investigação do problema, direção visual, sistema de design, qualidade de implementação, acessibilidade, especificação e validação de protótipos. A seleção evita sobreposição desnecessária e não altera o produto nesta etapa.

## Núcleo aprovado

| Skill | Papel no processo |
| --- | --- |
| `design-thinking` | Descoberta, definição do problema e ideação antes da solução visual. |
| `ui-ux-pro-max` | Referência ampla de padrões, composição e qualidade de UI. |
| `frontend-design` | Tradução da direção visual em interfaces implementáveis e consistentes. |
| `design-system` | Tokens, componentes, estados e regras compartilhadas. |
| `emil-design-eng` | Qualidade de engenharia visual e acabamento de interação. |
| `design-ux` | Auditoria heurística, comparação mobile/desktop e validação por tarefas. |
| `accessibility-compliance-accessibility-audit` | Auditoria de teclado, foco, semântica, contraste, toque e reflow. |
| `design-spec` | Registro de decisões e critérios verificáveis por etapa. |

## Apoio opcional

`prototype` pode ser usado quando uma alternativa precisar ser demonstrada antes da implementação definitiva.

## Skills descartadas do núcleo

- `ui-visual-validator`: os recursos esperados pela skill não estão disponíveis no workspace atual.
- `webapp-testing`: a instalação Playwright independente não está presente. A validação visual e responsiva usa o navegador integrado, complementada por testes e typecheck locais.

## Limites conhecidos

- O navegador integrado permite testar viewports, screenshots, teclado e interações, mas não substitui validação em aparelhos físicos.
- Telas autenticadas exigem uma sessão válida. Sem credenciais do usuário, a Etapa 1 separa evidências renderizadas públicas de conclusões por leitura de código.
- Nenhuma skill adicional precisou ser instalada.

## Resultado da revisão

O Agente Revisor aprovou a seleção porque ela cobre descoberta, criação, implementação, acessibilidade e especificação sem depender de ferramentas indisponíveis. A Etapa 1 deve usar `design-ux` e `accessibility-compliance-accessibility-audit` como base da avaliação.
