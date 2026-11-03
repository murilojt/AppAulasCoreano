"use client";
import { speakKo } from "@/lib/speech";

export default function SpeakerButton({ text, label = "Ouvir", slow = false, className = "" }: { text: string; label?: string; slow?: boolean; className?: string }) {
  return (
    <button type="button" aria-label={`${label}: ${text}`} onClick={() => speakKo(text, slow ? 0.55 : 0.85)}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-lg text-brand-600 transition hover:bg-brand-200 active:scale-95 ${className}`}>
      {slow ? "🐢" : "🔊"}
    </button>
  );
}
