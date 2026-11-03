"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { speakKo, sttSupported, useRecognizer } from "@/lib/speech";
import SpeakerButton from "./SpeakerButton";
import SpeechNotice from "./SpeechNotice";

type Correction = { kind: string; you_said: string; correct: string; correct_rom: string; correct_pt: string; explanation: string };
type Tutor = {
  reply: { ko: string; rom: string; pt: string }; corrections: Correction[];
  pronunciation: { score: number | null; feedback: string }; encouragement: string; goals: { id: string; done: boolean }[];
};
type Msg = { role: "user"; text: string; expected?: string } | { role: "tutor"; tutor: Tutor };
type Hist = { id: string; title: string; scenario: string; createdAt: string; _count: { messages: number } };

const GOALS = [
  { id: "apresentar", label: "Apresentar-se (nome, nacionalidade)" },
  { id: "fim-de-semana", label: "Contar o que fez no fim de semana" },
  { id: "convidar", label: "Convidar alguém para um show do BTS" },
];
const HINTS_FREE = ["안녕하세요! 저는 아미예요.", "저는 BTS 노래를 좋아해요.", "오늘 뭐 해요?"];
const HINTS_FINAL = ["안녕하세요! 저는 브라질 사람이에요.", "주말에 친구를 만났어요.", "같이 BTS 콘서트에 갈까요?"];

export default function ConversationClient({ scenario, initialId }: { scenario: "livre" | "final"; initialId?: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [convId, setConvId] = useState<string | undefined>(initialId);
  const [input, setInput] = useState("");
  const [expected, setExpected] = useState("");
  const [showExpected, setShowExpected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [history, setHistory] = useState<Hist[]>([]);
  const [goals, setGoals] = useState<Record<string, boolean>>({});
  const rec = useRecognizer();
  const endRef = useRef<HTMLDivElement>(null);
  const supported = typeof window !== "undefined" && sttSupported();

  const loadHistory = useCallback(async () => { try { setHistory(await (await fetch("/api/conversations")).json()); } catch { /* */ } }, []);
  useEffect(() => { loadHistory(); }, [loadHistory]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  useEffect(() => {
    if (!initialId) return;
    (async () => {
      const r = await fetch(`/api/conversations?id=${initialId}`);
      if (!r.ok) return;
      const c = await r.json();
      const ms: Msg[] = [];
      let g: Record<string, boolean> = {};
      for (const m of c.messages as { role: string; content: string }[]) {
        try {
          if (m.role === "user") { const u = JSON.parse(m.content); ms.push({ role: "user", text: u.text, expected: u.expected }); }
          else { const t = JSON.parse(m.content) as Tutor; ms.push({ role: "tutor", tutor: t }); if (t.goals?.length) g = Object.fromEntries(t.goals.map((x) => [x.id, x.done])); }
        } catch { /* */ }
      }
      setMessages(ms); setGoals(g);
    })();
  }, [initialId]);

  async function send(text: string, exp?: string) {
    const t = text.trim();
    if (!t || busy) return;
    setError(""); setBusy(true);
    setMessages((m) => [...m, { role: "user", text: t, expected: exp }]);
    setInput("");
    try {
      const r = await fetch("/api/conversation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: convId, text: t, expected: exp || undefined, scenario }) });
      const j = await r.json();
      if (!r.ok) { setError(j.error ?? "Erro ao falar com o tutor"); return; }
      setConvId(j.conversationId);
      setMessages((m) => [...m, { role: "tutor", tutor: j.tutor }]);
      if (j.tutor.goals?.length) setGoals(Object.fromEntries(j.tutor.goals.map((x: { id: string; done: boolean }) => [x.id, x.done])));
      if (autoSpeak) speakKo(j.tutor.reply.ko);
      loadHistory();
    } catch { setError("Sem conexão com o servidor."); }
    finally { setBusy(false); }
  }

  async function mic() {
    const text = await rec.listen();
    if (text) send(text, expected.trim() || undefined);
  }

  const hints = scenario === "final" ? HINTS_FINAL : HINTS_FREE;
  const allDone = scenario === "final" && GOALS.every((g) => goals[g.id]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
      <div className="flex min-h-[70vh] flex-col">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-black">{scenario === "final" ? "Conversa final" : "Modo conversa"}</h1>
            <p className="text-sm text-slate-500">Fale em coreano com a tutora Minji (민지). Ela corrige com carinho e responde em voz alta.</p>
          </div>
          <label className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-500"><input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} /> Voz</label>
        </div>
        <SpeechNotice />

        {scenario === "final" && (
          <div className="card mb-3 !p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-500">Objetivos</p>
            <ul className="mt-2 space-y-1 text-sm">
              {GOALS.map((g) => <li key={g.id} className={goals[g.id] ? "font-semibold text-emerald-600" : "text-slate-600"}>{goals[g.id] ? "✅" : "⬜"} {g.label}</li>)}
            </ul>
            {allDone && <p className="mt-2 animate-pop rounded-xl bg-emerald-50 p-2 text-sm font-bold text-emerald-700">🎉 Parabéns! Você completou a conversa final!</p>}
          </div>
        )}

        <div className="flex-1 space-y-4 pb-4">
          {messages.length === 0 && (
            <div className="card text-center">
              <p className="ko text-2xl font-bold">안녕하세요! 저는 민지예요.</p>
              <p className="text-sm text-slate-500">annyeonghaseyo! jeoneun minjiyeyo. — Olá! Eu sou a Minji.</p>
              <p className="mt-3 text-sm text-slate-600">{scenario === "final" ? "Comece se apresentando: nome e nacionalidade." : "Toque no microfone e diga algo, ou escolha uma sugestão:"}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {hints.map((h) => <button key={h} className="ko rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-sm text-brand-700 hover:bg-brand-100" onClick={() => setInput(h)}>{h}</button>)}
              </div>
            </div>
          )}
          {messages.map((m, i) => m.role === "user" ? (
            <div key={i} className="flex justify-end"><div className="ko max-w-[85%] animate-floatUp rounded-2xl rounded-br-sm bg-brand-500 px-4 py-2 text-white">{m.text}{m.expected && <p className="mt-1 text-xs text-brand-100">Meta: {m.expected}</p>}</div></div>
          ) : <TutorCard key={i} t={m.tutor} />)}
          {busy && <p className="animate-pulse text-sm text-slate-400">Minji está pensando…</p>}
          <div ref={endRef} />
        </div>

        {error && <p role="alert" className="mb-2 animate-shake rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        {rec.error && <p className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">{rec.error}</p>}

        <div className="sticky bottom-20 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg md:bottom-4">
          {showExpected && <input className="input ko mb-2 !py-2 text-sm" value={expected} onChange={(e) => setExpected(e.target.value)} placeholder="Frase que você quer pronunciar (ex.: 저는 학생이에요)" lang="ko" />}
          <div className="flex items-center gap-2">
            <button onClick={mic} disabled={busy || rec.listening || !supported} aria-label="Falar em coreano" title={supported ? "Falar" : "Reconhecimento de voz indisponível neste navegador"}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xl text-white disabled:opacity-40 ${rec.listening ? "animate-pulseRing" : ""}`}>🎤</button>
            <input className="input ko !py-3" value={rec.listening ? rec.interim : input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(input, expected.trim() || undefined)}
              placeholder={rec.listening ? "Ouvindo…" : "Fale ou digite em coreano"} disabled={rec.listening} lang="ko" />
            <button onClick={() => send(input, expected.trim() || undefined)} disabled={busy || !input.trim()} className="btn btn-primary !px-4">Enviar</button>
          </div>
          <button className="mt-2 text-xs font-semibold text-slate-400 hover:text-slate-600" onClick={() => setShowExpected((s) => !s)}>{showExpected ? "Ocultar" : "＋ Praticar a pronúncia de uma frase específica"}</button>
        </div>
      </div>

      <aside className="space-y-3">
        <div className="card !p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Histórico</p>
          <div className="mt-2 space-y-1">
            {history.length === 0 && <p className="text-sm text-slate-400">Suas conversas aparecerão aqui.</p>}
            {history.slice(0, 8).map((h) => (
              <a key={h.id} href={`/conversa?id=${h.id}${h.scenario === "final" ? "&cenario=final" : ""}`} className="block rounded-xl px-2 py-1 text-sm hover:bg-slate-50">
                <span className="ko line-clamp-1 font-semibold">{h.title}</span>
                <span className="text-xs text-slate-400">{new Date(h.createdAt).toLocaleDateString("pt-BR")} · {h._count.messages} msgs</span>
              </a>
            ))}
          </div>
        </div>
        <a href="/conversa" className="btn btn-ghost w-full">Nova conversa</a>
        {scenario !== "final" && <a href="/conversa?cenario=final" className="btn btn-primary w-full">Conversa final</a>}
      </aside>
    </div>
  );
}

function TutorCard({ t }: { t: Tutor }) {
  return (
    <div className="flex animate-floatUp justify-start">
      <div className="max-w-[92%] space-y-3 rounded-2xl rounded-bl-sm border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <SpeakerButton text={t.reply.ko} />
          <div>
            <p className="ko text-lg font-bold">{t.reply.ko}</p>
            <p className="text-sm text-slate-500">{t.reply.rom}</p>
            <p className="text-sm text-slate-600">{t.reply.pt}</p>
          </div>
        </div>
        {t.pronunciation.score !== null && (
          <div className="rounded-xl bg-sky-50 p-3 text-sm">
            <p className="font-bold text-sky-800">🎙️ Pronúncia: {t.pronunciation.score}%</p>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-sky-100"><div className={`h-full ${t.pronunciation.score >= 80 ? "bg-emerald-500" : t.pronunciation.score >= 60 ? "bg-amber-400" : "bg-rose-400"}`} style={{ width: `${t.pronunciation.score}%` }} /></div>
            {t.pronunciation.feedback && <p className="mt-1 text-sky-900">{t.pronunciation.feedback}</p>}
          </div>
        )}
        {t.corrections.length > 0 && (
          <div className="space-y-2">
            {t.corrections.map((c, i) => (
              <div key={i} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
                <p className="text-xs font-bold uppercase text-amber-700">{c.kind}</p>
                {c.you_said && <p className="ko text-rose-600 line-through">{c.you_said}</p>}
                <p className="ko flex items-center gap-2 font-bold text-emerald-700">{c.correct} {c.correct && <SpeakerButton text={c.correct} className="!h-7 !w-7 !text-sm" />}</p>
                <p className="text-slate-500">{c.correct_rom} — {c.correct_pt}</p>
                <p className="mt-1 text-slate-700">{c.explanation}</p>
              </div>
            ))}
          </div>
        )}
        {t.encouragement && <p className="text-sm font-semibold text-brand-600">💜 {t.encouragement}</p>}
      </div>
    </div>
  );
}
