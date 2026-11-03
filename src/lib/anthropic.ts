import Anthropic from "@anthropic-ai/sdk";

// A chave só existe no servidor (rotas de API e scripts). Nunca é enviada ao navegador.
export const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

let client: Anthropic | null = null;
export function getAnthropic(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY não configurada. Veja o README.");
  client ??= new Anthropic({ apiKey: key });
  return client;
}

export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("Resposta sem JSON");
  return JSON.parse(text.slice(start, end + 1));
}
