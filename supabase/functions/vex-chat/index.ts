// Edge Function que dá à Vex um cérebro hospedado de verdade — antes ela só falava com Ollama
// local (`http://localhost:11434`), então só funcionava no computador de quem estava
// desenvolvendo. Chamada pelo `GeminiProvider` (packages/vex/src/providers/GeminiProvider.ts) via
// `supabase.functions.invoke`, mesmo padrão CORS/preflight de `create-zoom-meeting`. A chave do
// Gemini fica em `app_secrets` (mesmo padrão das credenciais do Zoom/VAPID), nunca no bundle do
// navegador — é por isso que essa chamada não pode ser feita direto do cliente.
//
// Usa o endpoint "legacy" `generateContent` (não o novo "Interactions API" lançado em 2026) de
// propósito: é o formato estável e bem documentado há anos, meio de reduzir risco de errar o
// formato de um endpoint muito recente. Migrar pra Interactions API depois é uma mudança isolada
// só neste arquivo — nada mais no app depende de qual variante da API do Gemini está por trás do
// `VexProvider`.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

interface IncomingMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolName?: string;
}

interface IncomingTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/**
 * Mensagens `tool` viram texto simples prefixado em vez do mecanismo nativo `functionResponse` do
 * Gemini de propósito — o histórico de turno da Vex (`runVexTurn.ts`) não reconstrói o turno
 * intermediário "modelo decidiu chamar a ferramenta" antes do resultado, então a estrutura
 * user→model(functionCall)→function(response) que o Gemini normalmente espera não bate. Texto
 * simples é menos "correto" mas nunca quebra por causa dessa lacuna estrutural.
 */
function toGeminiContents(messages: IncomingMessage[]): { role: string; parts: { text: string }[] }[] {
  const contents: { role: string; parts: { text: string }[] }[] = [];
  for (const message of messages) {
    if (message.role === "system") continue;
    if (message.role === "tool") {
      contents.push({ role: "user", parts: [{ text: `[Resultado da ferramenta ${message.toolName}]: ${message.content}` }] });
      continue;
    }
    contents.push({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] });
  }
  return contents;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  let body: { messages?: IncomingMessage[]; tools?: IncomingTool[] };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Corpo inválido." }, 400);
  }
  const { messages, tools } = body;
  if (!Array.isArray(messages)) {
    return jsonResponse({ error: "messages é obrigatório." }, 400);
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: secretRows, error: secretsError } = await supabase
    .from("app_secrets")
    .select("key, value")
    .in("key", ["gemini_api_key", "gemini_model"]);
  if (secretsError) return jsonResponse({ error: "Falha ao ler configuração do Gemini." }, 500);
  const secrets = Object.fromEntries((secretRows ?? []).map((r) => [r.key, r.value]));
  const apiKey = secrets.gemini_api_key;
  if (!apiKey) return jsonResponse({ error: "gemini_api_key não configurada em app_secrets." }, 500);
  const model = secrets.gemini_model || "gemini-flash-latest";

  const systemMessage = messages.find((m) => m.role === "system");
  const requestBody: Record<string, unknown> = {
    contents: toGeminiContents(messages),
  };
  if (systemMessage) {
    requestBody.systemInstruction = { parts: [{ text: systemMessage.content }] };
  }
  if (tools && tools.length > 0) {
    requestBody.tools = [
      {
        functionDeclarations: tools.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters })),
      },
    ];
  }

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(requestBody),
    },
  );

  if (!geminiResponse.ok) {
    const detail = await geminiResponse.text();
    console.error("Gemini error", geminiResponse.status, detail);
    return jsonResponse({ error: `Gemini respondeu ${geminiResponse.status}: ${detail}` }, 502);
  }

  const data = await geminiResponse.json();
  const parts: Array<{ text?: string; functionCall?: { name: string; args: Record<string, unknown> } }> =
    data.candidates?.[0]?.content?.parts ?? [];

  const functionCallPart = parts.find((p) => p.functionCall);
  if (functionCallPart?.functionCall) {
    return jsonResponse({ kind: "tool_call", toolCall: { name: functionCallPart.functionCall.name, arguments: functionCallPart.functionCall.args ?? {} } });
  }

  const content = parts.map((p) => p.text ?? "").join("");
  return jsonResponse({ kind: "message", content });
});
