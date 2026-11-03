import Link from "next/link";
import { LEVELS, PLANNED_LEVELS } from "@/content";

export const metadata = { title: "Sobre o método — Hangeul Path" };

export default function About() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <Link href="/" className="text-sm font-semibold text-brand-600">← Voltar</Link>
      <header>
        <h1 className="text-3xl font-black">Sobre o método</h1>
        <p className="mt-2 text-slate-600">Entenda como o Hangeul Path organiza o aprendizado e de onde vêm os conteúdos.</p>
      </header>

      <section className="card space-y-2">
        <h2 className="text-xl font-bold">Estrutura curricular</h2>
        <p>A progressão do app segue a estrutura do <strong>Currículo Padrão Internacional de Coreano (국제통용 한국어 표준 교육과정)</strong>, referência usada pelos institutos <strong>King Sejong Institute (세종학당)</strong>, e os níveis do exame <strong>TOPIK I</strong>. Cada unidade mostra a equivalência com o nível oficial correspondente.</p>
        <div className="overflow-x-auto">
          <table className="mt-3 w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400"><tr><th className="py-2">Nível no app</th><th>Currículo padrão</th><th>TOPIK</th><th>Unidades</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {LEVELS.map((l) => (
                <tr key={l.level}><td className="py-2 font-semibold">{l.level} · {l.name}</td><td>{l.level === 0 ? "Pré-nível (Hangeul)" : `Nível ${l.level}`}</td><td>{l.topik}</td><td>{l.units.length}</td></tr>
              ))}
              {PLANNED_LEVELS.map((l) => (
                <tr key={l.level} className="text-slate-400"><td className="py-2">{l.level} · {l.name}</td><td>Nível {l.level}</td><td>{l.topik}</td><td>em breve</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-slate-500">A estrutura de dados já está pronta para os níveis 3 a 6 (TOPIK II): basta adicionar os arquivos <code>level-3.json</code> a <code>level-6.json</code> e rodar o gerador de lições.</p>
      </section>

      <section className="card space-y-2">
        <h2 className="text-xl font-bold">Conteúdo 100% original</h2>
        <p>Todos os exercícios, frases e diálogos do Hangeul Path são <strong>originais</strong>. O app <strong>não copia</strong> textos, diálogos, imagens ou áudios dos livros <em>Sejong Korean</em> ou de qualquer outro material protegido por direitos autorais, e <strong>nunca reproduz letras de músicas</strong>. O tema BTS usa apenas nomes de membros, títulos de músicas e referências a shows e ao fandom ARMY.</p>
        <p className="text-sm text-slate-500">O Hangeul Path é um projeto de fã para estudo, sem vínculo oficial com a HYBE, o BTS ou o King Sejong Institute.</p>
      </section>

      <section className="card space-y-2">
        <h2 className="text-xl font-bold">Como você aprende</h2>
        <ul className="list-disc space-y-1 pl-5 text-slate-700">
          <li><strong>Trilha:</strong> lições curtas de vocabulário, gramática e frases, com exercícios de escolha, montar frases, ouvir e escrever, traduzir, ligar pares e falar.</li>
          <li><strong>Revisão espaçada:</strong> palavras erradas voltam em intervalos crescentes até serem fixadas.</li>
          <li><strong>Conversa:</strong> você fala em coreano, o navegador transcreve e a tutora de IA corrige gramática, vocabulário e pronúncia.</li>
          <li><strong>Voz gratuita:</strong> usamos a Web Speech API do navegador (recomendamos Chrome ou Edge).</li>
        </ul>
      </section>

      <section className="card space-y-2">
        <h2 className="text-xl font-bold">Material complementar gratuito</h2>
        <p>Para estudar com materiais oficiais, visite o site do instituto: <a className="font-semibold text-brand-600 underline" href="https://www.iksi.or.kr" target="_blank" rel="noopener noreferrer">www.iksi.or.kr</a>.</p>
      </section>
    </main>
  );
}
