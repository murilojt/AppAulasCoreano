"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Exercise } from "@/content/types";
import ExercisePlayer, { PlayerResult } from "./ExercisePlayer";

type Data = { exercises: Exercise[]; dueCount: number; total: number; nextDue: string | null };

export default function ReviewClient() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState<{ xp: number; hearts?: number; right: number; total: number } | null>(null);

  const load = useCallback(async () => { const r = await fetch("/api/review", { cache: "no-store" }); setData(await r.json()); }, []);
  useEffect(() => { load(); }, [load]);

  const complete = useCallback(async (r: PlayerResult) => {
    const resp = await fetch("/api/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ results: r.results }) });
    const j = await resp.json();
    setDone({ xp: j.xp, hearts: j.hearts, right: r.correct, total: r.total });
    setPlaying(false);
  }, []);

  if (!data) return <p className="p-10 text-center text-slate-500">Carregando…</p>;

  if (playing) {
    return (
      <div className="fixed inset-0 z-40 overflow-y-auto bg-brand-50">
        <ExercisePlayer exercises={data.exercises} mode="review" initialHearts={5} onComplete={complete} onExit={() => setPlaying(false)} />
      </div>
    );
  }

  if (done) {
    return (
      <div className="card animate-pop mx-auto mt-10 max-w-md text-center">
        <div className="text-6xl">🧠</div>
        <h1 className="mt-3 text-2xl font-black">Revisão concluída!</h1>
        <p className="mt-2 text-slate-600">Você acertou {done.right} de {done.total}. +{done.xp} XP{done.hearts !== undefined ? " e 1 coração recuperado ❤️" : ""}.</p>
        <button onClick={() => { setDone(null); load(); router.refresh(); }} className="btn btn-primary mt-6">Continuar</button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-black">Revisão espaçada</h1>
      <p className="mt-1 text-sm text-slate-500">As palavras que você erra voltam aqui em intervalos crescentes (10 min, 1, 2, 4, 8, 16 e 32 dias) para fixar na memória.</p>
      <div className="card mt-6 text-center">
        {data.dueCount > 0 ? (
          <>
            <p className="text-5xl font-black text-brand-500">{data.dueCount}</p>
            <p className="text-slate-600">palavra(s) para revisar agora</p>
            <button className="btn btn-primary mt-5" onClick={() => setPlaying(true)}>Começar revisão</button>
            <p className="mt-3 text-xs text-slate-400">Cada sessão traz até 10 palavras e devolve 1 coração.</p>
          </>
        ) : (
          <>
            <p className="text-5xl">✨</p>
            <p className="mt-2 font-bold">Nada para revisar agora!</p>
            <p className="text-sm text-slate-500">{data.total === 0 ? "Quando você errar palavras nas lições, elas aparecerão aqui." : data.nextDue ? `Próxima revisão: ${new Date(data.nextDue).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}` : "Você está em dia."}</p>
            <Link href="/trilha" className="btn btn-ghost mt-5">Voltar à trilha</Link>
          </>
        )}
      </div>
    </div>
  );
}
