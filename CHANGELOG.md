# Changelog do Qqorvex

Todas as mudanças importantes do app ficam registradas aqui. Os APKs beta são identificados com
`android-beta-<data>-v<versão>` e publicados como prereleases no GitHub.

## [Não lançado]

### Adicionado

- App web atualiza sem cair: depois de um deploy, a aba aberta troca para a versão nova na próxima
  mudança de tela (conferindo `/version.json`) e telas que perderam o código antigo recarregam
  sozinhas em vez de mostrar erro.
- APK baixa a atualização em segundo plano no Wi-Fi e instala quando o app vai para segundo plano,
  sem tela de confirmação quando o Android permite. Ao voltar, o app avisa que foi atualizado.
- Personalidades da Vex com jeitos realmente distintos (Direta e acolhedora, Calorosa e conversadora,
  Mentora estratégica), cada uma com voz, tamanho de resposta e estrutura próprios e as mesmas
  capacidades e confirmações.
- Exemplo de resposta de cada personalidade no onboarding e em Configurações → Aparência.
- A Vex troca a própria personalidade quando a pessoa pede, depois da confirmação.
- Plano do dia no Hoje: encaixa as tarefas atrasadas, de hoje e em andamento entre os compromissos,
  dentro do horário disponível (08:00–21:00 por padrão, ajustável no painel), com 20% do tempo
  reservado para pausas e imprevistos. Tarefas sem duração usam a mediana das suas estimativas e
  podem ser ajustadas ali mesmo; tarefas longas são divididas entre os intervalos.
- Quando o dia não fecha, o Hoje mostra quanto falta e sugere passar prazos para amanhã: nada muda
  até o botão, dá para desmarcar itens e desfazer depois.
- Plano único da Vex: pedidos com várias ações (criar tarefa, marcar compromisso, pôr na lista…)
  aparecem juntos numa lista; você desmarca o que não quiser e confirma o resto com um botão. Se
  algo falhar, o recibo mostra o que foi feito e a Vex oferece tentar de novo só o que falhou.
- Memória da Vex com consentimento: ela só guarda o que você pede ("lembre que…") e confirma; tudo
  aparece em Configurações → Aparência → Memória da Vex para editar ou apagar.
- Pesquisas salvas pela Vex trazem as fontes com link e referências no texto.
- Captura rápida em linguagem natural no Hoje e no botão "+": escreva "Dentista sexta às 15h",
  "Gastei 40 no mercado", "Ideia: app de receitas" ou "Leite na lista" e o app mostra o tipo e o
  destino (Agenda, Finanças, Notas, Pessoal, Tarefas) antes de salvar. Dá para trocar o tipo com um
  toque, e nada é salvo antes do botão.
- Reorganização do dia no Hoje: quando o dia não fecha ou há conflito na agenda, o painel propõe
  mudar de horário os blocos que você marcou para si (foco; estudos e pessoal sem local nem link),
  mover para amanhã o que libera tempo e só então passar prazos para amanhã. Reuniões nunca são
  movidas; conflito entre elas aparece como aviso. Tudo numa lista só, com um botão "Aplicar" e
  desfazer.
- Convite opcional para fechar o dia na última hora do horário disponível, sem mover nada sozinho.
- A Vex recebe o mesmo plano em `get_day_overview` e pode propor ajustar a duração de uma tarefa.
- Seção "Quem vê o seu perfil" em Configurações → Perfil, dizendo exatamente o que sai da conta.
- Opção em Conexões para mostrar ou não o @usuário do Qqorvex no Discord (desligada por padrão).
- Hábitos mostram quantas vezes já foram feitos (consistência acumulada), no lugar de sequências de
  dias seguidos que zeravam; o destaque de Metas & Hábitos passa a ser o hábito mais constante.
- Desafios do dia sugeridos pelo que você usa no app e trocáveis por outro do mesmo nível (desafio
  concluído não troca); uma mesma ação avança todos os desafios que combinam com ela. A Vex também
  lista e troca desafios, com confirmação.
- Central do Dono registra e mostra o histórico de insígnias e títulos concedidos manualmente.
- Avisos push do plano do dia: só quando há conflito real na agenda (dois compromissos se
  sobrepondo) ou uma tarefa atrasada ou de hoje que não cabe mais no horário disponível. Um aviso por
  problema, nunca fora do horário disponível, com opção de desligar em Notificações. Tocar no aviso
  abre a Agenda ou o plano do dia.
- Estimativa de duração das tarefas sem duração salva: pelo que está escrito ("30min", "1h30"), por
  tarefas parecidas que você já estimou ou pelo tipo de tarefa. Quando não há pista, o plano pergunta
  "Quanto tempo leva?". A captura rápida entende a duração ("revisar contrato 45min") sem confundir
  com horário ("às 14h").

### Corrigido

- O plano do dia dava prioridade a tarefas em andamento com prazo distante e deixava de fora as que
  vencem hoje; agora o que vence hoje (ou está atrasado) entra primeiro, no app e nos avisos push.
- O @usuário do Qqorvex não é mais publicado no perfil do Discord sem consentimento; conexões
  existentes param de publicá-lo na próxima sincronização.
- Foto de perfil passa a ficar em armazenamento privado, exibida por links temporários; se a imagem
  falhar, aparece a inicial em vez do ícone quebrado.
- O texto do Perfil não promete mais "áreas compartilhadas" que não existem.
- Ao voltar de suspensão ou do segundo plano, o app renova a sessão antes de recarregar os dados,
  em vez de disparar dezenas de consultas com o token vencido (401) por até dois minutos.
- Lembretes push, sincronização do Google Agenda e cargos do Discord não perdem mais a rodada quando o
  Supabase recusa a primeira leitura de `app_secrets`; a leitura tenta de novo e falhas de
  infraestrutura respondem 503 em vez de 401.
- QA visual (`tools/visual-qa/capture.mjs`) funciona no Windows.
- Dados simulados do QA visual têm os valores padrão das tarefas; antes o Hoje e as Tarefas apareciam vazios.

## [0.3.0] — 2026-10-06

### Adicionado

- Atualização do APK dentro do app: verifica novas versões beta, baixa a arquitetura correta e
  confere o SHA-256 antes de abrir o instalador do Android.

### Corrigido

- Navegar entre telas não reinicia a verificação dos Termos durante a renovação da sessão.
- A barra superior no Android respeita a área segura da barra de status.
- A tela de investimentos identifica quais grupos de cotações a BrAPI negou e normaliza a chave
  configurada antes da consulta.

### Atualizado

- Versão do app Android/Desktop atualizada para 0.3.0.
- O site passa a oferecer o APK 0.3.0, primeiro beta com atualizações recebidas dentro do app.
- Após instalar esta versão inicial, as próximas atualizações podem ser baixadas pelo próprio app;
  o Android ainda pede autorização da fonte e confirmação da instalação.

## [0.2.1] — 2026-10-06

### Corrigido

- Confirmação de e-mail no navegador e no Android direciona automaticamente o cadastro por e-mail
  ao onboarding.
- Cadastros novos com Google, Discord e GitHub criam uma senha do Qqorvex antes do onboarding;
  convites mantêm o fluxo próprio de criar senha e depois configurar a conta.
- Contas de e-mail com identidade social vinculada não recebem uma solicitação redundante de senha.
- Ferramentas da Vex removem campos incompatíveis com o schema do Gemini, evitando erro 502 e o
  fallback antes da resposta do modelo.

### Atualizado

- Versão do app Android/Desktop atualizada para 0.2.1.
- Links de convite e confirmação de e-mail abrem o app Android quando instalado.
- Ícone adaptativo Android ajustado com mais margem ao redor da marca.

## [0.2.0] — 2026-10-06

### Adicionado

- Termos de Uso com identificação do responsável, link público, aceite obrigatório no cadastro por
  e-mail, OAuth e convite, e registro versionado do aceite no Supabase.
- Cargos vinculados ao Discord para Beta Tester, Plus, Lifetime e Parceiro, sincronizados com os
  benefícios atuais da conta.
- Testes do recibo temporário usado para retomar o aceite depois do cadastro OAuth.
- Smoke tests sem autenticação para as novas Edge Functions do Discord.

### Atualizado

- README refeito como apresentação do projeto, com visão do app, instruções, segurança e política
  de versões.
- Versão do app Android/Desktop atualizada para 0.2.0.
- APK beta ajustado para exigir Android 14 (API 34) ou superior.
- Auditorias do release estendidas para cobrir o callback e a sincronização de cargos do Discord.

## [0.1.6] — 2026-10-06

### Adicionado

- Carta de boas-vindas quando uma conta resgata um código Lifetime.
- Recuperação das cotações de ações, FIIs e criptomoedas na tela de investimentos.

## Política de versões

- Uma atualização pequena avança a versão menor: `1.0.0` → `1.1.0`.
- Uma nova geração do produto avança a versão principal: `1.1.0` → `2.0.0`.
- Correções pontuais avançam o último número: `1.1.0` → `1.1.1`.
