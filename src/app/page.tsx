import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/trilha");
  const features = [
    ["🗺️", "Trilha de lições", "Do Hangeul ao nível TOPIK I, em unidades curtas com lições que desbloqueiam."],
    ["🎤", "Fale de verdade", "Reconhecimento de voz e fala em coreano direto no navegador, sem custo."],
    ["💬", "Tutor de IA", "Converse em coreano, receba correções gentis, romanização e tradução."],
    ["🔁", "Revisão espaçada", "As palavras que você erra voltam na hora certa para fixar de vez."],
  ];
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="flex items-center justify-between">
        <span className="text-xl font-extrabold text-brand-600">한글 Path</span>
        <nav className="flex gap-3 text-sm font-semibold">
          <Link href="/sobre" className="rounded-xl px-3 py-2 text-slate-600 hover:bg-white">Sobre o método</Link>
          <Link href="/entrar" className="rounded-xl px-3 py-2 text-brand-600 hover:bg-white">Entrar</Link>
        </nav>
      </header>
      <section className="mt-14 grid items-center gap-10 md:grid-cols-2">
        <div>
          <h1 className="text-4xl font-black leading-tight text-slate-900 md:text-5xl">Aprenda coreano do zero, <span className="text-brand-500">com BTS</span>.</h1>
          <p className="mt-4 text-lg text-slate-600">Hangeul Path é um jeito divertido e gratuito de sair do Hangeul e chegar a conversar com outros ARMYs, tudo em português.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/cadastro" className="btn btn-primary">Começar agora</Link>
            <Link href="/entrar" className="btn btn-ghost">Já tenho conta</Link>
          </div>
        </div>
        <div className="card text-center">
          <p className="ko text-7xl font-black text-brand-500">안녕!</p>
          <p className="mt-2 text-slate-500">annyeong! — “oi!”</p>
          <p className="ko mt-6 text-3xl font-bold text-slate-800">안녕하세요, 아미!</p>
          <p className="text-slate-500">annyeonghaseyo, ami! — Olá, ARMY!</p>
        </div>
      </section>
      <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(([i, t, d]) => (
          <div key={t} className="card"><div className="text-3xl">{i}</div><h3 className="mt-2 font-bold">{t}</h3><p className="mt-1 text-sm text-slate-600">{d}</p></div>
        ))}
      </section>
      <p className="mt-16 text-center text-xs text-slate-400">Projeto de estudo feito por fã, sem vínculo com a HYBE ou o BTS. Todo o conteúdo é original e não reproduz letras de músicas nem livros didáticos.</p>
    </main>
  );
}
