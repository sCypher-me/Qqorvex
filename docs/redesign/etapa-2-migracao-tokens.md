# Etapa 2 — inventário e migração de tokens

O novo contrato vive em `DESIGN.md`. Nenhum token de produção é alterado nesta etapa. A migração será gradual no Ciclo 0, usando aliases temporários para impedir quebra simultânea dos módulos.

## Cor e superfície

| Token atual | Token novo | Estratégia de compatibilidade |
|---|---|---|
| `--color-vex-black`, `--color-background` | `night-deep` para chrome/Vex; `night-base` para workspace | não mapear globalmente; migrar shell primeiro e módulos por superfície |
| `--color-vex-obsidian`, `--color-surface-1` | `night-base` | alias direto temporário; autenticação e workspace permanecem dark |
| `--color-vex-graphite`, `--color-surface-2` | `night-raised` | substituir por função de cartão/campo/controle |
| `--color-vex-raised`, `--color-surface-3` | `night-overlay` | overlays e tool previews ganham token específico |
| `--color-vex-border`, `--color-border` | `border-subtle` ou `border-default` | classificar se a borda é decorativa ou limite essencial; controle usa default |
| `--color-text-primary` | `foreground-primary` | alias direto temporário; não existe inversão para tema claro |
| `--color-text-secondary`, `--color-text-secondary-warm` | `foreground-secondary` | consolidar duplicidade |
| `--color-text-muted`, `--color-warm-muted` | `foreground-muted` | manter contraste mínimo de texto normal |
| `--color-brand-cyan`, `--color-vex-cyan` | `info` somente quando semântico; marca migra para `brand-primary` | proibir alias cyan→marca; revisar uso por uso |
| `--color-cyan-muted`, `--color-vex-cyan-dark` | `info`/`border-inverse` | classificar por função antes de trocar |
| `--color-brand-gold`, `--color-vex-gold*` | `warning` quando estado; categorias fechadas quando dado | remover significado de marca; não converter dourado automaticamente |
| `--color-success` | `success` | alias direto temporário |
| `--color-warning` | `warning` | alias direto temporário |
| `--color-error`, `--color-critical` | `error` | consolidar; ação de marca continua separada |
| `--color-info` | `info` | alias direto temporário |
| `--color-*-bg`, `--color-*-border` | `*-surface` + estado/borda derivada | migrar notice e OperationStatus juntos |
| `--color-chip-neutral`, `--color-chip-cyan` | `surface-subtle`, `info-surface` | chip só quando a semântica justificar |
| `--color-category-*` | paleta fechada de categorias a definir no Ciclo 0 | manter valores até teste nos quatro degraus dark; semânticos não são categorias |

## Tipografia, forma, profundidade e movimento

| Token atual | Token novo | Estratégia de compatibilidade |
|---|---|---|
| `--font-display: Space Grotesk` | serif editorial; fallback efetivo `Georgia` | manter fonte antiga até WOFF2/licença da nova ser aprovados; preview usa fallback |
| `--font-sans: Manrope` | Manrope | preservar arquivos locais; registrar origem/licença antes de redistribuição externa |
| `--font-mono: JetBrains Mono` | JetBrains Mono | preservar somente para dados funcionais |
| `--radius-md` | `rounded.md` (10px) | alias temporário, depois substituir por componente |
| `--radius-card` | `rounded.lg` (14px) | alias temporário |
| `--radius-vex` | `rounded.xl` (20px) | restringir a overlay/painel, não marca genérica |
| `--shadow-card` | `elevation.raised` | reduzir atmosfera e intensidade |
| `--shadow-popover` | `elevation.overlay` | alias direto temporário |
| `--shadow-glow-cyan`, `--shadow-glow-gold` | sem equivalente | remover quando consumidores migrarem; não criar compatibilidade visual |
| `--ease-standard` | `motion.easing-standard` | alias direto |
| `--ease-enter`, `--ease-exit` | `motion.easing-standard`, `motion.easing-exit` | consolidar conforme direção |
| `--animate-vex-in`, `--animate-overlay-in`, `--animate-page-in` | 180/240ms com easing normativo | reimplementar preservando reduced motion |
| `--animate-core-glow` | sem equivalente | remover; progresso usa traço/nó com semântica |
| `--animate-skeleton-shimmer` | skeleton tonal; movimento reduzido | preservar apenas se discreto e cancelado em reduced motion |

## Sequência segura

1. Exportar tokens do `DESIGN.md` para novas variáveis `--q-*`, sem mudar aliases antigos.
2. Migrar componentes base e harness de estados; medir contraste e foco.
3. Migrar shell e auth por superfície, mantendo aliases nos módulos ainda escuros.
4. Migrar famílias de rotas por ciclo e registrar consumidores restantes com `rg`.
5. Remover aliases e glows somente no Ciclo 7, quando não houver consumidores.

Critério de rollback: cada ciclo pode reverter seus aliases sem alterar esquema de dados ou comportamento. Não executar troca global de hex ou busca/substituição de nomes sem classificação contextual.
