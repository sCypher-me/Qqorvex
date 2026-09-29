# Qqorvex design tokens — v1.0

This is the implementation source of truth for the Casa-Observatório design. The delivered design package (`designq.zip`) and its `Design-System-Handoff.md`/`UI-Components.md` were audited against the running app. The palette below follows the user-provided final brief where it supersedes earlier notes. Token implementation lives in `packages/design-system/src/tokens/tokens.css`; the typed palette and type scale are in `colors.ts` and `typography.ts`.

## Foundations

| Role | Token / value |
| --- | --- |
| Canvas | Ink 950 `#090B0E` |
| Workspace | Ink 900 `#101318` |
| Panel | Graphite 800 `#171B21` |
| Card / raised surface | Graphite 700 `#1E232B` |
| Selected surface / border | Graphite 600 `#2A3039` |
| Text primary | Cream 100 `#F1F3F5` |
| Text secondary | Cream 200 `#D9DDE1` |
| Text muted | Ash `#A5ABB4` |
| Text disabled | Ash deep `#707780` |
| Cyan / cyan bright / cyan dim | `#43B9D2` / `#72D8EB` / `#246C7B` |
| Gold / gold bright / gold dim | `#B88A54` / `#D2A66F` / `#73583B` |
| Success / danger / warning / critical | `#32C48D` / `#F05D6C` / `#E7A84B` / `#D94155` |

Category accents are a closed palette for metadata only: amber `#C98C45`, blue `#5E86C8`, green `#6FAF91`, magenta `#A56D98`, coral `#C7786E`, lavender `#8A7FB5`, teal `#4E9A9A`, cyan `#43B9D2`, bronze `#9A7652`, and blue-gray `#687A91`. Do not introduce one-off colors. Status and action meaning always uses semantic tokens rather than category colors.

## Semantic and component layers

Use the three-layer model: palette primitives (`--qv-primitive-*`), meaning (`--qv-surface-*`, `--qv-content-*`, `--qv-feedback-*`, `--qv-action-*`, `--qv-border-*`), then component contracts (`--qv-radius-*`, `--qv-control-height-*`, `--qv-motion-*`, `--qv-overlay-*`). Tailwind aliases remain available for gradual migration; new feature code should use the semantic aliases or shared `qv-*` components, not raw palette values.

The base is dark-only, matte and low-noise. Cards use a 14px radius and no decorative shadow; controls use 12px; dialogs use 18px; Vex surfaces use 20px; pills are fully rounded. Accent color communicates active state, action, or status. Avoid ambient grids, persistent glow, gratuitous gradients, and ornamental borders. Gradients are reserved for data visualization, image legibility, or a purposeful progress treatment.

## Typography

- Space Grotesk: display and page headings.
- Manrope: interface and reading text; 15px body, 13px supporting text, 12px labels, 11px captions.
- JetBrains Mono: compact technical values and metrics, not general prose.

Fonts are self-hosted in `packages/design-system/src/fonts/faces.css`. The typed scale is in `packages/design-system/src/tokens/typography.ts`.

## Shared component vocabulary

Shared primitives are exported by `@qqorvex/ui`: `Card`, `Button`, `Badge`, `FormField`, `Modal`, `Sidebar`, `Chip`, keyboard-operable `ChipTabs`, progress components, `Notice`, accessible `IconButton`, and the abstract `CrystalCore`. The styling contracts in `tokens.css` include `.qv-card`, `.qv-column`, `.qv-tile`, `.qv-well`, `.qv-popover`, `.qv-dialog`, `.qv-dropzone`, `.qv-field`, `.qv-btn-*`, `.qv-chip`, `.qv-pill`, `.qv-progress`, and text utilities.

Use visible focus indicators, a 44px target on primary touch controls, reduced-motion support, and semantic feedback colors. See [components](components.md), [states](states.md), and [overlays](overlays.md) for the behavioral contract.

## Brand presence

The official diamond/compass mark and wordmark remain shared brand assets. The character artwork for Vex is shown only inside the Vex conversation experience; elsewhere, use the abstract geometric `CrystalCore`. Auth screens use a restrained static orbital motif rather than a character cutout. The Vex context contract is documented in [Vex behavior](../vex-behavior.md).

## Source files

- Tokens and Tailwind aliases: `packages/design-system/src/tokens/tokens.css`
- Typed color palette: `packages/design-system/src/tokens/colors.ts`
- Typography scale: `packages/design-system/src/tokens/typography.ts`
- React primitives: `packages/ui/src/components/`
