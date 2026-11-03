export type VocabItem = { ko: string; rom: string; pt: string };
export type Example = { ko: string; rom: string; pt: string };
export type GrammarPoint = { structure: string; explanation: string; examples: Example[] };

export type UnitContent = {
  unit: number;
  kind: "letters" | "words";
  theme: string;
  objectives: string[];
  vocabulary: VocabItem[];
  grammar: GrammarPoint[];
};

export type LevelContent = {
  version: number;
  level: number;
  name: string;
  curriculum: string;
  topik: string;
  units: UnitContent[];
};

// ---- Exercícios (armazenados como JSON no banco) ----
export type Exercise =
  | { type: "mc"; prompt: string; ko?: string; speak?: string; hideKo?: boolean; options: string[]; answer: number; explain?: string; section?: string; review?: VocabItem }
  | { type: "build"; dir: "pt-ko" | "ko-pt"; prompt: string; ko: string; answer: string[]; extra: string[]; rom: string; pt: string; review?: VocabItem }
  | { type: "listen"; ko: string; rom: string; pt: string; accept: string[]; review?: VocabItem }
  | { type: "translate"; direction: "pt-ko" | "ko-pt"; prompt: string; answer: string; accept: string[]; rom?: string; review?: VocabItem }
  | { type: "match"; pairs: { ko: string; pt: string }[] }
  | { type: "speak"; ko: string; rom: string; pt: string; review?: VocabItem };

export type ExerciseType = Exercise["type"];
