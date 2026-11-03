import ConversationClient from "@/components/ConversationClient";
export const metadata = { title: "Conversa — Hangeul Path" };

export default function Page({ searchParams }: { searchParams: { cenario?: string; id?: string } }) {
  const scenario = searchParams.cenario === "final" ? "final" : "livre";
  return <ConversationClient key={`${scenario}-${searchParams.id ?? "new"}`} scenario={scenario} initialId={searchParams.id} />;
}
