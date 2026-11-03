import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { addMistakes, applyHearts, awardAchievements, getUserState, recordActivity } from "@/lib/game";

const body = z.object({
  key: z.string(),
  correct: z.number().int().min(0),
  total: z.number().int().min(1),
  heartsLost: z.number().int().min(0).max(50).default(0),
  failed: z.boolean().default(false),
  mistakes: z.array(z.object({ ko: z.string(), rom: z.string().default(""), pt: z.string().default("") })).max(60).default([]),
});

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  const { key, correct, total, heartsLost, failed, mistakes } = p.data;
  const lesson = await prisma.lesson.findUnique({ where: { key } });
  if (!lesson) return NextResponse.json({ error: "Lição não encontrada" }, { status: 404 });

  // simulado não consome corações
  const hearts = lesson.kind === "simulado" || !heartsLost ? (await getUserState(userId))!.hearts : await applyHearts(userId, -heartsLost);
  await addMistakes(userId, mistakes);

  if (failed) return NextResponse.json({ completed: false, hearts, xp: 0, newAchievements: [] });

  const score = Math.min(100, Math.round((Math.min(correct, total) / total) * 100));
  const prev = await prisma.lessonProgress.findUnique({ where: { userId_lessonKey: { userId, lessonKey: key } } });
  let xp = lesson.kind === "simulado" ? correct * 3 : Math.min(correct, total) * 2 + 10 + (score === 100 ? 5 : 0);
  if (prev) xp = Math.ceil(xp / 2); // repetir rende metade do XP
  await prisma.lessonProgress.upsert({
    where: { userId_lessonKey: { userId, lessonKey: key } },
    create: { userId, lessonKey: key, bestScore: score, completions: 1 },
    update: { bestScore: Math.max(prev?.bestScore ?? 0, score), completions: { increment: 1 }, completedAt: new Date() },
  });
  const streak = await recordActivity(userId, xp, 1);
  const newAchievements = await awardAchievements(userId);
  return NextResponse.json({ completed: true, score, xp, streak, hearts, newAchievements });
}
