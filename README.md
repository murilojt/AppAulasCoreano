# 한글 Hangeul Path

Aplicativo web para **brasileiros aprenderem coreano do zero**, no estilo Duolingo, com o tema **BTS / ARMY**.
Interface 100% em português do Brasil.

- Trilha de lições por níveis e unidades (lições bloqueadas/desbloqueadas)
- Exercícios: múltipla escolha, montar frase com blocos, ouvir e escrever, traduzir PT↔KO, ligar pares e falar a frase
- Gamificação: XP, ofensiva (streak), corações, níveis, conquistas e tela de progresso
- Modo Conversa com tutora de IA (Claude): você fala, o navegador transcreve, a tutora corrige e responde em voz alta
- Revisão espaçada (caixas de Leitner) para as palavras erradas
- Simulado original estilo TOPIK I (40 questões) e conversa final guiada
- Voz **gratuita** com a Web Speech API do navegador (use Chrome ou Edge)

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Prisma + SQLite · NextAuth (e-mail/senha) · API da Anthropic (somente no servidor).

---

## Passo a passo para rodar localmente

### 1. Pré-requisitos
- [Node.js](https://nodejs.org) 18.17 ou superior (recomendado 20+)
- Navegador **Google Chrome** ou **Microsoft Edge** (para voz)

### 2. Instale as dependências
```bash
npm install
```

### 3. Crie sua chave da Anthropic (para o tutor de IA)
1. Acesse <https://console.anthropic.com> e crie uma conta (ou entre).
2. Em **Billing**, adicione créditos (a API é paga por uso; o uso deste app é pequeno).
3. Vá em **Settings → API Keys → Create Key**, dê um nome (ex.: `hangeul-path`) e **copie a chave** (começa com `sk-ant-`). Ela só aparece uma vez.

### 4. Configure o `.env`
```bash
cp .env.example .env
```
Abra o `.env` e preencha:
```env
ANTHROPIC_API_KEY=sk-ant-SUA-CHAVE-AQUI
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET=um-segredo-longo-e-aleatorio   # gere com: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
```
> A chave da Anthropic é usada **apenas no servidor** (rotas de API e scripts) e nunca é enviada ao navegador. Não envie o `.env` ao GitHub (ele já está no `.gitignore`).

### 5. Crie o banco e importe as lições
```bash
npm run setup
```
Cria o banco SQLite (`prisma/dev.db`) e importa as lições iniciais (84 lições + simulado), geradas por regras a partir dos JSON em `src/content/levels`. Pode rodar de novo sem duplicar.

### 6. (Recomendado) Gere lições com o Claude
```bash
npm run generate:lessons                 # todas as unidades
npm run generate:lessons -- --level 1    # só um nível
npm run generate:lessons -- --level 1 --unit 3
npm run generate:lessons -- --force      # regera o que o Claude já gerou
```
O script envia o conteúdo de cada unidade ao Claude, que cria de 3 a 5 lições com exercícios originais, valida o resultado e grava no banco via Prisma. Cada lição tem uma chave única (`L{nível}U{unidade}-{ordem}`), então rodar de novo **não duplica**: unidades já geradas pelo Claude são ignoradas (use `--force` para regerar). As lições do Claude substituem as lições-modelo da mesma unidade.

### 7. Inicie o app
```bash
npm run dev
```
Abra <http://localhost:3000>, crie sua conta e comece a trilha.

Para produção: `npm run build && npm start`.

---

## Voz (grátis, sem serviços pagos)

| Recurso | API do navegador | Idioma |
|---|---|---|
| Reconhecer sua fala | `SpeechRecognition` / `webkitSpeechRecognition` | `ko-KR` |
| Falar em voz alta | `speechSynthesis` | `ko-KR` |

- Funciona melhor no **Chrome** e no **Edge**. Se o navegador não suportar, o app mostra um aviso amigável e segue funcionando por texto.
- Se não houver voz coreana, instale uma nas configurações de idioma/voz do sistema operacional.
- O reconhecimento de fala do Chrome usa o serviço do navegador (precisa de internet e permissão de microfone).

## Estrutura

```
src/content/levels/level-0.json   Hangeul (pré-nível)
src/content/levels/level-1.json   Iniciante 1 · TOPIK I nível 1 (unidades 1–8)
src/content/levels/level-2.json   Iniciante 2 · TOPIK I nível 2 (unidades 9–16)
src/content/index.ts              registro de níveis (já prevê os níveis 3–6 / TOPIK II)
src/lib/lessonBuilder.ts          gera lições-modelo originais, revisão e simulado a partir dos JSON
scripts/seed-lessons.ts           importa as lições-modelo (npm run db:seed)
scripts/generate-lessons.ts       gera lições com o Claude (npm run generate:lessons)
src/app/api/conversation          tutor de IA (somente servidor)
prisma/schema.prisma              banco (SQLite)
```

### Adicionar os níveis 3 a 6 (TOPIK II)
Crie `level-3.json` (mesmo formato dos outros), importe-o em `src/content/index.ts`, adicione-o a `LEVELS` e rode `npm run setup` e `npm run generate:lessons`.

### Trocar SQLite por Postgres
Em `prisma/schema.prisma`, mude `provider` para `"postgresql"`, ajuste `DATABASE_URL` e rode `npx prisma db push`. O schema não usa tipos exclusivos do SQLite (os exercícios são salvos como texto JSON).

## Método e direitos autorais

A progressão segue a estrutura do **Currículo Padrão Internacional de Coreano (국제통용 한국어 표준 교육과정)**, usado pelo King Sejong Institute (세종학당), e os níveis do **TOPIK I**. Cada unidade mostra a equivalência de nível. Todos os exercícios, frases e diálogos são **originais**: o app não copia textos, imagens ou áudios do *Sejong Korean* nem de outro material protegido, e **nunca reproduz letras de músicas**. Material complementar gratuito: <https://www.iksi.or.kr>. Projeto de fã, sem vínculo com a HYBE, o BTS ou o King Sejong Institute.

## Solução de problemas
- **"O tutor de IA ainda não está configurado"**: confira `ANTHROPIC_API_KEY` no `.env` e reinicie o servidor.
- **Não ouço a voz coreana**: use Chrome/Edge e instale uma voz coreana no sistema.
- **Microfone não funciona**: permita o microfone para `localhost` no navegador.
- **Erro de banco**: rode `npm run setup` de novo.
