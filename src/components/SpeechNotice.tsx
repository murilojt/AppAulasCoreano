"use client";
import { useState } from "react";
import { useSpeechSupport } from "@/lib/speech";

/** Aviso amigável quando o navegador não suporta voz. */
export default function SpeechNotice({ compact = false }: { compact?: boolean }) {
  const s = useSpeechSupport();
  const [hide, setHide] = useState(false);
  if (!s.ready || hide) return null;
  const msgs: string[] = [];
  if (!s.stt) msgs.push("seu navegador não reconhece fala (exercícios de pronúncia e conversa por voz ficam limitados)");
  if (!s.tts) msgs.push("seu navegador não fala em voz alta");
  else if (!s.koVoice) msgs.push("não encontramos uma voz coreana instalada no seu sistema");
  if (!msgs.length) return null;
  return (
    <div role="status" className={`flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 ${compact ? "" : "mb-4"}`}>
      <span aria-hidden>🎧</span>
      <p className="flex-1">Ops: {msgs.join("; ")}. Para a melhor experiência com voz, use o <strong>Google Chrome</strong> ou o <strong>Microsoft Edge</strong> atualizados. Você ainda pode usar o app digitando.</p>
      <button onClick={() => setHide(true)} className="font-bold" aria-label="Fechar aviso">✕</button>
    </div>
  );
}
