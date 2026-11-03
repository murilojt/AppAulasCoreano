// Gerador determinístico (offline) de lições originais a partir dos JSON de conteúdo.
// Serve como base imediata do app; o script `generate:lessons` (Claude) enriquece/substitui estas lições.
import type { Example, Exercise, LevelContent, UnitContent, VocabItem } from "@/content/types";
import { LEVELS, lessonKey } from "@/content";
import { jamoSpeech, normalize, stripPunct } from "./korean";

export type BuiltLesson = { key: string; level: number; unit: number; order: number; title: string; summary: string; exercises: Exercise[] };

// ---------- util ----------
function hash(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}
export function rng(seed: string) {
  let a = hash(seed);
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffle<T>(arr: T[], r: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const chunk = <T,>(arr: T[], size: number) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
const uniqBy = <T,>(arr: T[], f: (x: T) => string) => { const s = new Set<string>(); return arr.filter((x) => { const k = f(x); if (s.has(k)) return false; s.add(k); return true; }); };

function ptVariants(pt: string): string[] {
  const noParen = pt.replace(/\([^)]*\)/g, "").trim();
  const parts = noParen.split(/[,/]/).map((s) => s.trim()).filter(Boolean);
  return Array.from(new Set([pt, noParen, ...parts]));
}
const cleanPt = (pt: string) => pt.replace(/\s*\([^)]*\)\s*$/, "").trim();

function distractors<T>(correct: T, pool: T[], key: (x: T) => string, n: number, r: () => number): T[] {
  const cands = uniqBy(pool.filter((p) => key(p) !== key(correct)), key);
  return shuffle(cands, r).slice(0, n);
}
function withAnswer(options: string[], correct: string, r: () => number) {
  const opts = shuffle([correct, ...options], r);
  return { options: opts, answer: opts.indexOf(correct) };
}

// ---------- exercícios por item ----------
const isLetter = (u: UnitContent) => u.kind === "letters";
const reviewOf = (v: VocabItem): VocabItem => ({ ko: v.ko, rom: v.rom, pt: v.pt });

function mcKoPt(v: VocabItem, pool: VocabItem[], r: () => number): Exercise {
  const d = distractors(v, pool, (x) => x.pt, 3, r).map((x) => x.pt);
  return { type: "mc", prompt: "O que significa?", ko: v.ko, ...withAnswer(d, v.pt, r), review: reviewOf(v) };
}
function mcPtKo(v: VocabItem, pool: VocabItem[], r: () => number): Exercise {
  const d = distractors(v, pool, (x) => x.ko, 3, r).map((x) => x.ko);
  return { type: "mc", prompt: `Como se diz “${cleanPt(v.pt)}” em coreano?`, ...withAnswer(d, v.ko, r), review: reviewOf(v) };
}
function listenWord(v: VocabItem): Exercise {
  return { type: "listen", ko: v.ko, rom: v.rom, pt: v.pt, accept: [v.ko, v.rom], review: reviewOf(v) };
}
function translatePtKo(v: VocabItem): Exercise {
  return { type: "translate", direction: "pt-ko", prompt: `Escreva em coreano: ${cleanPt(v.pt)}`, answer: v.ko, accept: [v.ko, v.rom], rom: v.rom, review: reviewOf(v) };
}
function translateKoPt(v: VocabItem): Exercise {
  return { type: "translate", direction: "ko-pt", prompt: `Traduza para o português: ${v.ko}`, answer: cleanPt(v.pt), accept: ptVariants(v.pt), rom: v.rom, review: reviewOf(v) };
}
function speakWord(v: VocabItem): Exercise {
  return { type: "speak", ko: v.ko, rom: v.rom, pt: v.pt, review: reviewOf(v) };
}
function matchSet(items: VocabItem[], letters: boolean, r: () => number): Exercise {
  const sel = shuffle(items, r).slice(0, 5);
  return { type: "match", pairs: sel.map((v) => ({ ko: v.ko, pt: letters ? v.rom : cleanPt(v.pt) })) };
}

// letras
function letterKoRom(v: VocabItem, pool: VocabItem[], r: () => number): Exercise {
  const d = distractors(v, pool, (x) => x.rom, 3, r).map((x) => x.rom);
  return { type: "mc", prompt: "Qual é o som desta letra?", ko: v.ko, speak: jamoSpeech(v.ko), ...withAnswer(d, v.rom, r), explain: `${v.ko} = ${v.rom} (${v.pt})`, review: reviewOf(v) };
}
function letterRomKo(v: VocabItem, pool: VocabItem[], r: () => number): Exercise {
  const d = distractors(v, pool, (x) => x.ko, 3, r).map((x) => x.ko);
  return { type: "mc", prompt: `Qual letra tem o som “${v.rom}”?`, ...withAnswer(d, v.ko, r), review: reviewOf(v) };
}
function letterHear(v: VocabItem, pool: VocabItem[], r: () => number): Exercise {
  const d = distractors(v, pool, (x) => x.rom, 3, r).map((x) => x.rom);
  return { type: "mc", prompt: "Ouça e escolha o som", speak: jamoSpeech(v.ko), hideKo: true, ...withAnswer(d, v.rom, r), explain: `${v.ko} = ${v.rom}`, review: reviewOf(v) };
}

// frases
const tokensKo = (s: string) => stripPunct(s).split(/\s+/).filter(Boolean);
function buildPtKo(e: Example, extraPool: string[], r: () => number): Exercise | null {
  const answer = tokensKo(e.ko);
  if (answer.length < 2) return null;
  const extra = shuffle(extraPool.filter((t) => !answer.includes(t)), r).slice(0, 3);
  return { type: "build", dir: "pt-ko", prompt: `Monte a frase: ${e.pt.replace(/\s*\([^)]*\)/g, "")}`, ko: e.ko, answer, extra, rom: e.rom, pt: e.pt };
}
function buildKoPt(e: Example, extraPool: string[], r: () => number): Exercise | null {
  const ptClean = e.pt.replace(/\s*\([^)]*\)/g, "");
  const answer = stripPunct(ptClean.replace(/\s+—.*$/, "")).split(/\s+/).filter(Boolean);
  if (answer.length < 2 || answer.length > 9) return null;
  const extra = shuffle(extraPool.filter((t) => !answer.map((a) => a.toLowerCase()).includes(t.toLowerCase())), r).slice(0, 3);
  return { type: "build", dir: "ko-pt", prompt: `Traduza: ${e.ko}`, ko: e.ko, answer, extra, rom: e.rom, pt: e.pt };
}
function listenSentence(e: Example): Exercise {
  return { type: "listen", ko: e.ko, rom: e.rom, pt: e.pt, accept: [e.ko, e.rom] };
}
function speakSentence(e: Example): Exercise {
  return { type: "speak", ko: e.ko, rom: e.rom, pt: e.pt };
}
function cloze(e: Example, vocabPool: string[], r: () => number): Exercise | null {
  const toks = tokensKo(e.ko);
  if (toks.length < 2) return null;
  // escolhe um token (de preferência o mais longo) para esconder
  const idx = toks.map((t, i) => [t, i] as const).sort((a, b) => b[0].length - a[0].length)[0][1];
  const answer = toks[idx];
  const blank = toks.map((t, i) => (i === idx ? "____" : t)).join(" ");
  const d = shuffle(vocabPool.filter((t) => t !== answer && !toks.includes(t)), r).slice(0, 3);
  return { type: "mc", prompt: `Complete a frase (${e.pt.replace(/\s*\([^)]*\)/g, "")})`, ko: blank, ...withAnswer(d, answer, r) };
}

// ---------- construção de unidade ----------
export function buildUnitLessons(level: LevelContent, unit: UnitContent): BuiltLesson[] {
  const letters = isLetter(unit);
  const rBase = `${level.level}-${unit.unit}`;
  const levelWords = level.units.filter((u) => u.kind === unit.kind).flatMap((u) => u.vocabulary);
  const pool: VocabItem[] = uniqBy([...unit.vocabulary, ...levelWords], (v) => v.ko);
  const vocabPoolKo = uniqBy(
    [...unit.vocabulary, ...levelWords].map((v) => v.ko).filter((k) => !k.includes(" ")).map((k) => ({ k })), (x) => x.k
  ).map((x) => x.k);
  const exampleToks = unit.grammar.flatMap((g) => g.examples.flatMap((e) => tokensKo(e.ko)));
  const ptToksPool = uniqBy(
    level.units.flatMap((u) => u.grammar.flatMap((g) => g.examples.flatMap((e) => stripPunct(e.pt.replace(/\s*\([^)]*\)/g, "")).split(/\s+/)))).filter((t) => t.length > 1).map((t) => ({ t })),
    (x) => x.t.toLowerCase()
  ).map((x) => x.t);
  const examples = unit.grammar.flatMap((g) => g.examples);

  const nVocabLessons = Math.min(3, Math.max(1, Math.ceil(unit.vocabulary.length / 7)));
  const groups = chunk(unit.vocabulary, Math.ceil(unit.vocabulary.length / nVocabLessons));
  const lessons: BuiltLesson[] = [];

  groups.forEach((items, gi) => {
    const r = rng(`${rBase}-v${gi}`);
    const ex: Exercise[] = [];
    if (letters) {
      ex.push(...shuffle(items, r).map((v) => letterKoRom(v, pool, r)));
      ex.push(matchSet(items, true, r));
      ex.push(...shuffle(items, r).slice(0, 3).map((v) => letterHear(v, pool, r)));
      ex.push(...shuffle(items, r).map((v) => letterRomKo(v, pool, r)));
      ex.push(...shuffle(items, r).slice(0, 2).map(speakWord));
    } else {
      ex.push(...shuffle(items, r).map((v) => mcKoPt(v, pool, r)));
      ex.push(matchSet(items, false, r));
      ex.push(...shuffle(items, r).slice(0, 3).map(listenWord));
      ex.push(...shuffle(items, r).slice(0, 4).map((v) => mcPtKo(v, pool, r)));
      ex.push(...shuffle(items, r).slice(0, 2).map(translateKoPt));
      ex.push(...shuffle(items, r).slice(0, 2).map(translatePtKo));
      ex.push(...shuffle(items, r).slice(0, 2).map(speakWord));
    }
    lessons.push({
      key: lessonKey(level.level, unit.unit, gi + 1), level: level.level, unit: unit.unit, order: gi + 1,
      title: groups.length > 1 ? `${unit.theme}: parte ${gi + 1}` : `${unit.theme}: vocabulário`,
      summary: unit.objectives[0] ?? unit.theme, exercises: capEx(ex, 20),
    });
  });

  // lição de gramática / exemplos
  {
    const r = rng(`${rBase}-g`);
    const ex: Exercise[] = [];
    const exs = examples.slice(0, 6);
    exs.forEach((e, i) => {
      if (letters || tokensKo(e.ko).length < 2) {
        const v: VocabItem = { ko: e.ko, rom: e.rom, pt: e.pt };
        const d = distractors(v, unit.vocabulary, (x) => x.rom, 3, r).map((x) => x.rom);
        ex.push({ type: "mc", prompt: "Como se lê esta sílaba/palavra?", ko: e.ko, speak: e.ko, ...withAnswer(d, e.rom.replace(/[!?.,]/g, ""), r), review: reviewOf(v) });
        ex.push(listenSentence(e));
      } else {
        const b = i % 2 === 0 ? buildPtKo(e, exampleToks, r) : buildKoPt(e, ptToksPool, r);
        if (b) ex.push(b);
        if (i % 2 === 0) { const c = cloze(e, vocabPoolKo, r); if (c) ex.push(c); }
        if (i < 3) ex.push(listenSentence(e));
        if (i % 2 === 1) ex.push(speakSentence(e));
      }
    });
    if (!ex.length) ex.push(...unit.vocabulary.slice(0, 5).map((v) => mcKoPt(v, pool, r)));
    lessons.push({
      key: lessonKey(level.level, unit.unit, lessons.length + 1), level: level.level, unit: unit.unit, order: lessons.length + 1,
      title: `${unit.theme}: ${letters ? "sílabas" : "gramática e frases"}`,
      summary: unit.grammar.map((g) => g.structure).join(" · "), exercises: capEx(ex, 14),
    });
  }

  // revisão da unidade
  {
    const r = rng(`${rBase}-mix`);
    const ex: Exercise[] = [];
    const items = shuffle(unit.vocabulary, r);
    if (letters) {
      ex.push(...items.slice(0, 5).map((v) => letterKoRom(v, pool, r)));
      ex.push(...items.slice(0, 4).map((v) => letterHear(v, pool, r)));
      ex.push(...items.slice(0, 4).map((v) => letterRomKo(v, pool, r)));
      ex.push(matchSet(items, true, r), matchSet(items, true, r));
    } else {
      ex.push(...items.slice(0, 4).map((v) => mcKoPt(v, pool, r)));
      ex.push(...items.slice(0, 4).map((v) => mcPtKo(v, pool, r)));
      ex.push(matchSet(items, false, r));
      ex.push(...items.slice(0, 2).map(listenWord));
      for (const e of shuffle(examples, r).slice(0, 3)) {
        const b = buildPtKo(e, exampleToks, r) ?? buildKoPt(e, ptToksPool, r);
        if (b) ex.push(b);
      }
      ex.push(...items.slice(0, 2).map(speakWord));
    }
    lessons.push({
      key: lessonKey(level.level, unit.unit, lessons.length + 1), level: level.level, unit: unit.unit, order: lessons.length + 1,
      title: `${unit.theme}: revisão`, summary: "Revisão de toda a unidade", exercises: shuffleKeepMatch(ex, r),
    });
  }
  return lessons;
}

function capEx(ex: Exercise[], n: number) {
  return ex.length <= n ? ex : ex.slice(0, n);
}
function shuffleKeepMatch(ex: Exercise[], r: () => number) {
  return shuffle(ex, r).slice(0, 18);
}

export function buildAllLessons(): BuiltLesson[] {
  return LEVELS.flatMap((l) => l.units.flatMap((u) => buildUnitLessons(l, u)));
}

// ---------- Simulado final (estilo TOPIK I: audição + leitura, 40 questões) ----------
export const SIMULADO_KEY = "FINAL-SIMULADO";

export function buildSimulado(): { key: string; title: string; summary: string; exercises: Exercise[] } {
  const units = LEVELS.filter((l) => l.level >= 1).flatMap((l) => l.units.map((u) => ({ l, u })));
  const allVocab = units.flatMap(({ u }) => u.vocabulary);
  const allExamples = units.flatMap(({ u }) => u.grammar.flatMap((g) => g.examples));
  const allToks = uniqBy(allExamples.flatMap((e) => tokensKo(e.ko)).map((t) => ({ t })), (x) => x.t).map((x) => x.t);
  const listening: Exercise[] = [];
  const reading: Exercise[] = [];
  const r = rng("simulado-v1");

  units.forEach(({ u }, i) => {
    const ex = u.grammar.flatMap((g) => g.examples);
    const sentence = (k: number) => ex[(k + i) % ex.length];
    const vocab = u.vocabulary.filter((v) => !v.ko.includes(" ") || true);
    const vA = vocab[(i * 3) % vocab.length];
    const vB = vocab[(i * 3 + 1) % vocab.length];
    const ptOpts = (e: Example) => allExamples.filter((x) => x.pt !== e.pt).map((x) => x.pt);
    const koOpts = (e: Example) => allExamples.filter((x) => x.ko !== e.ko).map((x) => x.ko);

    // Audição A
    if (i % 2 === 0) {
      const d = distractors(vA, allVocab, (x) => x.pt, 3, r).map((x) => x.pt);
      listening.push({ type: "mc", section: "audição", prompt: "Ouça e escolha o significado.", speak: vA.ko, hideKo: true, ...withAnswer(d, vA.pt, r), review: reviewOf(vA) });
    } else {
      const e = sentence(0);
      const d = shuffle(ptOpts(e), r).slice(0, 3);
      listening.push({ type: "mc", section: "audição", prompt: "Ouça a frase e escolha a tradução.", speak: e.ko, hideKo: true, ...withAnswer(d, e.pt, r) });
    }
    // Leitura B
    if (i % 2 === 0) {
      const e = sentence(1);
      const d = shuffle(ptOpts(e), r).slice(0, 3);
      reading.push({ type: "mc", section: "leitura", prompt: "Leia a frase e escolha a tradução.", ko: e.ko, ...withAnswer(d, e.pt, r) });
    } else {
      const e = ex.find((x) => tokensKo(x.ko).length >= 2) ?? ex[0];
      const c = cloze(e, allToks.filter((t) => !t.includes("BTS")), r);
      if (c && c.type === "mc") reading.push({ ...c, section: "leitura" });
      else reading.push({ type: "mc", section: "leitura", prompt: "O que significa?", ko: vB.ko, ...withAnswer(distractors(vB, allVocab, (x) => x.pt, 3, r).map((x) => x.pt), vB.pt, r), review: reviewOf(vB) });
    }
    // Extras
    if (i % 4 === 0) {
      const e = sentence(2);
      const d = shuffle(koOpts(e), r).slice(0, 3);
      listening.push({ type: "mc", section: "audição", prompt: "Ouça e escolha a frase que você ouviu.", speak: e.ko, hideKo: true, ...withAnswer(d, e.ko, r) });
    }
    if (i % 4 === 2) {
      reading.push({ type: "mc", section: "leitura", prompt: "O que significa?", ko: vB.ko, ...withAnswer(distractors(vB, allVocab, (x) => x.pt, 3, r).map((x) => x.pt), vB.pt, r), review: reviewOf(vB) });
    }
  });
  const exercises = [...listening.slice(0, 20), ...reading.slice(0, 20)];
  return {
    key: SIMULADO_KEY,
    title: "Simulado final estilo TOPIK I",
    summary: "40 questões originais de audição e leitura cobrindo as unidades 1 a 16.",
    exercises,
  };
}

export { normalize };

// ---------- Revisão espaçada ----------
export function buildReviewExercises(items: VocabItem[], seed: string): Exercise[] {
  const r = rng(seed);
  const allWords: VocabItem[] = LEVELS.flatMap((l) => l.units.flatMap((u) => u.vocabulary));
  const letters = allWords.filter((v) => v.ko.length === 1 && /[ㄱ-ㆎ]/.test(v.ko));
  const words = uniqBy(allWords.filter((v) => !(v.ko.length === 1 && /[ㄱ-ㆎ]/.test(v.ko))), (v) => v.ko);
  const out: Exercise[] = [];
  for (const v of items) {
    const isL = v.ko.length === 1 && /[ㄱ-ㆎ]/.test(v.ko);
    if (isL) {
      out.push(r() < 0.5 ? letterKoRom(v, letters, r) : letterHear(v, letters, r));
    } else {
      const pick = r();
      if (pick < 0.4) out.push(mcKoPt(v, words, r));
      else if (pick < 0.7) out.push(mcPtKo(v, words, r));
      else if (pick < 0.9) out.push(listenWord(v));
      else out.push(translatePtKo(v));
    }
  }
  return out;
}
