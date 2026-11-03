import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { extractJson, getAnthropic, MODEL } from "@/lib/anthropic";
import { awardAchievements, recordActivity } from "@/lib/game";
import { similarity } from "@/lib/korean";

export const maxDuration = 60;

const body = z.object({
  conversationId: z.string().optional(),
  text: z.string().trim().min(1).max(500),
  expected: z.string().trim().max(300).optional(), // frase que o aluno tentava dizer (opcional)
  scenario: z.enum(["livre", "final"]).default("livre"),
});

const tutorSchema = z.object({
  reply: z.object({ ko: z.string(), rom: z.string().default(""), pt: z.string().default("") }),
  corrections: z.array(z.object({
    kind: z.string(), you_said: z.string().default(""), correct: z.string().default(""),
    correct_rom: z.string().default(""), correct_pt: z.string().default(""), explanation: z.string().default(""),
  })).default([]),
  pronunciation: z.object({ score: z.number().nullable().default(null), feedback: z.string().default("") }).default({ score: null, feedback: "" }),
  encouragement: z.string().default(""),
  goals: z.array(z.object({ id: z.string(), done: z.boolean() })).default([]),
});


function systemPrompt(scenario: string, progressInfo: string) {
  const base = `Você é a "Minji" (민지), tutora de coreano gentil e paciente, fã de BTS, conversando com um brasileiro iniciante absoluto.
Contexto do aluno: ${progressInfo}
O aluno fala em coreano; o navegador transcreve a fala (pode haver erros de transcrição, que também sugerem problemas de pronúncia). Pode haver também palavras em português: ajude a dizer em coreano.
Regras:
- Responda como tutora, em coreano MUITO simples (frases curtas, vocabulário de iniciante, estilo educado -아요/어요), e termine com uma pergunta simples para continuar a conversa.
- Aponte erros de gramática, vocabulário e pronúncia de forma gentil. Para cada erro: o que o aluno disse, a forma correta em Hangeul, romanização, tradução em português e uma explicação curta em português.
- Se for informada uma FRASE ESPERADA e uma similaridade, avalie a pronúncia (0-100) e explique quais sons provavelmente falharam; sem frase esperada, use score null.
- Tema BTS/ARMY é bem-vindo (membros, títulos de músicas, shows). NUNCA reproduza letras de músicas.
- Toda explicação em português do Brasil. Se não houver erros, "corrections" = [] e elogie.
- Responda SOMENTE com um objeto JSON válido neste formato:
{"reply":{"ko":"","rom":"","pt":""},"corrections":[{"kind":"gramática|vocabulário|pronúncia","you_said":"","correct":"","correct_rom":"","correct_pt":"","explanation":""}],"pronunciation":{"score":null,"feedback":""},"encouragement":"frase curta em português","goals":[]}`;
  if (scenario === "final") {
    return base + `
CENÁRIO: CONVERSA FINAL. Conduza a conversa nesta ordem: (1) o aluno se apresenta, (2) conta o que fez no fim de semana, (3) convida alguém (você) para um show do BTS. Faça uma pergunta por vez, guiando o aluno ao próximo objetivo.
Em "goals" liste SEMPRE os 3 objetivos [{"id":"apresentar","done":bool},{"id":"fim-de-semana","done":bool},{"id":"convidar","done":bool}] marcando done=true quando o aluno já cumpriu (considerando todo o histórico).`;
  }
  return base + `\nCENÁRIO: conversa livre sobre rotina, gostos e BTS. "goals" = [].`;
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  const { text, expected, scenario } = p.data;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "O tutor de IA ainda não está configurado. Adicione ANTHROPIC_API_KEY no arquivo .env (veja o README) e reinicie o servidor." }, { status: 503 });
  }

  let conv = p.data.conversationId ? await prisma.conversation.findFirst({ where: { id: p.data.conversationId, userId } }) : null;
  if (!conv) conv = await prisma.conversation.create({ data: { userId, scenario, title: scenario === "final" ? "Conversa final" : text.slice(0, 40) } });

  const history = await prisma.message.findMany({ where: { conversationId: conv.id }, orderBy: { createdAt: "asc" }, take: 20 });
  const progress = await prisma.lessonProgress.findMany({ where: { userId }, include: { lesson: { select: { level: true, unit: true } } } });
  const maxUnit = progress.filter((x) => x.lesson.level >= 1).reduce((m, x) => Math.max(m, x.lesson.unit === 99 ? 0 : x.lesson.unit), 0);
  const progressInfo = progress.length === 0 ? "acabou de começar (iniciante absoluto)" : `já estudou até aproximadamente a unidade ${maxUnit || "0 (Hangeul)"} do curso (de 16)`;

  const msgs: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of history) {
    if (m.role === "user") {
      try { const u = JSON.parse(m.content); msgs.push({ role: "user", content: `TRANSCRIÇÃO DA FALA: ${u.text}` }); } catch { msgs.push({ role: "user", content: m.content }); }
    }
    else { try { const t = JSON.parse(m.content); msgs.push({ role: "assistant", content: JSON.stringify({ reply: t.reply, goals: t.goals ?? [] }) }); } catch { /* ignora */ } }
  }
  const sim = expected ? Math.round(similarity(text, expected) * 100) : null;
  const userTurn = expected
    ? `TRANSCRIÇÃO DA FALA: ${text}\nFRASE ESPERADA: ${expected}\nSIMILARIDADE (calculada): ${sim}%`
    : `TRANSCRIÇÃO DA FALA: ${text}`;
  // garante alternância user/assistant começando por user
  const merged: typeof msgs = [];
  for (const m of [...msgs, { role: "user" as const, content: userTurn }]) {
    if (merged.length && merged[merged.length - 1].role === m.role) merged[merged.length - 1].content += "\n" + m.content;
    else merged.push({ ...m });
  }
  if (merged[0]?.role !== "user") merged.shift();

  try {
    const res = await getAnthropic().messages.create({ model: MODEL, max_tokens: 1200, system: systemPrompt(scenario, progressInfo), messages: merged });
    const raw = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    const tutor = tutorSchema.parse(extractJson(raw));
    if (sim !== null && tutor.pronunciation.score === null) tutor.pronunciation.score = sim;

    await prisma.message.create({ data: { conversationId: conv.id, role: "user", content: JSON.stringify({ text, expected, sim }) } });
    await prisma.message.create({ data: { conversationId: conv.id, role: "tutor", content: JSON.stringify(tutor) } });
    const streak = await recordActivity(userId, 5, 0);
    const newAchievements = await awardAchievements(userId);
    return NextResponse.json({ conversationId: conv.id, tutor, similarity: sim, xp: 5, streak, newAchievements });
  } catch (e) {
    console.error("Erro no tutor:", e);
    const msg = e instanceof Error && /401|authentication|api[_ ]key/i.test(e.message) ? "A chave da Anthropic parece inválida. Confira o .env." : "Não consegui falar com o tutor agora. Tente de novo em instantes.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
