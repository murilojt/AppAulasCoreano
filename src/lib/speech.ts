"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
const w = () => (typeof window === "undefined" ? ({} as any) : (window as any));

export function ttsSupported() { return typeof window !== "undefined" && "speechSynthesis" in window; }
export function sttSupported() { const x = w(); return !!(x.SpeechRecognition || x.webkitSpeechRecognition); }

function koVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang === "ko-KR") ?? voices.find((v) => v.lang.toLowerCase().startsWith("ko"));
}

export function hasKoreanVoice() {
  return ttsSupported() && !!koVoice();
}

/** Fala um texto em coreano usando a Web Speech API (gratuita, do navegador). */
export function speakKo(text: string, rate = 0.85): Promise<void> {
  return new Promise((resolve) => {
    if (!ttsSupported() || !text) return resolve();
    const synth = window.speechSynthesis;
    const go = () => {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ko-KR";
      u.rate = rate;
      const v = koVoice();
      if (v) u.voice = v;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      synth.speak(u);
    };
    if (synth.getVoices().length === 0) {
      let done = false;
      const run = () => { if (!done) { done = true; go(); } };
      synth.addEventListener("voiceschanged", run, { once: true });
      setTimeout(run, 400);
    } else go();
  });
}

export function useSpeechSupport() {
  const [s, setS] = useState({ ready: false, tts: false, stt: false, koVoice: false });
  useEffect(() => {
    const update = () => setS({ ready: true, tts: ttsSupported(), stt: sttSupported(), koVoice: hasKoreanVoice() });
    update();
    if (ttsSupported()) window.speechSynthesis.addEventListener("voiceschanged", update);
    return () => { if (ttsSupported()) window.speechSynthesis.removeEventListener("voiceschanged", update); };
  }, []);
  return s;
}

const ERRORS: Record<string, string> = {
  "not-allowed": "Permita o uso do microfone no navegador para falar.",
  "service-not-allowed": "O reconhecimento de voz foi bloqueado pelo navegador.",
  "no-speech": "Não ouvi nada. Tente falar mais perto do microfone.",
  "audio-capture": "Nenhum microfone foi encontrado.",
  network: "Sem conexão com o serviço de reconhecimento de voz do navegador.",
};

/** Reconhecimento de fala em coreano (SpeechRecognition ko-KR). */
export function useRecognizer() {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const recRef = useRef<any>(null);

  const stop = useCallback(() => { try { recRef.current?.stop(); } catch { /* */ } }, []);

  const listen = useCallback((): Promise<string> => new Promise((resolve) => {
    const SR = w().SpeechRecognition || w().webkitSpeechRecognition;
    if (!SR) { setError("Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge."); return resolve(""); }
    window.speechSynthesis?.cancel();
    const rec = new SR();
    recRef.current = rec;
    rec.lang = "ko-KR";
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.continuous = false;
    let finalText = "";
    setError(""); setInterim(""); setListening(true);
    rec.onresult = (ev: any) => {
      let interimText = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) finalText += r[0].transcript; else interimText += r[0].transcript;
      }
      setInterim(finalText + interimText);
    };
    rec.onerror = (ev: any) => setError(ERRORS[ev.error] ?? "Não foi possível reconhecer a fala.");
    rec.onend = () => { setListening(false); resolve(finalText.trim()); };
    try { rec.start(); } catch { setListening(false); resolve(""); }
  }), []);

  useEffect(() => () => { try { recRef.current?.abort(); } catch { /* */ } }, []);
  return { listening, interim, error, listen, stop, setError };
}
