import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PAGE_SIZE_OPTIONS, type PaginationData } from "@/lib/pagination";

type SearchParams = Record<string, string | string[] | undefined>;

function href(pathname: string, searchParams: SearchParams, updates: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) params.append(key, item);
  }
  for (const [key, value] of Object.entries(updates)) params.set(key, value);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function Pagination({ data, pathname, searchParams = {} }: { data: PaginationData; pathname: string; searchParams?: SearchParams }) {
  if (data.total <= 25) return null;
  const start = (data.page - 1) * data.pageSize + 1;
  const end = Math.min(data.total, data.page * data.pageSize);
  return (
    <nav aria-label="Pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm">
      <p className="text-neutral-600">{start}-{end} of {data.total}</p>
      <div className="flex items-center gap-2">
        <span className="sr-only">Rows per page</span>
        <div className="hidden gap-1 sm:flex" aria-label="Rows per page">
          {PAGE_SIZE_OPTIONS.map((size) => <Link key={size} href={href(pathname, searchParams, { page: "1", pageSize: String(size) })} className={`rounded-md px-2 py-1 ${size === data.pageSize ? "bg-neutral-950 text-white" : "text-neutral-600 hover:bg-stone-100"}`}>{size}</Link>)}
        </div>
        {data.page > 1 ? <Link href={href(pathname, searchParams, { page: String(data.page - 1) })} className="grid h-9 w-9 place-items-center rounded-md border border-neutral-200" aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Link> : <span className="grid h-9 w-9 place-items-center rounded-md border border-neutral-100 text-neutral-300"><ChevronLeft className="h-4 w-4" /></span>}
        <span className="min-w-16 text-center text-neutral-600">{data.page} / {data.totalPages}</span>
        {data.page < data.totalPages ? <Link href={href(pathname, searchParams, { page: String(data.page + 1) })} className="grid h-9 w-9 place-items-center rounded-md border border-neutral-200" aria-label="Next page"><ChevronRight className="h-4 w-4" /></Link> : <span className="grid h-9 w-9 place-items-center rounded-md border border-neutral-100 text-neutral-300"><ChevronRight className="h-4 w-4" /></span>}
      </div>
    </nav>
  );
}
