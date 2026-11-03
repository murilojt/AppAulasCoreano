/**
 * npm run generate:lessons [-- --level 1] [-- --unit 3] [-- --force] [-- --dry]
 *
 * Usa o Claude para gerar de 3 a 5 lições com exercícios ORIGINAIS por unidade, a partir dos JSON em
 * src/content/levels, e salva no banco via Prisma. Sem duplicar: a chave da lição (L{nível}U{unidade}-{ordem})
 * é única; lições já geradas pelo Claude são mantidas (use --force para regerar).
 */
import "dotenv/config";
import { LEVELS, lessonKey } from "../src/content";
import type { LevelContent, UnitContent, Exercise } from "../src/content/types";
import { generatedUnitSchema } from "../src/lib/exerciseSchema";
import { extractJson, getAnthropic, MODEL } from "../src/lib/anthropic";
import { db, saveLesson } from "./lib";

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(`--${n}`);
const opt = (n: string) => { const i = args.indexOf(`--${n}`); return i >= 0 ? Number(args[i + 1]) : undefined; };

const SYSTEM = `Você é um designer instrucional de coreano para brasileiros iniciantes absolutos, com tema BTS/ARMY.
Crie lições com exercícios 100% ORIGINAIS. Regras obrigatórias:
- NUNCA reproduza letras de músicas, nem textos, diálogos ou exercícios de livros (Sejong Korean, etc.). Pode citar títulos de músicas e nomes dos membros.
- Use apenas vocabulário e gramática do conteúdo fornecido (e de unidades anteriores citadas). Frases curtas e naturais.
- Toda instrução em português do Brasil. Romanização pela Romanização Revisada.
- Responda SOMENTE com JSON válido, sem comentários e sem markdown.`;

const SCHEMA_DOC = `Formato: {"lessons":[{"title":string,"summary":string,"exercises":Exercise[]}]} com 3 a 5 lições, cada uma com 10 a 16 exercícios.
Exercise (campo "type"):
- {"type":"mc","prompt":string,"ko"?:string,"speak"?:string,"hideKo"?:boolean,"options":string[3-4],"answer":índice,"explain"?:string,"review"?:{"ko","rom","pt"}}
- {"type":"build","dir":"pt-ko"|"ko-pt","prompt":string,"ko":frase coreana,"answer":string[] (blocos na ordem correta, 2-9),"extra":string[] (2-3 blocos distratores),"rom":string,"pt":string}
- {"type":"listen","ko":string,"rom":string,"pt":string,"accept":[string] (coreano e romanização aceitos)}
- {"type":"translate","direction":"pt-ko"|"ko-pt","prompt":string,"answer":string,"accept":string[],"rom"?:string}
- {"type":"match","pairs":[{"ko":string,"pt":string}] (4 a 5 pares)}
- {"type":"speak","ko":string,"rom":string,"pt":string}
Use os 6 tipos ao longo da unidade. Inclua "review" nos exercícios que testam uma palavra do vocabulário. A última lição deve ser uma revisão da unidade.`;

async function generateUnit(level: LevelContent, unit: UnitContent) {
  const client = getAnthropic();
  const userMsg = `Nível ${level.level} (${level.name}) — ${level.curriculum}; ${level.topik}.
Unidade ${unit.unit}: ${unit.theme}
Tipo de conteúdo: ${unit.kind === "letters" ? "letras do Hangeul (os itens do vocabulário são letras; 'pt' descreve o som)" : "palavras e frases"}.
CONTEÚDO (JSON):
${JSON.stringify({ objetivos: unit.objectives, vocabulario: unit.vocabulary, gramatica: unit.grammar })}

${SCHEMA_DOC}`;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await client.messages.create({
        model: MODEL, max_tokens: 8000, system: SYSTEM,
        messages: [{ role: "user", content: attempt === 1 ? userMsg : `${userMsg}\n\nTentativa anterior inválida: ${String(lastErr).slice(0, 600)}. Corrija e responda só com JSON.` }],
      });
      const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
      return generatedUnitSchema.parse(extractJson(text));
    } catch (e) { lastErr = e; console.warn(`  tentativa ${attempt} falhou: ${String(e).slice(0, 200)}`); }
  }
  throw lastErr;
}

async function main() {
  const onlyLevel = opt("level"), onlyUnit = opt("unit"), force = flag("force");
  for (const level of LEVELS) {
    if (onlyLevel !== undefined && level.level !== onlyLevel) continue;
    for (const unit of level.units) {
      if (onlyUnit !== undefined && unit.unit !== onlyUnit) continue;
      const done = await db.lesson.count({ where: { level: level.level, unit: unit.unit, source: "claude" } });
      if (done > 0 && !force) { console.log(`↷ Nível ${level.level} · Unidade ${unit.unit}: já gerada (use --force para regerar)`); continue; }
      console.log(`✦ Nível ${level.level} · Unidade ${unit.unit} (${unit.theme})…`);
      if (flag("dry")) continue;
      const out = await generateUnit(level, unit);
      let i = 0;
      for (const l of out.lessons) {
        i++;
        const r = await saveLesson({
          key: lessonKey(level.level, unit.unit, i), level: level.level, unit: unit.unit, order: i,
          title: l.title, summary: l.summary, exercises: l.exercises as Exercise[], source: "claude",
        }, true);
        console.log(`   ${lessonKey(level.level, unit.unit, i)} ${r}: ${l.title}`);
      }
      // remove lições-modelo excedentes (sem progresso) para não misturar com as do Claude
      const extra = await db.lesson.findMany({ where: { level: level.level, unit: unit.unit, order: { gt: i }, source: "template" }, include: { progress: { select: { id: true } } } });
      for (const e of extra) if (e.progress.length === 0) await db.lesson.delete({ where: { id: e.id } });
    }
  }
  console.log("Concluído.");
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
