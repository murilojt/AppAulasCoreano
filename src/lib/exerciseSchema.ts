import { z } from "zod";
import type { Exercise } from "@/content/types";

const vocab = z.object({ ko: z.string().min(1), rom: z.string(), pt: z.string() });

const mc = z.object({
  type: z.literal("mc"), prompt: z.string().min(1), ko: z.string().optional(), speak: z.string().optional(),
  hideKo: z.boolean().optional(), options: z.array(z.string().min(1)).min(2).max(5), answer: z.number().int(),
  explain: z.string().optional(), section: z.string().optional(), review: vocab.optional(),
}).refine((e) => e.answer >= 0 && e.answer < e.options.length, "answer fora do intervalo");

const build = z.object({
  type: z.literal("build"), dir: z.enum(["pt-ko", "ko-pt"]), prompt: z.string().min(1), ko: z.string().min(1),
  answer: z.array(z.string().min(1)).min(2).max(10), extra: z.array(z.string()).max(5).default([]),
  rom: z.string().default(""), pt: z.string().default(""), review: vocab.optional(),
});

const listen = z.object({
  type: z.literal("listen"), ko: z.string().min(1), rom: z.string(), pt: z.string(), accept: z.array(z.string()).min(1), review: vocab.optional(),
});

const translate = z.object({
  type: z.literal("translate"), direction: z.enum(["pt-ko", "ko-pt"]), prompt: z.string().min(1), answer: z.string().min(1),
  accept: z.array(z.string()).min(1), rom: z.string().optional(), review: vocab.optional(),
});

const match = z.object({
  type: z.literal("match"), pairs: z.array(z.object({ ko: z.string().min(1), pt: z.string().min(1) })).min(3).max(6),
});

const speak = z.object({ type: z.literal("speak"), ko: z.string().min(1), rom: z.string(), pt: z.string(), review: vocab.optional() });

export const exerciseSchema = z.union([mc, build, listen, translate, match, speak]);

export const generatedLessonSchema = z.object({
  title: z.string().min(1),
  summary: z.string().default(""),
  exercises: z.array(exerciseSchema).min(8).max(20),
});

export const generatedUnitSchema = z.object({ lessons: z.array(generatedLessonSchema).min(3).max(5) });

export type ParsedExercise = z.infer<typeof exerciseSchema>;
export function parseExercises(json: string): Exercise[] {
  return JSON.parse(json) as Exercise[];
}
