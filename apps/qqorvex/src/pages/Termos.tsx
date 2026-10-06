import { Link } from "react-router-dom";

const sections = [
  {
    title: "1. Quem presta o serviço e como falar conosco",
    paragraphs: [
      "O Qqorvex é um aplicativo de organização pessoal e produtividade mantido por Julio Cesar Santos Silva, pessoa física (CPF 037.703.561-01), responsável também pelo tratamento de dados pessoais descrito neste documento.",
      "Endereço informado do responsável: Rua A2, Q. 03, Lt. 1/21, Vila Alpes, Goiânia, GO, CEP 74310-030. Para suporte, dúvidas, exercício de direitos ou reclamações, escreva para contato@biocypher.tech. Ao entrar em contato, informe apenas os dados necessários para localizar sua conta; não envie senha, código de autenticação ou dados de pagamento completos.",
    ],
  },
  {
    title: "2. Aceitação, versão e alterações",
    paragraphs: [
      "Ao marcar a caixa de aceitação no cadastro, concluir um convite com essa aceitação ou aceitar a tela de consentimento apresentada antes do primeiro acesso, você confirma que leu estes Termos de Uso e o tratamento de dados aqui explicado. A versão aceita e a data são registradas para fins de comprovação.",
      "A versão atual é 2026-10-06-v1, publicada em 6 de outubro de 2026. Quando uma mudança afetar direitos, funcionalidades relevantes, privacidade ou preço, informaremos a nova versão e, quando a lei ou a natureza da mudança exigir, pediremos nova aceitação antes de continuar usando a parte afetada. Alterações não eliminam direitos já adquiridos nem afastam normas obrigatórias.",
    ],
  },
  {
    title: "3. O que é o Qqorvex",
    paragraphs: [
      "O Qqorvex reúne ferramentas digitais para planejar e organizar atividades pessoais. Conforme a disponibilidade de cada versão, podem existir tarefas, agenda, metas, hábitos, check-in, estudos, cadernos, resumos, cartões de memória, avaliações, notas, biblioteca, documentos, vida pessoal, finanças, acompanhamento informativo de investimentos, conquistas e a assistente de inteligência artificial Vex.",
      "Alguns recursos podem estar em teste, em beta, sujeitos a limites de uso, indisponíveis temporariamente ou ainda não habilitados para todas as contas e plataformas. A descrição da tela e da oferta exibida antes do uso ou da compra complementa estes Termos. Recursos experimentais podem mudar, mas trataremos dados e direitos conforme este documento e a legislação aplicável.",
    ],
  },
  {
    title: "4. Cadastro, idade e segurança da conta",
    paragraphs: [
      "Você deve fornecer informações corretas, manter seu e-mail atualizado e proteger sua senha, códigos de acesso, passkeys e dispositivos. Atividades realizadas com sua conta serão atribuídas a ela até que você nos avise sobre uso não autorizado. Entre em contato imediatamente se suspeitar de invasão.",
      "O Qqorvex não é destinado a crianças. Pessoas menores de 18 anos somente devem usar o serviço com autorização, orientação e supervisão de pai, mãe ou responsável legal, que deverá ler estes Termos e responder pelo uso nos limites da lei. Não forneça dados de crianças sem autorização legal e necessidade clara.",
      "Podemos pedir confirmação adicional de identidade em operações sensíveis, aplicar controles contra fraude e limitar temporariamente tentativas suspeitas. Autenticação em duas etapas, PIN do Cofre e passkeys são recursos opcionais de segurança; sua disponibilidade depende do dispositivo e da configuração da conta.",
    ],
  },
  {
    title: "5. Uso permitido e condutas proibidas",
    paragraphs: [
      "Use o Qqorvex de forma lícita, respeitosa e de acordo com estes Termos. Você não pode: violar direitos de terceiros; enviar conteúdo ilegal, fraudulento, abusivo ou que explore crianças; praticar assédio, ameaça, discriminação ou fraude; tentar acessar contas, dados, sistemas ou APIs sem autorização; contornar limites, controles de segurança ou cobrança; introduzir malware; automatizar acessos que prejudiquem o serviço; ou usar o serviço para infringir leis ou ordens legítimas.",
      "Você é responsável por ter autorização para inserir informações de outras pessoas e por informar essas pessoas quando a lei exigir. Não use o Qqorvex como único local para guardar documentos cuja perda possa causar dano; mantenha cópias próprias dos arquivos importantes.",
    ],
  },
  {
    title: "6. Vex e inteligência artificial",
    paragraphs: [
      "A Vex é uma assistente automatizada que pode responder perguntas, organizar informações, pesquisar na web quando essa função estiver habilitada, ler arquivos enviados pelo usuário e preparar propostas para uso nos módulos do Qqorvex. Suas respostas são geradas por sistemas probabilísticos e podem conter erros, omissões, desatualização ou referências incorretas. Confira informações importantes em fontes confiáveis.",
      "A Vex não substitui profissionais de saúde, educação, direito, contabilidade ou finanças. Ela não diagnostica, não presta aconselhamento jurídico individual, não recomenda investimentos e não garante resultados. Em emergência, procure os serviços e profissionais adequados.",
      "Quando a Vex propuser criar, alterar, enviar ou apagar dados no app, a execução depende de uma confirmação explícita sua na interface. Leia a prévia antes de confirmar. Uma resposta em linguagem natural, por si só, não significa que uma ação foi executada; confira o recibo ou o registro do módulo.",
      "Ao pedir análise de uma mensagem, resumo ou arquivo, você autoriza o processamento do conteúdo necessário por provedores técnicos de IA e, quando solicitado, de pesquisa na web. O texto do pedido e os trechos do arquivo relevantes podem ser enviados a esses provedores para executar a tarefa. Não envie senhas, segredos, documentos de terceiros sem autorização ou dados sensíveis que não sejam necessários. Os provedores podem estar sujeitos a políticas próprias e processar dados fora do Brasil.",
    ],
  },
  {
    title: "7. Arquivos, textos e materiais enviados",
    paragraphs: [
      "Você mantém os direitos que possui sobre textos, documentos, imagens e outros materiais que cria ou envia. Você nos concede uma licença limitada, não exclusiva e válida apenas enquanto necessária para armazenar, exibir, proteger, converter, gerar cópias técnicas e executar as funções que você solicitar no Qqorvex, inclusive análise pela Vex quando você a acionar.",
      "Você declara que tem os direitos e autorizações necessários para enviar e processar o material. Não envie conteúdo que viole direitos autorais, confidencialidade, privacidade ou ordem legal. Limites de tamanho e armazenamento podem depender do plano e da infraestrutura disponível; a tela de envio mostra os limites aplicáveis. A exportação atual em JSON contém dados organizados, mas não inclui o conteúdo binário original dos arquivos armazenados.",
    ],
  },
  {
    title: "8. Finanças, cotações e investimentos",
    paragraphs: [
      "Os recursos financeiros servem para organização e acompanhamento pessoal. Cotações de ações, fundos imobiliários (FIIs) e criptoativos são informativas, podem ter atraso, lacunas, diferenças entre provedores ou falhas de atualização e podem não representar preço negociável. A origem indicada na tela, inclusive a BRAPI quando usada, pode aplicar seus próprios termos e limites.",
      "O Qqorvex não é corretora, banco, consultor de valores mobiliários ou prestador de recomendação de investimento. Não executamos ordens de compra ou venda por você e não prometemos retorno, liquidez ou preservação de capital. Decisões financeiras são suas; confirme dados e riscos diretamente com fontes e profissionais qualificados.",
    ],
  },
  {
    title: "9. Planos, recursos pagos e cobranças",
    paragraphs: [
      "No momento da publicação desta versão, o canal de cobrança recorrente do Qqorvex está desabilitado. Nenhum preço indicado em telas de preparação deve ser entendido como autorização para cobrança. Se uma oferta paga for ativada, antes de concluir a contratação serão mostrados o preço total, moeda, periodicidade, duração, renovação, limites, forma de cancelamento e condições aplicáveis; não haverá cobrança sem ação de contratação válida.",
      "Quando houver assinatura, sua gestão, cancelamento, reembolso e direito de arrependimento seguirão a oferta contratada e a legislação, inclusive os direitos do consumidor que não podem ser afastados. O cancelamento impede cobranças futuras conforme a regra informada na contratação, sem apagar automaticamente os dados do usuário.",
      "Recursos gratuitos podem ter limites. Limites e preços podem mudar para novas contratações mediante informação prévia; mudanças em contrato vigente respeitarão a oferta aceita e a legislação. Se uma redução de acesso for necessária, os dados não serão apagados apenas por isso e poderão continuar disponíveis para leitura, organização ou exportação conforme a funcionalidade e a lei.",
    ],
  },
  {
    title: "10. Códigos Lifetime, Parceiro e benefícios",
    paragraphs: [
      "O acesso Lifetime é um benefício permanente concedido por código especial emitido pelo responsável, não uma assinatura à venda. Conforme a configuração documentada do Qqorvex, a conta que ativa Lifetime recebe também as insígnias Amigo Lifetime e Beta Tester. O acesso não é transferível, não pode ser convertido em dinheiro e abrange as cotas internas dos recursos incluídos no benefício, respeitados limites técnicos de arquivo e disponibilidade de serviços de terceiros.",
      "Códigos de parceiro e de beta podem ter escopo e prazo próprios, que serão informados na campanha. Um código é pessoal, de uso único e pode ser recusado ou revogado quando houver erro, fraude, uso não autorizado ou exigência legal, com análise do caso e preservação dos direitos aplicáveis. Não compartilhe códigos publicamente.",
    ],
  },
  {
    title: "11. Gamificação e conquistas",
    paragraphs: [
      "Níveis, selos, temas e desafios são elementos de motivação e personalização. Eles não representam dinheiro, participação societária, investimento, prêmio de valor garantido ou obrigação de manter uma sequência de uso. Não aplicamos perda de progresso como punição por deixar de usar o aplicativo. Conquistas podem ser ajustadas para corrigir erros, fraude ou mudanças na mecânica, preservando uma comunicação clara.",
    ],
  },
  {
    title: "12. Conteúdo de terceiros e integrações",
    paragraphs: [
      "Login social, hospedagem, banco de dados, armazenamento, processamento de IA, pesquisa e cotações podem depender de provedores externos, por exemplo Supabase, Cloudflare, Google, Discord, GitHub, provedores de IA configurados para a Vex e BRAPI. Cada provedor trata dados de acordo com seus próprios termos e políticas. O Qqorvex não controla falhas, alterações ou indisponibilidades próprias desses serviços, mas buscará oferecer alternativas razoáveis quando possível.",
      "Integrações adicionais, como pagamentos ou calendários, só serão usadas se forem habilitadas, conectadas por você e descritas na tela correspondente. A desconexão de uma integração pode interromper sua função sem apagar necessariamente os dados que você já criou no Qqorvex.",
    ],
  },
  {
    title: "13. Dados pessoais, finalidades e direitos",
    paragraphs: [
      "Para prestar o serviço podemos tratar: dados de conta e autenticação (nome, nome de usuário, e-mail, telefone opcional e identificadores de provedor); perfil e preferências; conteúdos criados por você, inclusive tarefas, agenda, finanças, estudos, documentos e conversas com a Vex; dados de plano, cotas, códigos e conquistas; e informações técnicas de segurança, sessão, dispositivo e acesso necessárias para autenticar, prevenir abuso, depurar falhas e proteger a conta. Alguns conteúdos podem revelar informações sensíveis se você optar por inseri-las; evite fazê-lo sem necessidade.",
      "Usamos esses dados para criar e manter sua conta, sincronizar e exibir conteúdo, recuperar acesso, executar pedidos feitos à Vex, atender suporte, administrar limites e benefícios, proteger o serviço, cumprir obrigações legais e responder a solicitações. Não vendemos seus dados pessoais. O compartilhamento limita-se ao necessário com fornecedores que hospedam ou processam as funções solicitadas, autoridades quando houver dever legal e pessoas por você autorizadas.",
      "A infraestrutura principal usa Supabase para autenticação, banco e armazenamento, e Cloudflare para entrega do site. Solicitações à Vex e arquivos enviados para análise podem ser encaminhados ao provedor de IA configurado; buscas podem envolver o provedor de pesquisa configurado. A autenticação social transmite os dados necessários ao provedor que você escolheu. Cotações podem consultar a BRAPI. Esses serviços podem envolver tratamento ou transferência internacional de dados conforme sua infraestrutura, contratos e políticas. A lista de provedores pode mudar; mudanças relevantes serão comunicadas.",
      "Mantemos informações pelo tempo necessário para a finalidade, a segurança da conta e obrigações legais. Se você pedir exclusão, removeremos ou anonimizaremos os dados que pudermos, ressalvada retenção obrigatória, prevenção de fraude, defesa de direitos e cópias técnicas temporárias que sejam eliminadas conforme seus ciclos de retenção. Backups e registros de segurança podem levar algum tempo para expirar.",
      "Nos termos da Lei Geral de Proteção de Dados, você pode pedir confirmação e acesso, correção, informação sobre uso e compartilhamento, portabilidade quando aplicável, anonimização, bloqueio ou eliminação quando cabível, revisão de decisões automatizadas, revogação de consentimento e oposição nos casos previstos em lei. Para exercer direitos, escreva para contato@biocypher.tech a partir do e-mail da conta ou forneça elementos suficientes para confirmar sua identidade. A exportação em JSON pode ser iniciada em Configurações → Seus dados; o pedido de exclusão é feito pelo canal indicado nessa tela ou pelo e-mail acima. Não envie documentos de identidade completos sem que sejam necessários para validar o pedido.",
      "A base legal de cada operação depende da finalidade e poderá incluir execução do contrato, procedimentos preliminares, cumprimento de obrigação legal, exercício regular de direitos, legítimo interesse com avaliação de direitos e, quando aplicável, consentimento. Se o tratamento depender de consentimento, você poderá revogá-lo sem afetar operações anteriores legítimas.",
    ],
  },
  {
    title: "14. Segurança e incidentes",
    paragraphs: [
      "Adotamos controles técnicos e organizacionais compatíveis com a natureza do serviço, que podem incluir autenticação, políticas de acesso, criptografia em trânsito oferecida pela infraestrutura, registros de segurança e proteção por sessão. Nenhum sistema conectado à internet é absolutamente invulnerável. Avise-nos rapidamente sobre incidentes ou acessos que não reconheça. Se um incidente puder causar risco ou dano relevante, adotaremos as providências e comunicações exigidas pela lei.",
    ],
  },
  {
    title: "15. Disponibilidade, manutenção e cópias",
    paragraphs: [
      "Buscamos manter o serviço disponível e proteger os dados, mas não garantimos operação ininterrupta, ausência de erros ou compatibilidade eterna com todos os aparelhos. Podemos fazer manutenção, corrigir vulnerabilidades, limitar tráfego abusivo e suspender temporariamente partes do serviço para proteger usuários ou cumprir a lei.",
      "Sincronização e mecanismos de recuperação reduzem riscos, mas não substituem uma cópia independente. Faça exportações periódicas e mantenha cópia dos documentos importantes em local seguro. Não use o Qqorvex como único repositório de prova, registro legal ou arquivo crítico.",
    ],
  },
  {
    title: "16. Propriedade intelectual",
    paragraphs: [
      "A marca Qqorvex, o software, a interface, os textos, os elementos gráficos e os materiais próprios pertencem ao responsável ou a seus licenciantes. Estes Termos concedem uma permissão pessoal, limitada, revogável nos casos legais e não exclusiva para usar o serviço conforme sua finalidade. Você não pode copiar, revender, descompilar, explorar comercialmente ou remover avisos de propriedade, exceto quando a lei permitir.",
    ],
  },
  {
    title: "17. Suspensão e encerramento",
    paragraphs: [
      "Você pode parar de usar o serviço e solicitar o encerramento da conta. Podemos restringir ou suspender uma conta diante de risco de segurança, fraude, violação material destes Termos, obrigação legal ou dano a terceiros. Quando razoavelmente possível, comunicaremos o motivo e permitiremos correção ou contestação. Restrições emergenciais podem ocorrer sem aviso prévio para conter dano, com revisão posterior. O encerramento não elimina direitos do consumidor, pedidos de dados ou obrigações legais de retenção.",
    ],
  },
  {
    title: "18. Responsabilidade e direitos do consumidor",
    paragraphs: [
      "Você decide como usar informações e resultados e deve manter cópias próprias de dados importantes. Até onde a lei permitir, não garantimos que respostas de IA, estimativas ou cotações sejam completas ou adequadas a uma decisão específica. Isso não exclui responsabilidade que a legislação atribua ao fornecedor nem restringe direitos obrigatórios do consumidor.",
      "Nada nestes Termos afasta garantias legais, direito de informação, atendimento, reparação de danos ou outros direitos previstos no Código de Defesa do Consumidor e nas demais normas aplicáveis. Se uma cláusula for inválida, as outras continuam válidas na medida permitida.",
    ],
  },
  {
    title: "19. Comunicações e mudanças no serviço",
    paragraphs: [
      "Podemos enviar mensagens necessárias à conta, segurança, suporte, alterações destes Termos ou funcionamento de um recurso para o e-mail cadastrado e dentro do aplicativo. Preferências de comunicação promocional, quando houver, poderão ser alteradas separadamente. Mantenha seus dados de contato atualizados.",
      "Podemos modificar, substituir ou encerrar uma função por razões técnicas, de segurança, legais ou de sustentabilidade. Quando a mudança for relevante, informaremos com antecedência razoável sempre que possível e não utilizaremos essa possibilidade para retirar direitos obrigatórios ou cobrar por serviço sem contratação válida.",
    ],
  },
  {
    title: "20. Legislação e solução de conflitos",
    paragraphs: [
      "Estes Termos são regidos pelas leis brasileiras. Vamos tentar resolver dúvidas e reclamações pelo canal contato@biocypher.tech. Fica preservado o direito de recorrer aos órgãos de defesa do consumidor e à Autoridade Nacional de Proteção de Dados, conforme o assunto, bem como ao foro competente previsto na legislação, inclusive o domicílio do consumidor quando aplicável.",
    ],
  },
];

export function TermosPage() {
  return (
    <main className="min-h-dvh bg-canvas px-4 py-8 text-fg sm:px-6 sm:py-12">
      <article className="mx-auto max-w-4xl">
        <header className="rounded-3xl border border-line bg-surface p-6 shadow-soft sm:p-10">
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.16em] text-gold-fg">Documento legal · Versão 2026-10-06-v1</p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Termos de Uso do Qqorvex</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-fg-3">Atualizado em 6 de outubro de 2026. Este documento explica as regras do serviço, os recursos da Vex, os benefícios de acesso e como tratamos os dados necessários para operar o aplicativo.</p>
          <p className="mt-4 rounded-xl border border-gold/20 bg-gold/5 p-4 text-sm leading-6 text-fg-2">
            Leia com atenção. A aceitação fica registrada com a versão e a data. Estes Termos não substituem a oferta exibida antes de uma compra nem os direitos previstos na legislação brasileira.
          </p>
          <nav aria-label="Navegação dos Termos" className="mt-6 grid gap-x-5 gap-y-2 border-t border-line pt-5 sm:grid-cols-2">
            {sections.map((section, index) => (
              <a key={section.title} href={`#termo-${index + 1}`} className="text-sm text-fg-3 underline decoration-line underline-offset-4 hover:text-gold-fg">
                {section.title}
              </a>
            ))}
          </nav>
        </header>

        <div className="mt-5 flex flex-col gap-4">
          {sections.map((section, index) => (
            <section id={`termo-${index + 1}`} key={section.title} className="scroll-mt-5 rounded-2xl border border-line bg-surface p-5 sm:p-7">
              <h2 className="m-0 font-display text-lg font-semibold text-fg sm:text-xl">{section.title}</h2>
              <div className="mt-3 flex flex-col gap-3">
                {section.paragraphs.map((paragraph) => <p key={paragraph} className="m-0 text-sm leading-7 text-fg-2">{paragraph}</p>)}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-5 text-sm text-fg-3">
          <span>Dúvidas ou solicitações: <a className="text-gold-fg underline underline-offset-4" href="mailto:contato@biocypher.tech">contato@biocypher.tech</a></span>
          <Link to="/criar-conta" className="font-medium text-gold-fg hover:underline">Voltar ao cadastro</Link>
        </footer>
      </article>
    </main>
  );
}
