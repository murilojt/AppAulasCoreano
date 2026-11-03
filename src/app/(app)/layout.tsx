import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { getUserState } from "@/lib/game";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/AppShell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/entrar");
  const user = (await getUserState(userId))!;
  const due = await prisma.wordReview.count({ where: { userId, dueAt: { lte: new Date() } } });
  return <AppShell user={user} due={due}>{children}</AppShell>;
}
