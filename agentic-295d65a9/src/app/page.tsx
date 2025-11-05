import { FileSearch } from "lucide-react";
import { Metadata } from "next";
import SearchAgent from "@/components/search-agent";

export const metadata: Metadata = {
  title: "JurisLab Agent",
  description:
    "Agente de IA focado em pesquisa de jurisprudência e decisões vinculantes em tribunais brasileiros."
};

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-12 px-4 pb-16 pt-10">
      <header className="flex flex-col gap-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-sky-700">
          <FileSearch className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
            JurisLab Agent
          </h1>
          <p className="text-base text-slate-600 sm:text-lg">
            Pesquisa inteligente exclusivamente em jurisprudência e decisões vinculantes dos
            tribunais superiores, federais, trabalhistas e estaduais do Brasil.
          </p>
        </div>
      </header>
      <SearchAgent />
    </main>
  );
}
