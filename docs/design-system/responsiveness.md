# Breakpoints e layout responsivo

O Tailwind v4 recebe os aliases `desktop` e `wide` por `tokens.css`. A escala padrão continua disponível para ajustes locais (`sm`, `md`, `lg`, `xl`, `2xl`).

| Faixa | Comportamento do produto |
| --- | --- |
| Abaixo de 75rem (1200px) | Sidebar recolhida; header e conteúdo ocupam a largura; navegação fixa de cinco destinos no rodapé; “Módulos” abre uma folha inferior. Auth usa uma coluna. |
| 75rem–99.99rem | Sidebar persistente; conteúdo recebe padding desktop; shell não mostra a barra mobile. Auth ganha coluna de marca e coluna de formulário. |
| A partir de 100rem (1600px) | Espaçamento e título da coluna editorial aumentam; largura de conteúdo continua limitada para preservar leitura. |

Conteúdo principal usa `min-width: 0` e largura máxima de 1520px. O viewport inclui `viewport-fit=cover`; a navegação e a folha inferior respeitam `safe-area-inset-bottom`. A barra mobile reserva espaço de conteúdo e não cobre ações do fim da página.

Ao adicionar um módulo, testar pelo menos um viewport estreito (320–390px), tablet (768px), a transição imediatamente antes/depois de 1200px e desktop amplo (1600px+). Confirmar ausência de overflow horizontal, ordem de foco natural, navegação persistente e alvos tocáveis.
