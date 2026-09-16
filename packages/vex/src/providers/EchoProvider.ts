import type { ChatMessage, ToolDefinition, VexProvider, VexProviderResponse } from "../types";

/**
 * Provider de fallback gratuito e 100% local: interpreta comandos por padrão de texto em
 * pt-BR em vez de um modelo de linguagem real. Existe para (1) a Vex funcionar com custo R$0
 * e sem depender de infraestrutura externa mesmo antes de um provider de IA estar configurado,
 * e (2) servir de base testável e determinística para o Tool Engine e o fluxo de confirmação.
 * Trocar para Ollama ou outro provider não muda nada fora de `providers/` — só a implementação
 * de `VexProvider.chat()`.
 */
export class EchoProvider implements VexProvider {
  readonly name = "echo";

  async chat({ messages, tools }: { messages: ChatMessage[]; tools: ToolDefinition[] }): Promise<VexProviderResponse> {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) {
      return { kind: "message", content: "Não recebi nenhuma mensagem." };
    }

    if (lastMessage.role === "tool") {
      return { kind: "message", content: lastMessage.content };
    }

    const text = lastMessage.content.trim();
    const toolNames = new Set(tools.map((t) => t.name));
    const has = (name: string) => toolNames.has(name);

    // Tarefas
    const createTaskMatch = text.match(/^(?:criar|adicionar|nova) tarefa[: ]+(.+)$/i);
    if (createTaskMatch && has("create_task")) {
      return { kind: "tool_call", toolCall: { name: "create_task", arguments: { title: createTaskMatch[1]!.trim() } } };
    }
    const completeTaskMatch =
      text.match(/^(?:concluir|finalizar) tarefa[: ]+(.+)$/i) ?? text.match(/^marcar (.+) como conclu[ií]da$/i);
    if (completeTaskMatch && has("complete_task_by_title")) {
      return {
        kind: "tool_call",
        toolCall: { name: "complete_task_by_title", arguments: { title: completeTaskMatch[1]!.trim() } },
      };
    }
    if (/^(listar tarefas|minhas tarefas|quais? tarefas)/i.test(text) && has("list_tasks")) {
      return { kind: "tool_call", toolCall: { name: "list_tasks", arguments: {} } };
    }

    // Agenda
    const createEventMatch = text.match(/^(?:criar|marcar) evento[: ]+(.+?) às (\d{1,2}:\d{2})$/i);
    if (createEventMatch && has("create_event_today")) {
      return {
        kind: "tool_call",
        toolCall: { name: "create_event_today", arguments: { title: createEventMatch[1]!.trim(), time: createEventMatch[2] } },
      };
    }
    if (/^(eventos de hoje|minha agenda( de)? hoje|o que tenho hoje)/i.test(text) && has("list_events_today")) {
      return { kind: "tool_call", toolCall: { name: "list_events_today", arguments: {} } };
    }

    // Metas & Hábitos
    const createGoalMatch = text.match(/^(?:criar|nova) meta[: ]+(.+)$/i);
    if (createGoalMatch && has("create_goal")) {
      return { kind: "tool_call", toolCall: { name: "create_goal", arguments: { title: createGoalMatch[1]!.trim() } } };
    }
    if (/^minhas metas/i.test(text) && has("list_goals")) {
      return { kind: "tool_call", toolCall: { name: "list_goals", arguments: {} } };
    }
    const logHabitMatch =
      text.match(/^registrar h[aá]bito[: ]+(.+)$/i) ?? text.match(/^conclu[ií] h[aá]bito[: ]+(.+)$/i);
    if (logHabitMatch && has("log_habit_by_name")) {
      return { kind: "tool_call", toolCall: { name: "log_habit_by_name", arguments: { name: logHabitMatch[1]!.trim() } } };
    }

    // Estudos
    const createNotebookMatch = text.match(/^(?:criar|novo) caderno[: ]+(.+)$/i);
    if (createNotebookMatch && has("create_notebook")) {
      return {
        kind: "tool_call",
        toolCall: { name: "create_notebook", arguments: { name: createNotebookMatch[1]!.trim() } },
      };
    }
    if (/^meus cadernos/i.test(text) && has("list_notebooks")) {
      return { kind: "tool_call", toolCall: { name: "list_notebooks", arguments: {} } };
    }
    if (/^flashcards? (para revisar|pendentes)/i.test(text) && has("list_due_flashcards")) {
      return { kind: "tool_call", toolCall: { name: "list_due_flashcards", arguments: {} } };
    }

    // Segundo Cérebro
    const createPageMatch = text.match(/^(?:criar|nova) (?:p[aá]gina|nota)[: ]+(.+)$/i);
    if (createPageMatch && has("create_page")) {
      return { kind: "tool_call", toolCall: { name: "create_page", arguments: { title: createPageMatch[1]!.trim() } } };
    }
    if (/^(minhas p[aá]ginas|minhas notas)/i.test(text) && has("list_pages")) {
      return { kind: "tool_call", toolCall: { name: "list_pages", arguments: {} } };
    }

    // Biblioteca
    const addLibraryMatch = text.match(/^(?:adicionar|adiciona)(?: à| na)? biblioteca[: ]+(.+)$/i);
    if (addLibraryMatch && has("add_library_item")) {
      return { kind: "tool_call", toolCall: { name: "add_library_item", arguments: { title: addLibraryMatch[1]!.trim() } } };
    }
    if (/^minha biblioteca/i.test(text) && has("list_library_items")) {
      return { kind: "tool_call", toolCall: { name: "list_library_items", arguments: {} } };
    }

    // Documentos
    if (/^(meus documentos|meus arquivos)/i.test(text) && has("list_documents")) {
      return { kind: "tool_call", toolCall: { name: "list_documents", arguments: {} } };
    }

    // Finanças
    if (/^(meu saldo|resumo financeiro|como est[aá]o minhas finan[çc]as)/i.test(text) && has("get_financial_summary")) {
      return { kind: "tool_call", toolCall: { name: "get_financial_summary", arguments: {} } };
    }
    const createExpenseMatch = text.match(/^(?:criar|registrar) (?:sa[ií]da|gasto)[: ]+(.+?) (?:de |no valor de )?r?\$?\s*([\d.,]+)$/i);
    if (createExpenseMatch && has("create_transaction")) {
      return {
        kind: "tool_call",
        toolCall: {
          name: "create_transaction",
          arguments: {
            name: createExpenseMatch[1]!.trim(),
            amount: Number(createExpenseMatch[2]!.replace(".", "").replace(",", ".")),
            transactionType: "saida",
          },
        },
      };
    }

    return {
      kind: "message",
      content:
        "Ainda não tenho um modelo de IA conectado — por enquanto entendo só comandos diretos, como " +
        '"criar tarefa ...", "minhas tarefas", "concluir tarefa ...", "criar evento ... às HH:MM", ' +
        '"eventos de hoje", "criar meta ...", "minhas metas", "registrar hábito ...", "criar caderno ...", ' +
        '"meus cadernos", "flashcards para revisar", "criar página ...", "minhas páginas", ' +
        '"adicionar biblioteca ...", "minha biblioteca", "meus documentos", "meu saldo" e ' +
        '"criar saída ... R$ ...". ' +
        "Configure um provider real (ex.: Ollama) para conversas livres.",
    };
  }
}
