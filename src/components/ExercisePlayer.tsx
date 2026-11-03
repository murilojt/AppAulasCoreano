"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Exercise, VocabItem } from "@/content/types";
import { matchesAny, normalize, similarity } from "@/lib/korean";
import { speakKo, sttSupported, useRecognizer } from "@/lib/speech";
import SpeakerButton from "./SpeakerButton";
import SpeechNotice from "./SpeechNotice";

export type PlayerResult = {
  correct: number; total: number; heartsLost: number; failed: boolean;
  mistakes: VocabItem[]; results: { ko: string; correct: boolean }[];
};
type Mode = "lesson" | "review" | "simulado";
type Status = "idle" | "right" | "wrong";
type Item = { ex: Exercise; retry: boolean; id: number };
type CheckFn = (ok: boolean, correctText: string, extra?: string) => void;

const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

export default function ExercisePlayer({ exercises, mode, initialHearts, onComplete, onExit }: {
  exercises: Exercise[]; mode: Mode; initialHearts: number; onComplete: (r: PlayerResult) => void; onExit: () => void;
}) {
  const [queue, setQueue] = useState<Item[]>(() => exercises.map((ex, i) => ({ ex, retry: false, id: i })));
  const [idx, setIdx] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [feedback, setFeedback] = useState({ correctText: "", extra: "" });
  const [hearts, setHearts] = useState(initialHearts);
  const stats = useRef({ correct: 0, total: exercises.length, heartsLost: 0, mistakes: [] as VocabItem[], results: [] as { ko: string; correct: boolean }[] });
  const finished = useRef(false);
  const usesHearts = mode === "lesson";
  const current = queue[idx];

  useEffect(() => {
    if (finished.current) return;
    if (idx >= queue.length) { finished.current = true; onComplete({ ...stats.current, failed: false }); }
  }, [idx, queue.length, onComplete]);

  const onCheck: CheckFn = (ok, correctText, extra = "") => {
    if (status !== "idle" || !current) return;
    setFeedback({ correctText, extra });
    setStatus(ok ? "right" : "wrong");
    const rev = current.ex.type !== "match" ? (current.ex as { review?: VocabItem }).review : undefined;
    if (!current.retry) {
      if (ok) stats.current.correct++;
      if (rev) stats.current.results.push({ ko: rev.ko, correct: ok });
    }
    if (!ok) {
      if (rev && !stats.current.mistakes.some((m) => m.ko === rev.ko)) stats.current.mistakes.push(rev);
      if (usesHearts) { stats.current.heartsLost++; setHearts((h) => Math.max(0, h - 1)); }
      if (!current.retry) setQueue((q) => [...q, { ex: current.ex, retry: true, id: 1000 + current.id }]);
    }
    const ex = current.ex;
    const say = ex.type === "listen" ? ex.ko : ex.type === "build" && ex.dir === "pt-ko" ? ex.ko : ex.type === "translate" && ex.direction === "pt-ko" ? ex.answer : "";
    if (say) setTimeout(() => speakKo(say), 250);
  };

  const skip = () => {
    stats.current.total = Math.max(1, stats.current.total - 1);
    setStatus("idle"); setIdx((i) => i + 1);
  };

  const next = () => {
    if (status === "idle") return;
    if (usesHearts && hearts <= 0) {
      finished.current = true;
      onComplete({ ...stats.current, failed: true });
      return;
    }
    setStatus("idle"); setIdx((i) => i + 1);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Enter" && status !== "idle" && (e.target as HTMLElement).tagName !== "BUTTON") next(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const pct = Math.min(100, Math.round((idx / queue.length) * 100));
  if (!current) return <div className="p-10 text-center text-slate-500">Finalizando…</div>;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-1rem)] max-w-2xl flex-col px-4 pb-44 pt-4">
      <div className="flex items-center gap-3">
        <button onClick={onExit} aria-label="Sair da lição" className="rounded-full p-2 text-2xl text-slate-400 hover:bg-slate-100">✕</button>
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-brand-500 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        {usesHearts && <div className="flex items-center gap-1 font-extrabold text-rose-500" aria-label={`${hearts} corações`}>❤️ {hearts}</div>}
      </div>
      {mode === "simulado" && current.ex.type === "mc" && current.ex.section && (
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-brand-500">{current.ex.section} · questão {Math.min(idx + 1, exercises.length)}/{exercises.length}</p>
      )}
      <div className="flex-1 pt-6" key={current.id}>
        <ExerciseView ex={current.ex} status={status} onCheck={onCheck} onSkip={skip} />
      </div>
      {status !== "idle" && (
        <div className={`fixed inset-x-0 bottom-0 z-30 animate-floatUp border-t-2 px-4 pb-6 pt-4 ${status === "right" ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
          <div className="mx-auto flex max-w-2xl items-center gap-4">
            <div className="flex-1">
              <p className={`text-lg font-extrabold ${status === "right" ? "text-emerald-700" : "text-rose-700"}`}>
                {status === "right" ? "🎉 Muito bem!" : "Quase lá!"}
              </p>
              {status === "wrong" && <p className="ko text-sm font-semibold text-rose-700">Resposta correta: {feedback.correctText}</p>}
              {feedback.extra && <p className="text-sm text-slate-600">{feedback.extra}</p>}
            </div>
            <button autoFocus onClick={next} className={`btn ${status === "right" ? "btn-primary" : "btn-danger"}`}>
              {usesHearts && hearts <= 0 ? "Ver resultado" : "Continuar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------- Exercícios --------------------

function ExerciseView({ ex, status, onCheck, onSkip }: { ex: Exercise; status: Status; onCheck: CheckFn; onSkip: () => void }) {
  switch (ex.type) {
    case "mc": return <MC ex={ex} status={status} onCheck={onCheck} />;
    case "build": return <Build ex={ex} status={status} onCheck={onCheck} />;
    case "listen": return <Listen ex={ex} status={status} onCheck={onCheck} onSkip={onSkip} />;
    case "translate": return <Translate ex={ex} status={status} onCheck={onCheck} />;
    case "match": return <Match ex={ex} status={status} onCheck={onCheck} />;
    case "speak": return <Speak ex={ex} status={status} onCheck={onCheck} onSkip={onSkip} />;
  }
}

function Title({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-5 text-xl font-extrabold text-slate-800 md:text-2xl">{children}</h2>;
}
const CheckButton = ({ disabled, onClick }: { disabled?: boolean; onClick: () => void }) => (
  <button disabled={disabled} onClick={onClick} className="btn btn-primary mt-6 w-full">Verificar</button>
);

function MC({ ex, status, onCheck }: { ex: Extract<Exercise, { type: "mc" }>; status: Status; onCheck: CheckFn }) {
  const [sel, setSel] = useState<number | null>(null);
  useEffect(() => { if (ex.speak) speakKo(ex.speak, 0.7); }, [ex.speak]);
  const pick = (i: number) => { if (status === "idle") setSel(i); };
  useEffect(() => {
    const h = (e: KeyboardEvent) => { const n = Number(e.key); if (n >= 1 && n <= ex.options.length && (e.target as HTMLElement).tagName !== "INPUT") pick(n - 1); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });
  return (
    <div>
      <Title>{ex.prompt}</Title>
      {(ex.ko || ex.speak) && (
        <div className="mb-6 flex items-center gap-4">
          {ex.speak && <SpeakerButton text={ex.speak} className="!h-14 !w-14 !text-2xl" />}
          {ex.speak && <SpeakerButton text={ex.speak} slow label="Ouvir devagar" className="!h-14 !w-14 !text-2xl" />}
          {ex.ko && !ex.hideKo && <span className="ko text-4xl font-black text-slate-900">{ex.ko}</span>}
        </div>
      )}
      <div className="space-y-3">
        {ex.options.map((o, i) => {
          const cls = status === "idle" ? (sel === i ? "opt-selected" : "") : i === ex.answer ? "opt-right" : sel === i ? "opt-wrong" : "opacity-60";
          return (
            <button key={i} disabled={status !== "idle"} onClick={() => pick(i)} className={`opt ko ${cls}`}>
              <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-lg border border-slate-300 text-xs text-slate-400">{i + 1}</span>{o}
            </button>
          );
        })}
      </div>
      {status === "idle" && <CheckButton disabled={sel === null} onClick={() => onCheck(sel === ex.answer, ex.options[ex.answer], ex.explain)} />}
    </div>
  );
}

function Build({ ex, status, onCheck }: { ex: Extract<Exercise, { type: "build" }>; status: Status; onCheck: CheckFn }) {
  const bank = useMemo(() => shuffle([...ex.answer, ...ex.extra].map((t, id) => ({ t, id }))), [ex]);
  const [picked, setPicked] = useState<number[]>([]);
  const korean = ex.dir === "pt-ko";
  const toggle = (id: number) => { if (status !== "idle") return; setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])); };
  const check = () => {
    const words = picked.map((id) => bank.find((b) => b.id === id)!.t);
    const ok = words.length === ex.answer.length && words.every((w, i) => normalize(w) === normalize(ex.answer[i]));
    onCheck(ok, ex.answer.join(" "), `${ex.ko} — ${ex.rom} — ${ex.pt}`);
  };
  return (
    <div>
      <Title>{ex.prompt}</Title>
      {!korean && <div className="mb-4 flex items-center gap-3"><SpeakerButton text={ex.ko} /><span className="ko text-2xl font-bold">{ex.ko}</span></div>}
      <div className={`flex min-h-[64px] flex-wrap gap-2 border-b-2 border-slate-200 pb-3 ${status === "wrong" ? "animate-shake" : ""}`}>
        {picked.map((id) => {
          const b = bank.find((x) => x.id === id)!;
          return <button key={id} onClick={() => toggle(id)} className={`opt !w-auto !py-2 ${korean ? "ko" : ""} ${status === "right" ? "opt-right" : ""}`}>{b.t}</button>;
        })}
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {bank.map((b) => (
          <button key={b.id} disabled={picked.includes(b.id) || status !== "idle"} onClick={() => toggle(b.id)} className={`opt !w-auto !py-2 ${korean ? "ko" : ""} ${picked.includes(b.id) ? "!bg-slate-100 !text-transparent" : ""}`}>{b.t}</button>
        ))}
      </div>
      {status === "idle" && <CheckButton disabled={picked.length === 0} onClick={check} />}
    </div>
  );
}

function Listen({ ex, status, onCheck, onSkip }: { ex: Extract<Exercise, { type: "listen" }>; status: Status; onCheck: CheckFn; onSkip: () => void }) {
  const [val, setVal] = useState("");
  useEffect(() => { const t = setTimeout(() => speakKo(ex.ko, 0.8), 300); return () => clearTimeout(t); }, [ex.ko]);
  const submit = () => { if (val.trim()) onCheck(matchesAny(val, ex.accept), ex.ko, `${ex.rom} — ${ex.pt}`); };
  return (
    <div>
      <Title>Ouça e escreva o que você ouviu</Title>
      <SpeechNotice compact />
      <div className="my-6 flex items-center gap-4">
        <SpeakerButton text={ex.ko} className="!h-20 !w-20 !text-4xl" />
        <SpeakerButton text={ex.ko} slow label="Ouvir devagar" className="!h-14 !w-14 !text-2xl" />
      </div>
      <input className="input ko" value={val} disabled={status !== "idle"} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && status === "idle" && submit()}
        placeholder="Digite em coreano ou em romanização" autoComplete="off" autoCapitalize="off" lang="ko" />
      {status === "idle" && (
        <>
          <CheckButton disabled={!val.trim()} onClick={submit} />
          <button onClick={onSkip} className="mt-3 w-full text-sm font-semibold text-slate-400 hover:text-slate-600">Não posso ouvir agora</button>
        </>
      )}
    </div>
  );
}

function Translate({ ex, status, onCheck }: { ex: Extract<Exercise, { type: "translate" }>; status: Status; onCheck: CheckFn }) {
  const [val, setVal] = useState("");
  const submit = () => {
    if (!val.trim()) return;
    let ok = matchesAny(val, ex.accept);
    if (!ok && ex.direction === "ko-pt") { const n = normalize(val); ok = n.length >= 6 && ex.accept.some((a) => similarity(n, a) >= 0.85); }
    onCheck(ok, ex.answer, ex.rom ? `Romanização: ${ex.rom}` : undefined);
  };
  return (
    <div>
      <Title>{ex.prompt}</Title>
      {ex.direction === "ko-pt" && <div className="mb-4"><SpeakerButton text={ex.prompt.split(": ").pop() ?? ""} /></div>}
      <input className="input ko" value={val} disabled={status !== "idle"} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && status === "idle" && submit()}
        placeholder={ex.direction === "pt-ko" ? "Escreva em Hangeul ou romanização" : "Escreva em português"} autoComplete="off" autoCapitalize="off" lang={ex.direction === "pt-ko" ? "ko" : "pt-BR"} />
      {ex.direction === "pt-ko" && <p className="mt-2 text-xs text-slate-400">Dica: sem teclado coreano? Pode digitar a romanização (ex.: annyeong).</p>}
      {status === "idle" && <CheckButton disabled={!val.trim()} onClick={submit} />}
    </div>
  );
}

function Match({ ex, status, onCheck }: { ex: Extract<Exercise, { type: "match" }>; status: Status; onCheck: CheckFn }) {
  const left = useMemo(() => shuffle(ex.pairs.map((p, i) => ({ t: p.ko, i }))), [ex]);
  const right = useMemo(() => shuffle(ex.pairs.map((p, i) => ({ t: p.pt, i }))), [ex]);
  const [selL, setSelL] = useState<number | null>(null);
  const [done, setDone] = useState<number[]>([]);
  const [wrongFlash, setWrongFlash] = useState<string | null>(null);
  const errors = useRef(0);
  const finish = (d: number[]) => { if (d.length === ex.pairs.length) onCheck(errors.current <= 2, ex.pairs.map((p) => `${p.ko} = ${p.pt}`).join("; ")); };
  const pickRight = (i: number) => {
    if (selL === null || done.includes(i)) return;
    if (selL === i) { const d = [...done, i]; setDone(d); setSelL(null); finish(d); }
    else { errors.current++; setWrongFlash(`${selL}-${i}`); setTimeout(() => setWrongFlash(null), 450); setSelL(null); }
  };
  return (
    <div>
      <Title>Toque nos pares correspondentes</Title>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-3">
          {left.map((l) => (
            <button key={l.i} disabled={done.includes(l.i) || status !== "idle"} onClick={() => setSelL(l.i)}
              className={`opt ko ${done.includes(l.i) ? "opt-right !opacity-50" : selL === l.i ? "opt-selected" : ""}`}>{l.t}</button>
          ))}
        </div>
        <div className="space-y-3">
          {right.map((r) => (
            <button key={r.i} disabled={done.includes(r.i) || status !== "idle"} onClick={() => pickRight(r.i)}
              className={`opt text-sm ${done.includes(r.i) ? "opt-right !opacity-50" : wrongFlash?.endsWith(`-${r.i}`) ? "opt-wrong" : ""}`}>{r.t}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Speak({ ex, status, onCheck, onSkip }: { ex: Extract<Exercise, { type: "speak" }>; status: Status; onCheck: CheckFn; onSkip: () => void }) {
  const rec = useRecognizer();
  const [heard, setHeard] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const supported = typeof window !== "undefined" && sttSupported();

  const start = async () => {
    const text = await rec.listen();
    if (!text) return;
    setHeard(text);
    const s = Math.round(similarity(text, ex.ko) * 100);
    setScore(s);
    const n = attempts + 1;
    setAttempts(n);
    if (s >= 65) onCheck(true, ex.ko, `Você disse: ${text} (${s}% de similaridade) · ${ex.rom} — ${ex.pt}`);
    else if (n >= 3) onCheck(false, ex.ko, `Você disse: ${text} (${s}%) · ${ex.rom} — ${ex.pt}`);
  };

  return (
    <div>
      <Title>Fale esta frase em voz alta</Title>
      <SpeechNotice compact />
      <div className="card my-4 text-center">
        <p className="ko text-3xl font-black">{ex.ko}</p>
        <p className="mt-1 text-slate-500">{ex.rom}</p>
        <p className="text-sm text-slate-400">{ex.pt}</p>
        <div className="mt-3 flex justify-center gap-3"><SpeakerButton text={ex.ko} /><SpeakerButton text={ex.ko} slow label="Ouvir devagar" /></div>
      </div>
      {status === "idle" && (
        <div className="flex flex-col items-center gap-3">
          {supported && (
            <button onClick={start} disabled={rec.listening} aria-label="Gravar minha fala"
              className={`flex h-20 w-20 items-center justify-center rounded-full bg-brand-500 text-3xl text-white shadow-lg ${rec.listening ? "animate-pulseRing" : "hover:bg-brand-400"}`}>🎤</button>
          )}
          <p className="min-h-[1.5rem] text-center text-sm text-slate-500" aria-live="polite">
            {rec.listening ? (rec.interim ? `Ouvindo: ${rec.interim}` : "Ouvindo… fale agora") : supported ? "Toque no microfone e fale" : ""}
          </p>
          {rec.error && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">{rec.error}</p>}
          {score !== null && score < 65 && (
            <p className="animate-shake rounded-xl bg-rose-50 px-3 py-2 text-center text-sm text-rose-700">
              Entendi: “{heard}” ({score}%). Tente de novo, devagar! ({attempts}/3)
            </p>
          )}
          <button onClick={onSkip} className="text-sm font-semibold text-slate-400 hover:text-slate-600">Não posso falar agora</button>
        </div>
      )}
    </div>
  );
}
