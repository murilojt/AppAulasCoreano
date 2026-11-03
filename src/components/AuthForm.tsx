"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      if (mode === "register") {
        const r = await fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) });
        const j = await r.json();
        if (!r.ok) { setError(j.error ?? "Erro ao cadastrar"); return; }
      }
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) { setError("E-mail ou senha incorretos"); return; }
      router.push("/trilha"); router.refresh();
    } finally { setLoading(false); }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <Link href="/" className="mb-6 text-center text-2xl font-extrabold text-brand-600">한글 Path</Link>
      <form onSubmit={submit} className="card space-y-4">
        <h1 className="text-xl font-bold">{mode === "login" ? "Entrar" : "Criar conta"}</h1>
        {mode === "register" && (
          <label className="block text-sm font-semibold">Nome
            <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} autoComplete="name" />
          </label>
        )}
        <label className="block text-sm font-semibold">E-mail
          <input className="input mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label className="block text-sm font-semibold">Senha
          <input className="input mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} />
        </label>
        {error && <p role="alert" className="animate-shake rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <button className="btn btn-primary w-full" disabled={loading}>{loading ? "Aguarde…" : mode === "login" ? "Entrar" : "Cadastrar"}</button>
        <p className="text-center text-sm text-slate-500">
          {mode === "login" ? <>Novo por aqui? <Link className="font-semibold text-brand-600" href="/cadastro">Crie sua conta</Link></> : <>Já tem conta? <Link className="font-semibold text-brand-600" href="/entrar">Entrar</Link></>}
        </p>
      </form>
    </main>
  );
}
