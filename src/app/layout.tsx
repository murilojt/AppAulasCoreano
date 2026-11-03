import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "Hangeul Path — aprenda coreano com BTS",
  description: "Aprenda coreano do zero, em português, com trilha de lições, voz, revisão espaçada e tutor de IA.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#7e45e8" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
