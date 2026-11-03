"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import SpeechNotice from "./SpeechNotice";

type U = { name: string; xp: number; streak: number; hearts: number; level: number };
const NAV = [
  { href: "/trilha", label: "Trilha", icon: "🗺️" },
  { href: "/revisao", label: "Revisão", icon: "🔁" },
  { href: "/conversa", label: "Conversa", icon: "💬" },
  { href: "/progresso", label: "Progresso", icon: "📊" },
  { href: "/sobre", label: "Método", icon: "📖" },
];

export default function AppShell({ user, due, children }: { user: U; due: number; children: React.ReactNode }) {
  const path = usePathname();
  if (path.startsWith("/licao")) return <>{children}</>;
  return (
    <div className="min-h-screen md:pl-60">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-slate-200 bg-white p-4 md:flex">
        <Link href="/trilha" className="mb-6 px-3 text-2xl font-extrabold text-brand-600">한글 Path</Link>
        <nav className="flex-1 space-y-1">
          {NAV.map((n) => {
            const active = path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold uppercase tracking-wide ${active ? "bg-brand-50 text-brand-600 ring-2 ring-brand-200" : "text-slate-500 hover:bg-slate-50"}`}>
                <span className="text-xl">{n.icon}</span>{n.label}
                {n.href === "/revisao" && due > 0 && <span className="ml-auto rounded-full bg-rose-500 px-2 text-xs text-white">{due}</span>}
              </Link>
            );
          })}
        </nav>
        <button onClick={() => signOut({ callbackUrl: "/" })} className="rounded-xl px-3 py-3 text-left text-sm font-bold uppercase tracking-wide text-slate-400 hover:bg-slate-50">↩ Sair</button>
      </aside>

      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-2 backdrop-blur">
        <span className="text-lg font-extrabold text-brand-600 md:hidden">한글 Path</span>
        <span className="hidden text-sm text-slate-500 md:block">Olá, <strong>{user.name.split(" ")[0]}</strong> · Nível {user.level}</span>
        <div className="flex items-center gap-4 text-sm font-extrabold">
          <span title="Ofensiva de dias" className="text-orange-500">🔥 {user.streak}</span>
          <span title="XP" className="text-amber-500">⭐ {user.xp}</span>
          <span title="Corações" className="text-rose-500">❤️ {user.hearts}</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-28 pt-5 md:pb-10">
        <SpeechNotice />
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-slate-200 bg-white md:hidden" aria-label="Navegação principal">
        {NAV.map((n) => {
          const active = path.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href} className={`relative flex flex-col items-center py-2 text-[11px] font-bold ${active ? "text-brand-600" : "text-slate-400"}`}>
              <span className="text-xl">{n.icon}</span>{n.label}
              {n.href === "/revisao" && due > 0 && <span className="absolute right-4 top-1 rounded-full bg-rose-500 px-1.5 text-[10px] text-white">{due}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
