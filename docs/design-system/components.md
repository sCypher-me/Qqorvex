# Componentes compartilhados

Componentes públicos estão em `packages/ui/src/components/` e são exportados por `@qqorvex/ui`. Usar os primitivos existentes mantém affordances, foco e aparência consistentes sem acoplar módulos à implementação interna.

| Componente | Contrato de uso |
| --- | --- |
| `Card` | `default`, `vex` ou `milestone`; variantes são foscas e a ênfase usa borda/tinta sem glow. |
| `Button` | Primário, secundário, quiet, ghost, Vex, premium e destrutivo; estados disabled/busy devem permanecer explícitos. |
| `IconButton` | Obrigatoriamente recebe `label` persistente; usar para controle apenas com ícone. |
| `Badge` | Rótulo curto com tom semântico ou de marco, nunca cor ad hoc. |
| `FormField` | Campo associado ao rótulo e mensagem; erro também usa `aria-invalid`/`aria-describedby`. |
| `Modal` / `ConfirmDialog` | `<dialog>` nativo modal; Escape/cancelar, backdrop, foco inicial e retorno ao disparador. Em telas estreitas torna-se folha inferior. |
| `Chip` / `ChipTabs` | Filtro selecionável e conjunto de abas; `ChipTabs` oferece setas, Home/End e roving tabindex. |
| `Notice` | Aviso de erro, warning, sucesso ou informação com região anunciada e texto acionável. |
| `ProgressBar` / `ProgressRing` | Valor limitado a 0–100 e exposto como progresso; cyan/gold/status carregam significado. |
| `Sidebar` | Navegação agrupada, estado atual perceptível por borda e texto, rodapé de conta. |
| `CrystalCore` | Presença abstrata da Vex para navegação e autenticação; não substitui o avatar no chat. |

## Regras visuais e de acessibilidade

- Usar tokens semânticos e as classes `qv-*`; não inserir valores hex/RGB em features.
- Manter superfícies escuras, foscas e separadas por borda. Não acrescentar glows persistentes, grades ambientais ou sombras decorativas.
- Manter foco `:focus-visible` com contraste claro; não remover outline sem um substituto visível.
- Ações primárias e navegação por toque têm alvo mínimo de 44px; rótulos de controles só com ícone são permanentes via `aria-label`.
- Respeitar `prefers-reduced-motion`; animação não pode ser necessária para entender estado ou resultado.
- Mensagens de erro informam o que falhou e o que fazer; vazios explicam como começar.
