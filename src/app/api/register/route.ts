import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(60),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(6, "A senha precisa ter ao menos 6 caracteres").max(100),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { name, email, password } = parsed.data;
  if (await prisma.user.findUnique({ where: { email } })) return NextResponse.json({ error: "Este e-mail já está cadastrado" }, { status: 409 });
  await prisma.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 10) } });
  return NextResponse.json({ ok: true });
}
