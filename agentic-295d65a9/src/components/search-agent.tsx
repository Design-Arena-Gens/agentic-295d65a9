"use client";

import { useState, useTransition } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { allCourts, type Court } from "@/lib/courts";

const branchLabels: Record<Court["branch"], string> = {
  superior: "Cortes Superiores",
  federal: "Tribunais Regionais Federais",
  trabalho: "Tribunais Regionais do Trabalho",
  estadual: "Tribunais de Justiça"
};

const defaultBranches: Court["branch"][] = ["superior", "federal"]; // pesquisam padrão

type SearchResult = {
  courtId: string;
  courtName: string;
  url: string;
  title: string;
  snippet: string;
  publishedAt?: string;
  relevanceScore: number;
};

type SearchResponse = {
  results: SearchResult[];
  diagnostics: {
    elapsedMs: number;
    courtsConsulted: string[];
    query: string;
  };
  warnings?: string[];
  error?: string;
};

export default function SearchAgent() {
  const [query, setQuery] = useState("");
  const [selectedBranches, setSelectedBranches] = useState<Court["branch"][]>(
    defaultBranches
  );
  const [selectedCourts, setSelectedCourts] = useState<string[]>([]);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const uniqueCourts = allCourts.filter((court) =>
    selectedBranches.includes(court.branch)
  );

  const toggleBranch = (branch: Court["branch"]) => {
    setSelectedCourts([]);
    setSelectedBranches((current) =>
      current.includes(branch)
        ? current.filter((item) => item !== branch)
        : [...current, branch]
    );
  };

  const toggleCourt = (courtId: string) => {
    setSelectedCourts((current) =>
      current.includes(courtId)
        ? current.filter((item) => item !== courtId)
        : [...current, courtId]
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!query.trim()) {
      setError("Informe um tema ou palavra-chave para pesquisar.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            query,
            branches: selectedBranches,
            courts: selectedCourts
          })
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error ?? "Falha ao consultar fontes oficiais.");
        }

        const payload = (await response.json()) as SearchResponse;
        setResponse(payload);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "Erro inesperado durante a pesquisa de jurisprudência."
        );
        setResponse(null);
      }
    });
  };

  const hasBranchSelected = selectedBranches.length > 0;

  return (
    <section className="flex flex-col gap-10">
      <form
        onSubmit={handleSubmit}
        className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="space-y-2">
          <label htmlFor="query" className="text-sm font-medium text-slate-700">
            Tema ou palavra-chave
          </label>
          <input
            id="query"
            name="query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ex.: vínculo empregatício intermitente, Tema 1.123"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-base shadow-sm transition focus:border-sky-500 focus:ring-sky-500"
          />
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-slate-700">
            Abrangência dos tribunais
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.entries(branchLabels) as [Court["branch"], string][]).map(
              ([branch, label]) => {
                const checked = selectedBranches.includes(branch);
                return (
                  <label
                    key={branch}
                    className={`flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium transition ${
                      checked
                        ? "border-sky-500 bg-sky-50 text-sky-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <span>{label}</span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleBranch(branch)}
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                  </label>
                );
              }
            )}
          </div>
          {!hasBranchSelected && (
            <p className="text-sm text-amber-600">
              Selecione ao menos uma categoria para continuar a pesquisa.
            </p>
          )}
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-slate-700">
            Priorize tribunais específicos (opcional)
          </legend>
          <p className="text-sm text-slate-500">
            Quando selecionado, o agente concentra-se primeiro nesses tribunais antes de
            ampliar para os demais da mesma categoria.
          </p>
          <div className="grid max-h-52 gap-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
            {uniqueCourts.map((court) => {
              const checked = selectedCourts.includes(court.id);
              return (
                <label
                  key={court.id}
                  className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition ${
                    checked
                      ? "bg-sky-100 text-sky-700"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>{court.name}</span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCourt(court.id)}
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            * O JurisLab consulta exclusivamente fontes oficiais dos tribunais selecionados.
          </p>
          <button
            type="submit"
            disabled={isPending || !hasBranchSelected}
            className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Pesquisando…
              </span>
            ) : (
              "Pesquisar jurisprudência"
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {response?.error && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <ShieldAlert className="mt-0.5 h-5 w-5" />
          <span>{response.error}</span>
        </div>
      )}

      {response && !response.error && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
            <span>
              Consulta executada em <strong>{response.diagnostics.elapsedMs} ms</strong>.
            </span>
            <span>
              Tribunais consultados: <strong>{response.diagnostics.courtsConsulted.length}</strong>
            </span>
          </div>

          {response.warnings && response.warnings.length > 0 && (
            <ul className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              {response.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          )}

          <div className="space-y-4">
            {response.results.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                Nenhum resultado encontrado nos tribunais configurados. Tente ajustar os filtros
                ou revisar os termos da pesquisa.
              </p>
            ) : (
              <ul className="space-y-4">
                {response.results.map((result) => (
                  <li
                    key={`${result.courtId}-${result.url}`}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-wide text-sky-700">
                        <span className="font-semibold">{result.courtName}</span>
                        <span>{new URL(result.url).hostname}</span>
                      </div>
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-semibold text-slate-900"
                      >
                        {result.title}
                      </a>
                      <p className="text-sm text-slate-600">{result.snippet}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        {result.publishedAt && <span>Publicado em {result.publishedAt}</span>}
                        <span>Score de relevância: {result.relevanceScore.toFixed(2)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
