import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JurisLab Agent",
  description:
    "Agente de pesquisa de jurisprudência em tribunais brasileiros com foco em decisões vinculantes."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="h-full bg-slate-50">
      <body className={`${inter.className} min-h-screen`}>{children}</body>
    </html>
  );
}
