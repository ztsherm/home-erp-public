import Link from "next/link";
import { PageHeader, Panel } from "@/components/shell";
import { searchApp } from "@/features/inventory/queries";

type SearchResult = {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  type: string;
};

function ResultRow({ result }: { result: SearchResult }) {
  return (
    <Link href={result.href} className="block p-4 hover:bg-stone-50">
      <p className="font-medium text-neutral-950">{result.title}</p>
      <p className="text-sm text-neutral-500">{result.type} - {result.subtitle}</p>
    </Link>
  );
}

function ResultSection({ title, results }: { title?: string; results: SearchResult[] }) {
  if (!results.length) return null;
  return (
    <section>
      {title ? <h2 className="px-1 pb-2 pt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</h2> : null}
      <Panel className="divide-y divide-neutral-100 overflow-hidden">
        {results.map((result) => <ResultRow key={result.id} result={result} />)}
      </Panel>
    </section>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const results = await searchApp(q ?? "");
  const hasRecords = results.records.length > 0;
  const hasTransactions = results.transactions.length > 0;
  const showHeaders = hasRecords && hasTransactions;
  return (
    <>
      <PageHeader title="Search" eyebrow={q ? `Results for ${q}` : "Global record search"} />
      {q ? (
        <div className="grid gap-4">
          <ResultSection title={showHeaders ? "Records" : undefined} results={results.records} />
          <ResultSection title={showHeaders ? "Transactions" : undefined} results={results.transactions} />
          {!hasRecords && !hasTransactions ? <Panel className="p-4 text-sm text-neutral-500">No matching records or transactions.</Panel> : null}
        </div>
      ) : (
        <Panel className="p-4 text-sm text-neutral-500">Enter a search term to find records and transactions.</Panel>
      )}
    </>
  );
}
