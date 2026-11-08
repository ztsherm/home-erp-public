import { EventCard } from "@/components/event-card";
import { EventFilter } from "@/components/event-filter";
import { PageHeader, Panel } from "@/components/shell";
import { getEventsPageData } from "@/features/inventory/queries";
import { Pagination } from "@/components/pagination";
import { inputClass } from "@/components/shell";

function selectedTypes(type: string | string[] | undefined) {
  const raw = Array.isArray(type) ? type.join(",") : type ?? "";
  return raw.split(",").map((value) => value.trim()).filter(Boolean);
}

export default async function EventsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { type } = params;
  const selected = selectedTypes(type);
  const data = await getEventsPageData(selected, params);
  return (
    <>
      <PageHeader title="Events" eyebrow="Transactions and activity from the last 30 days" />
      <form className="mb-4 flex gap-2">
        {selected.length ? <input type="hidden" name="type" value={selected.join(",")} /> : null}
        <input name="q" defaultValue={data.query} aria-label="Contains" placeholder="Contains across all shown fields" className={`${inputClass} min-w-0 flex-1`} />
        <button className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Search</button>
      </form>
      <EventFilter value={selected} query={data.query} />
      <Panel className="divide-y divide-neutral-100">
        {data.events.map((event) => <div key={event.id} className="virtual-row"><EventCard event={event} /></div>)}
        {!data.events.length ? <div className="p-4 text-sm text-neutral-500">No events match the selected types.</div> : null}
      </Panel>
      <Pagination data={data.pagination} pathname="/events" searchParams={params} />
    </>
  );
}
