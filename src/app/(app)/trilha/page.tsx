import Link from "next/link";
import { getSessionUserId } from "@/lib/auth";
import { getPath, PathLesson } from "@/lib/path";
import { LEVELS, PLANNED_LEVELS } from "@/content";

export const dynamic = "force-dynamic";
const OFFSETS = [0, 36, 56, 36, 0, -36, -56, -36];

function Node({ l, i }: { l: PathLesson; i: number }) {
  const locked = l.status === "locked";
  const icon = l.kind === "simulado" ? "🎓" : l.status === "done" ? "✓" : locked ? "🔒" : "★";
  const cls = l.status === "done" ? "bg-brand-500 text-white shadow-[0_6px_0_0_#5624a8]" : locked ? "bg-slate-200 text-slate-400 shadow-[0_6px_0_0_#cbd5e1]" : "bg-amber-400 text-white shadow-[0_6px_0_0_#d97706] animate-pulseRing";
  const inner = (
    <div className="relative flex flex-col items-center" style={{ transform: `translateX(${OFFSETS[i % OFFSETS.length]}px)` }}>
      {l.status === "current" && <span className="mb-1 animate-pop rounded-xl border-2 border-amber-400 bg-white px-3 py-1 text-xs font-extrabold uppercase text-amber-600">Começar</span>}
      <div className={`flex h-[68px] w-[68px] items-center justify-center rounded-full text-3xl font-black transition active:translate-y-1 ${cls}`}>{icon}</div>
      <span className="mt-2 max-w-[150px] text-center text-xs font-semibold text-slate-500">{l.title}{l.status === "done" && <span className="block text-emerald-600">{l.bestScore}%</span>}</span>
    </div>
  );
  return locked ? <div aria-disabled="true" title="Conclua a lição anterior">{inner}</div> : <Link href={`/licao/${l.key}`}>{inner}</Link>;
}

export default async function TrailPage() {
  const userId = (await getSessionUserId())!;
  const path = await getPath(userId);
  const done = path.filter((p) => p.status === "done").length;
  const sim = path.find((p) => p.kind === "simulado");

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div><h1 className="text-2xl font-black">Sua trilha</h1><p className="text-sm text-slate-500">{done} de {path.length} lições concluídas</p></div>
        <Link href="/sobre" className="text-sm font-semibold text-brand-600">Como funciona?</Link>
      </div>

      {LEVELS.map((level) => (
        <section key={level.level} className="mb-12">
          <div className="mb-6 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-400 p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-100">Nível {level.level}</p>
            <h2 className="text-xl font-black">{level.name}</h2>
            <p className="mt-1 text-sm text-brand-50">{level.curriculum}</p>
            <span className="mt-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold">{level.topik}</span>
          </div>
          {level.units.map((unit) => {
            const lessons = path.filter((p) => p.level === level.level && p.unit === unit.unit && p.kind === "lesson");
            if (!lessons.length) return null;
            return (
              <div key={unit.unit} className="mb-10">
                <div className="mx-auto mb-5 max-w-md rounded-2xl border-2 border-brand-200 bg-white p-4 text-center">
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-500">{level.level === 0 ? `Hangeul · parte ${unit.unit}` : `Unidade ${unit.unit}`}</p>
                  <h3 className="text-lg font-extrabold">{unit.theme}</h3>
                  <p className="text-sm text-slate-500">{unit.objectives[0]}</p>
                  <p className="mt-2 text-[11px] font-semibold text-slate-400">Equivale a: {level.level === 0 ? "pré-nível (Hangeul)" : `currículo padrão nível ${level.level}`} · {level.topik}</p>
                </div>
                <div className="flex flex-col items-center gap-6">{lessons.map((l, i) => <Node key={l.key} l={l} i={i} />)}</div>
              </div>
            );
          })}
        </section>
      ))}

      <section className="mb-12">
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-400 p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-100">Revisão final</p>
          <h2 className="text-xl font-black">Simulado e conversa final</h2>
          <p className="mt-1 text-sm text-amber-50">Teste tudo das unidades 1 a 16 e conclua conversando com o tutor.</p>
        </div>
        <div className="flex flex-col items-center gap-6">
          {sim && <Node l={{ ...sim, title: "Simulado TOPIK I (40 questões)" }} i={0} />}
          <Link href="/conversa?cenario=final" className="flex flex-col items-center" style={{ transform: "translateX(36px)" }}>
            <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-emerald-500 text-3xl text-white shadow-[0_6px_0_0_#047857]">💬</div>
            <span className="mt-2 max-w-[160px] text-center text-xs font-semibold text-slate-500">Conversa final com o tutor</span>
          </Link>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">Em breve · TOPIK II</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {PLANNED_LEVELS.map((p) => (
            <div key={p.level} className="rounded-2xl border-2 border-dashed border-slate-200 p-4 text-slate-400"><p className="font-bold">🔒 Nível {p.level} · {p.name}</p><p className="text-xs">{p.topik}</p></div>
          ))}
        </div>
      </section>
    </div>
  );
}
