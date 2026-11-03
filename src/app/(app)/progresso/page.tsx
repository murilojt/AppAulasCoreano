import Link from "next/link";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserState, todayStr } from "@/lib/game";
import { ACHIEVEMENTS } from "@/lib/game-defs";
import { LEVELS } from "@/content";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const userId = (await getSessionUserId())!;
  const user = (await getUserState(userId))!;
  const [lessons, progress, unlocked, reviews, weak, convs, activity] = await Promise.all([
    prisma.lesson.findMany({ select: { key: true, level: true, kind: true } }),
    prisma.lessonProgress.findMany({ where: { userId } }),
    prisma.achievement.findMany({ where: { userId } }),
    prisma.wordReview.findMany({ where: { userId } }),
    prisma.wordReview.findMany({ where: { userId, lapses: { gt: 0 } }, orderBy: { lapses: "desc" }, take: 6 }),
    prisma.conversation.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10, include: { _count: { select: { messages: true } } } }),
    prisma.dailyActivity.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 14 }),
  ]);
  const doneKeys = new Set(progress.map((p) => p.lessonKey));
  const have = new Set(unlocked.map((a) => a.key));
  const mastered = reviews.filter((r) => r.box >= 4).length;
  const avg = progress.length ? Math.round(progress.reduce((s, p) => s + p.bestScore, 0) / progress.length) : 0;

  const days: { date: string; xp: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = todayStr(new Date(Date.now() - i * 86400000));
    days.push({ date: d, xp: activity.find((a) => a.date === d)?.xp ?? 0 });
  }
  const maxXp = Math.max(30, ...days.map((d) => d.xp));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-black">Seu progresso</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["⭐", user.xp, "XP total"], ["🔥", user.streak, "Dias seguidos"], ["🏅", user.bestStreak, "Melhor ofensiva"], ["🎯", `${avg}%`, "Média de acertos"],
          ["📗", `${progress.length}/${lessons.length}`, "Lições feitas"], ["🔁", reviews.length, "Palavras na revisão"], ["🧠", mastered, "Palavras dominadas"], ["💬", convs.length, "Conversas"],
        ].map(([i, v, l]) => (
          <div key={String(l)} className="card !p-4 text-center"><p className="text-2xl">{i}</p><p className="text-2xl font-black text-slate-800">{v}</p><p className="text-xs font-semibold text-slate-400">{l}</p></div>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between"><p className="font-bold">Nível {user.level}</p><p className="text-sm text-slate-500">{user.into}/{user.size} XP para o nível {user.level + 1}</p></div>
        <div className="mt-2 h-4 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(user.into / user.size) * 100}%` }} /></div>
      </div>

      <section>
        <h2 className="mb-3 font-bold">Por nível</h2>
        <div className="space-y-3">
          {LEVELS.map((l) => {
            const ls = lessons.filter((x) => x.level === l.level && x.kind === "lesson");
            const d = ls.filter((x) => doneKeys.has(x.key)).length;
            return (
              <div key={l.level} className="card !p-4">
                <div className="flex justify-between text-sm"><span className="font-bold">Nível {l.level} · {l.name}</span><span className="text-slate-500">{d}/{ls.length} · {l.topik}</span></div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${ls.length ? (d / ls.length) * 100 : 0}%` }} /></div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-bold">XP nos últimos 14 dias</h2>
        <div className="card flex h-40 items-end gap-1.5" role="img" aria-label="Gráfico de XP por dia">
          {days.map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${d.date}: ${d.xp} XP`}>
              <div className="w-full rounded-t-md bg-brand-400" style={{ height: `${(d.xp / maxXp) * 100}%`, minHeight: d.xp ? 4 : 2, opacity: d.xp ? 1 : 0.2 }} />
              <span className="text-[9px] text-slate-400">{d.date.slice(8)}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-bold">Conquistas ({have.size}/{ACHIEVEMENTS.length})</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {ACHIEVEMENTS.map((a) => (
            <div key={a.key} className={`card flex items-center gap-3 !p-3 ${have.has(a.key) ? "" : "opacity-45 grayscale"}`}>
              <span className="text-3xl">{a.icon}</span><div><p className="font-bold">{a.title}</p><p className="text-xs text-slate-500">{a.desc}</p></div>
            </div>
          ))}
        </div>
      </section>

      {weak.length > 0 && (
        <section>
          <h2 className="mb-3 font-bold">Palavras mais difíceis</h2>
          <div className="card divide-y divide-slate-100 !p-0">
            {weak.map((w) => (
              <div key={w.id} className="flex items-center justify-between px-4 py-3"><span><span className="ko text-lg font-bold">{w.ko}</span> <span className="text-sm text-slate-400">{w.rom}</span></span><span className="text-sm text-slate-500">{w.pt} · {w.lapses}×</span></div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-bold">Histórico de conversas</h2>
        {convs.length === 0 ? <p className="text-sm text-slate-500">Nenhuma conversa ainda. <Link href="/conversa" className="font-semibold text-brand-600">Comece uma!</Link></p> : (
          <div className="card divide-y divide-slate-100 !p-0">
            {convs.map((c) => (
              <Link key={c.id} href={`/conversa?id=${c.id}${c.scenario === "final" ? "&cenario=final" : ""}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                <span className="ko font-semibold">{c.title}</span><span className="text-xs text-slate-400">{c.createdAt.toLocaleDateString("pt-BR")} · {c._count.messages} msgs</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
