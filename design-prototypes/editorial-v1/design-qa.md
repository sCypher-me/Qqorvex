# QA visual — proposta 1 (Mesa editorial)

final result: passed

## Escopo

Protótipo isolado para validar a nova direção de design antes da aplicação ao app real. Telas: Hoje, Tarefas, painel retrátil da Vex e Vex em tela cheia; temas escuro e claro; desktop e mobile. Dados de agenda, tarefas e conversa são ilustrativos.

## Referência e comparação

Referência selecionada: `C:\Users\Julio\.codex\generated_images\01a0c9c9-a878-7823-b98d-2f66ffd9f57c\exec-d187b293-b402-4c19-a85c-f07200c5b1d3.png`.

Comparação visual conjunta realizada em 1487 × 1058 com `screenshots/hoje-desktop-dark.png`. Foram mantidos a estrutura de três zonas, a hierarquia editorial, o acento coral, a navegação lateral estável, o acionador independente da Vex e o banner de paisagem discreto. Texto e dados foram adaptados para que o protótipo permita interações; ícones e detalhes tipográficos não são cópia pixel a pixel da imagem conceitual.

## Capturas

- `screenshots/hoje-desktop-dark.png`
- `screenshots/hoje-desktop-light.png`
- `screenshots/hoje-mobile-dark.png`
- `screenshots/hoje-mobile-light.png`
- `screenshots/tarefas-desktop-dark.png`
- `screenshots/tarefas-desktop-interacao.png`
- `screenshots/tarefas-mobile-dark.png`
- `screenshots/vex-panel-desktop-dark.png`
- `screenshots/vex-tela-desktop-dark.png`
- `screenshots/vex-tela-mobile-dark.png`

## Validação

- Build de produção do protótipo concluído sem erros.
- Navegação, criação de tarefa ilustrativa, abertura da Vex e fechamento com Esc, nova conversa e alternância de tema testados no Edge automatizado.
- Nenhum erro JavaScript capturado nas rotas testadas.
- Sem rolagem horizontal em Hoje, Tarefas e Vex a 1487 px e 390 px.
- A ordem no Hoje mobile foi ajustada para apresentar agenda antes das seções secundárias.

## Limites desta etapa

O protótipo não usa a conta do usuário, Supabase ou o modelo de IA. Links para áreas ainda não prototipadas abrem o app atual. Esses fluxos precisam ser adaptados progressivamente após a aprovação visual desta direção, sem substituir os dados ou a implementação existente durante esta validação.
