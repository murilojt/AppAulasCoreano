import level0 from "./levels/level-0.json";
import level1 from "./levels/level-1.json";
import level2 from "./levels/level-2.json";
import type { LevelContent, UnitContent, VocabItem } from "./types";

export const LEVELS: LevelContent[] = [level0, level1, level2] as LevelContent[];

// Estrutura pronta para os níveis 3 a 6 (TOPIK II). Basta criar level-3.json etc.
// e adicioná-los à lista acima; a trilha e o gerador reconhecem novos níveis automaticamente.
export const PLANNED_LEVELS = [
  { level: 3, name: "Intermediário 1", topik: "TOPIK II · nível 3" },
  { level: 4, name: "Intermediário 2", topik: "TOPIK II · nível 4" },
  { level: 5, name: "Avançado 1", topik: "TOPIK II · nível 5" },
  { level: 6, name: "Avançado 2", topik: "TOPIK II · nível 6" },
];

export function lessonKey(level: number, unit: number, order: number) {
  return `L${level}U${unit}-${order}`;
}

export function allUnits(): { level: LevelContent; unit: UnitContent }[] {
  return LEVELS.flatMap((level) => level.units.map((unit) => ({ level, unit })));
}

export function allVocab(minLevel = 1): VocabItem[] {
  return LEVELS.filter((l) => l.level >= minLevel).flatMap((l) => l.units.flatMap((u) => u.vocabulary));
}

export function findUnit(level: number, unit: number) {
  return LEVELS.find((l) => l.level === level)?.units.find((u) => u.unit === unit);
}
