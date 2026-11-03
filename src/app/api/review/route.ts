import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { applyHearts, awardAchievements, recordActivity, SRS_DAYS } from "@/lib/game";
import { buildReviewExercises } from "@/lib/lessonBuilder";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const now = new Date();
  const [due, total, soon] = await Promise.all([
    prisma.wordReview.findMany({ where: { userId, dueAt: { lte: now } }, orderBy: { dueAt: "asc" }, take: 10 }),
    prisma.wordReview.count({ where: { userId } }),
    prisma.wordReview.findFirst({ where: { userId, dueAt: { gt: now } }, orderBy: { dueAt: "asc" } }),
  ]);
  const exercises = buildReviewExercises(due.map((d) => ({ ko: d.ko, rom: d.rom, pt: d.pt })), `${userId}-${now.toISOString().slice(0, 13)}`);
  return NextResponse.json({ exercises, dueCount: await prisma.wordReview.count({ where: { userId, dueAt: { lte: now } } }), total, nextDue: soon?.dueAt ?? null });
}

const body = z.object({ results: z.array(z.object({ ko: z.string(), correct: z.boolean() })).max(50) });

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  let right = 0;
  for (const r of p.data.results) {
    const w = await prisma.wordReview.findUnique({ where: { userId_ko: { userId, ko: r.ko } } });
    if (!w) continue;
    if (r.correct) {
      right++;
      const box = Math.min(w.box + 1, SRS_DAYS.length);
      await prisma.wordReview.update({ where: { id: w.id }, data: { box, dueAt: new Date(Date.now() + SRS_DAYS[box - 1] * 86400000), lastSeen: new Date() } });
    } else {
      await prisma.wordReview.update({ where: { id: w.id }, data: { box: 0, lapses: { increment: 1 }, dueAt: new Date(Date.now() + 10 * 60000), lastSeen: new Date() } });
    }
  }
  const xp = right * 2 + (p.data.results.length ? 5 : 0);
  const streak = await recordActivity(userId, xp, 0);
  const hearts = p.data.results.length >= 3 ? await applyHearts(userId, 1) : undefined; // revisão devolve 1 coração
  const newAchievements = await awardAchievements(userId);
  return NextResponse.json({ xp, streak, hearts, newAchievements });
}
