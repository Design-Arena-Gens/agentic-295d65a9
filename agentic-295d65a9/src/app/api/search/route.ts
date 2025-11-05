import { NextResponse } from "next/server";
import { allCourts, type Court } from "@/lib/courts";
import { searchCourt } from "@/lib/search";

const MAX_RESULTS_PER_COURT = 4;
const MAX_TOTAL_RESULTS = 60;
const CONCURRENCY_LIMIT = 6;

const branchPriority: Record<Court["branch"], number> = {
  superior: 1,
  federal: 2,
  trabalho: 3,
  estadual: 4
};

type Payload = {
  query?: string;
  branches?: Court["branch"][];
  courts?: string[];
};

function filterBranches(branches: unknown): Court["branch"][] {
  const allowed = new Set<Court["branch"]>(["superior", "federal", "trabalho", "estadual"]);
  if (!Array.isArray(branches)) return [];
  return branches.filter((branch): branch is Court["branch"] => allowed.has(branch as Court["branch"]));
}

function prioritizeCourts(courts: Court[], priorityIds: string[]): Court[] {
  if (priorityIds.length === 0) return courts;
  const prioritySet = new Set(priorityIds);
  const prioritised: Court[] = [];
  const remaining: Court[] = [];

  courts.forEach((court) => {
    if (prioritySet.has(court.id)) {
      prioritised.push(court);
    } else {
      remaining.push(court);
    }
  });

  return [...prioritised, ...remaining];
}

export async function POST(request: Request) {
  const startedAt = performance.now();
  let payload: Payload;

  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json(
      { error: "Requisição inválida. Envie um corpo JSON com a consulta." },
      { status: 400 }
    );
  }

  const query = payload.query?.trim();
  if (!query) {
    return NextResponse.json(
      { error: "Informe um termo ou tema de pesquisa." },
      { status: 400 }
    );
  }

  const requestedBranches = filterBranches(payload.branches) ?? [];
  const courtsFilter = Array.isArray(payload.courts) ? payload.courts : [];

  const effectiveBranches = requestedBranches.length > 0 ? requestedBranches : ["superior", "federal"];

  const candidateCourts = allCourts
    .filter((court) => effectiveBranches.includes(court.branch))
    .sort((a, b) => branchPriority[a.branch] - branchPriority[b.branch]);

  if (candidateCourts.length === 0) {
    return NextResponse.json(
      { error: "Nenhum tribunal selecionado para pesquisa." },
      { status: 400 }
    );
  }

  const courtsToSearch = prioritizeCourts(candidateCourts, courtsFilter);

  const warnings: string[] = [];
  const resultsAccumulator: {
    courtId: string;
    courtName: string;
    url: string;
    title: string;
    snippet: string;
    publishedAt?: string;
    relevanceScore: number;
  }[] = [];

  const courtsConsulted: string[] = [];

  let active = 0;
  let index = 0;

  await new Promise<void>((resolve) => {
    const next = () => {
      if (index >= courtsToSearch.length && active === 0) {
        resolve();
        return;
      }
      while (active < CONCURRENCY_LIMIT && index < courtsToSearch.length) {
        const court = courtsToSearch[index++];
        active += 1;
        courtsConsulted.push(court.name);

        searchCourt(court, query, { maxResults: MAX_RESULTS_PER_COURT })
          .then((courtResult) => {
            if (courtResult.error) {
              warnings.push(`${court.name}: ${courtResult.error}`);
              return;
            }

            courtResult.items.forEach((item) => {
              resultsAccumulator.push({
                courtId: court.id,
                courtName: court.name,
                url: item.url,
                title: item.title,
                snippet: item.snippet,
                publishedAt: item.publishedAt,
                relevanceScore: computeRelevanceScore(court, item.rank, query)
              });
            });
          })
          .catch((err) => {
            console.error("Erro ao pesquisar tribunal", court.name, err);
            warnings.push(`${court.name}: falha inesperada.`);
          })
          .finally(() => {
            active -= 1;
            next();
          });
      }
    };

    next();
  });

  const sortedResults = resultsAccumulator
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, MAX_TOTAL_RESULTS);

  const elapsedMs = Math.round(performance.now() - startedAt);

  return NextResponse.json({
    results: sortedResults,
    diagnostics: {
      elapsedMs,
      courtsConsulted,
      query
    },
    warnings: warnings.length > 0 ? warnings : undefined
  });
}

function computeRelevanceScore(court: Court, rank: number, query: string) {
  const base = 1 / rank;
  const branchBoost = {
    superior: 1.4,
    federal: 1.2,
    trabalho: 1.1,
    estadual: 1
  }[court.branch];

  const themeBoost = query.match(/tema\s*\d+/i) ? 0.2 : 0;
  return base * branchBoost + themeBoost;
}
