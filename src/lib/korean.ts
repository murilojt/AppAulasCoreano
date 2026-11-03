// Utilitários de texto coreano / comparação. Usado no cliente e no servidor.

const INITIALS = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const VOWELS = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";

export function composeSyllable(initial: string, vowel: string): string {
  const l = INITIALS.indexOf(initial);
  const v = VOWELS.indexOf(vowel);
  if (l < 0 || v < 0) return initial + vowel;
  return String.fromCharCode(0xac00 + (l * 21 + v) * 28);
}

/** Texto que o navegador deve falar para soar bem ao pronunciar uma letra isolada. */
export function jamoSpeech(jamo: string): string {
  if (VOWELS.includes(jamo)) return composeSyllable("ㅇ", jamo);
  if (INITIALS.includes(jamo)) return composeSyllable(jamo, "ㅏ");
  return jamo;
}

export function isHangulJamo(s: string) {
  return s.length === 1 && /[ㄱ-ㆎ]/.test(s);
}

/** Remove pontuação, espaços e acentos; minúsculas. */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[\s.,!?;:'"“”‘’~\-–—…·()/\\]/g, "");
}

export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

/** Similaridade 0..1 entre duas frases (ignora espaços e pontuação). */
export function similarity(a: string, b: string): number {
  const x = normalize(a), y = normalize(b);
  if (!x && !y) return 1;
  const d = levenshtein(x, y);
  return Math.max(0, 1 - d / Math.max(x.length, y.length, 1));
}

export function matchesAny(answer: string, accepted: string[]): boolean {
  const n = normalize(answer);
  if (!n) return false;
  return accepted.some((a) => normalize(a) === n);
}

export function stripPunct(s: string) {
  return s.replace(/[.,!?;:"“”‘’]/g, "").trim();
}
