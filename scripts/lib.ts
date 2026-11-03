import { PrismaClient } from "@prisma/client";
import type { Exercise } from "../src/content/types";

export const db = new PrismaClient();

export type LessonInput = {
  key: string; level: number; unit: number; order: number; kind?: string;
  title: string; summary: string; exercises: Exercise[]; source: "template" | "claude";
};

/**
 * Grava a lição sem duplicar (chave única). Regras:
 *  - não existe → cria
 *  - existe com source "claude" → só sobrescreve se force=true
 *  - existe com source "template" → atualiza (ex.: Claude substitui o modelo base)
 */
export async function saveLesson(l: LessonInput, force = false): Promise<"created" | "updated" | "skipped"> {
  const existing = await db.lesson.findUnique({ where: { key: l.key } });
  const data = {
    level: l.level, unit: l.unit, order: l.order, kind: l.kind ?? "lesson", title: l.title,
    summary: l.summary, exercises: JSON.stringify(l.exercises), source: l.source,
  };
  if (!existing) { await db.lesson.create({ data: { key: l.key, ...data } }); return "created"; }
  if (existing.source === "claude" && l.source === "template" && !force) return "skipped";
  if (existing.source === "claude" && l.source === "claude" && !force) return "skipped";
  await db.lesson.update({ where: { key: l.key }, data });
  return "updated";
}
