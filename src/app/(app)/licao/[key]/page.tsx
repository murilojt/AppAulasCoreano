import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { getPath } from "@/lib/path";
import { getUserState } from "@/lib/game";
import LessonClient from "@/components/LessonClient";
import type { Exercise } from "@/content/types";

export const dynamic = "force-dynamic";

export default async function LessonPage({ params }: { params: { key: string } }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/entrar");
  const lesson = await prisma.lesson.findUnique({ where: { key: params.key } });
  if (!lesson) notFound();
  const path = await getPath(userId);
  if (path.find((p) => p.key === lesson.key)?.status === "locked") redirect("/trilha");
  const user = (await getUserState(userId))!;
  return (
    <LessonClient
      lessonKey={lesson.key} title={lesson.title} kind={lesson.kind}
      exercises={JSON.parse(lesson.exercises) as Exercise[]}
      hearts={user.hearts} nextHeartMin={Math.max(1, Math.ceil(user.nextHeartMs / 60000))}
    />
  );
}
