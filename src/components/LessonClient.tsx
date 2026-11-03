"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Exercise } from "@/content/types";
import ExercisePlayer, { PlayerResult } from "./ExercisePlayer";
import { ACHIEVEMENT_INFO } from "@/lib/achievementInfo";

type Summary = { completed: boolean; score?: number; xp: number; streak?: number; hearts: number; newAchievements: { key: string; title: string; desc: string; icon: string }[] };

export default function LessonClient({ lessonKey, title, kind, exercises, hearts, nextHeartMin }: {
  lessonKey: string; title: string; kind: string; exercises: Exercise[]; hearts: number; nextHeartMin: number;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [res, setRes] = useState<PlayerResult | null>(null);
  const [error, setError] = useState("");
  useEffect(() => setMounted(true), []);
  const mode = kind === "simulado" ? "simulado" : "lesson";

  const complete = useCallback(async (r: PlayerResult) => {
    setRes(r);
    try {
      const resp = await fetch("/api/lessons/complete", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: lessonKey, correct: r.correct, total: r.total, heartsLost: r.heartsLost, failed: r.failed, mistakes: r.mistakes }),
      });
      if (!resp.ok) throw new Error();
      setSummary(await resp.json());
    } catch { setError("Não foi possível salvar seu progresso. Verifique a conexão."); }
  }, [lessonKey]);

  if (!mounted) return null;

  if (hearts <= 0 && mode === "lesson") {
    return (
      <Center>
        <div className="text-6xl">💔</div>
        <h1 className="mt-4 text-2xl font-extrabold">Você está sem corações</h1>
        <p className="mt-2 text-slate-600">Um coração volta em cerca de {nextHeartMin} min. Ou faça uma revisão para recuperar um agora!</p>
        <div className="mt-6 flex justify-center gap-3"><Link href="/revisao" className="btn btn-primary">Fazer revisão</Link><Link href="/trilha" className="btn btn-ghost">Voltar</Link></div>
      </Center>
    );
  }

  if (res) {
    if (error) return <Center><p className="text-rose-600">{error}</p><Link href="/trilha" className="btn btn-ghost mt-4">Voltar à trilha</Link></Center>;
    if (!summary) return <Center><p className="text-slate-500">Salvando seu progresso…</p></Center>;
    if (!summary.completed) {
      return (
        <Center>
          <div className="text-6xl">💔</div>
          <h1 className="mt-4 text-2xl font-extrabold">Acabaram seus corações</h1>
          <p className="mt-2 text-slate-600">As palavras que você errou foram para a revisão. Treine por lá e volte com tudo!</p>
          <div className="mt-6 flex justify-center gap-3"><Link href="/revisao" className="btn btn-primary">Revisar agora</Link><Link href="/trilha" className="btn btn-ghost">Trilha</Link></div>
        </Center>
      );
    }
    const pct = summary.score ?? 0;
    return (
      <Center>
        <div className="animate-pop text-7xl">{pct === 100 ? "🏆" : pct >= 70 ? "🎉" : "💪"}</div>
        <h1 className="mt-4 text-3xl font-black">{kind === "simulado" ? "Simulado concluído!" : "Lição concluída!"}</h1>
        <p className="text-slate-500">{title}</p>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="XP" value={`+${summary.xp}`} cls="text-amber-500" />
          <Stat label="Acertos" value={`${pct}%`} cls="text-emerald-600" />
          <Stat label="Ofensiva" value={`🔥 ${summary.streak ?? 0}`} cls="text-orange-500" />
        </div>
        {kind === "simulado" && <p className="mt-4 rounded-xl bg-brand-50 p-3 text-sm text-brand-700">Você acertou {res.correct} de {res.total} questões. {res.correct >= 28 ? "Excelente! Hora da conversa final com o tutor." : "Revise as unidades mais difíceis e tente de novo."}</p>}
        {res.mistakes.length > 0 && <p className="mt-4 text-sm text-slate-500">{res.mistakes.length} palavra(s) foram para a sua revisão espaçada.</p>}
        {summary.newAchievements.length > 0 && (
          <div className="mt-6 space-y-2">
            <p className="text-sm font-bold uppercase tracking-wide text-brand-600">Nova conquista!</p>
            {summary.newAchievements.map((a) => (
              <div key={a.key} className="card animate-pop flex items-center gap-3 text-left"><span className="text-3xl">{ACHIEVEMENT_INFO[a.key]?.icon ?? a.icon}</span><div><p className="font-bold">{a.title}</p><p className="text-sm text-slate-500">{a.desc}</p></div></div>
            ))}
          </div>
        )}
        <div className="mt-8 flex justify-center gap-3">
          <button onClick={() => { router.push("/trilha"); router.refresh(); }} className="btn btn-primary">Continuar</button>
        </div>
      </Center>
    );
  }

  return <ExercisePlayer exercises={exercises} mode={mode} initialHearts={hearts} onComplete={complete} onExit={() => { if (confirm("Sair agora? Você perde o progresso desta lição.")) router.push("/trilha"); }} />;
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">{children}</div>;
}
function Stat({ label, value, cls }: { label: string; value: string; cls: string }) {
  return <div className="card !p-3"><p className={`text-2xl font-black ${cls}`}>{value}</p><p className="text-xs font-bold uppercase text-slate-400">{label}</p></div>;
}
