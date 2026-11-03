import { prisma } from "./prisma";

export type PathLesson = {
  key: string; level: number; unit: number; order: number; kind: string; title: string; summary: string;
  status: "done" | "current" | "locked"; bestScore: number;
};

export async function getPath(userId: string): Promise<PathLesson[]> {
  const [lessons, progress] = await Promise.all([
    prisma.lesson.findMany({ select: { key: true, level: true, unit: true, order: true, kind: true, title: true, summary: true }, orderBy: [{ level: "asc" }, { unit: "asc" }, { order: "asc" }] }),
    prisma.lessonProgress.findMany({ where: { userId } }),
  ]);
  const done = new Map(progress.map((p) => [p.lessonKey, p.bestScore]));
  const regular = lessons.filter((l) => l.kind === "lesson");
  const allRegularDone = regular.every((l) => done.has(l.key));
  let currentAssigned = false;
  let prevDone = true;
  return lessons.map((l) => {
    const isDone = done.has(l.key);
    let status: PathLesson["status"];
    if (isDone) status = "done";
    else if (l.kind === "simulado") status = allRegularDone ? "current" : "locked";
    else if (prevDone && !currentAssigned) { status = "current"; currentAssigned = true; }
    else status = "locked";
    if (l.kind === "lesson") prevDone = isDone;
    return { ...l, status, bestScore: done.get(l.key) ?? 0 };
  });
}
