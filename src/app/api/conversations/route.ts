import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

export async function GET(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const c = await prisma.conversation.findFirst({ where: { id, userId }, include: { messages: { orderBy: { createdAt: "asc" } } } });
    if (!c) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });
    return NextResponse.json(c);
  }
  const list = await prisma.conversation.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 30, include: { _count: { select: { messages: true } } } });
  return NextResponse.json(list);
}
