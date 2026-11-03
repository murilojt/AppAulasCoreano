/**
 * Importa para o banco as lições base (originais, geradas por regras a partir dos JSON de conteúdo).
 * Idempotente: pode rodar quantas vezes quiser. Não sobrescreve lições já geradas pelo Claude.
 */
import { buildAllLessons, buildSimulado, SIMULADO_KEY } from "../src/lib/lessonBuilder";
import { db, saveLesson } from "./lib";

async function main() {
  const counts = { created: 0, updated: 0, skipped: 0 };
  for (const l of buildAllLessons()) counts[await saveLesson({ ...l, source: "template" })]++;
  const s = buildSimulado();
  counts[await saveLesson({ key: SIMULADO_KEY, level: 2, unit: 99, order: 1, kind: "simulado", title: s.title, summary: s.summary, exercises: s.exercises, source: "template" })]++;
  console.log(`Lições: ${counts.created} criadas, ${counts.updated} atualizadas, ${counts.skipped} mantidas.`);
}
main().finally(() => db.$disconnect());
