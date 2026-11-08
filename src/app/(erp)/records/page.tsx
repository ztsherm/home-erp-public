import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getRecordTypesPageData } from "@/features/metadata/queries";
import { PageHeader, Panel } from "@/components/shell";
import { inputClass } from "@/components/shell";

const transactionKeys = new Set(["item_putaway", "item_transfer", "item_consumption", "item_maintenance"]);

function RecordTypeSection({ title, recordTypes }: { title: string; recordTypes: Awaited<ReturnType<typeof getRecordTypesPageData>>["recordTypes"] }) {
  if (!recordTypes.length) return null;
  return (
    <section className="grid gap-2">
      <h2 className="px-1 text-sm font-semibold text-neutral-600">{title}</h2>
      <Panel className="overflow-hidden">
        <div className="grid divide-y divide-neutral-100">
          {recordTypes.map((recordType) => (
            <Link key={recordType.id} href={`/records/${recordType.id}`} className="group block p-4 hover:bg-stone-50">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-neutral-950">{recordType.name}</p>
                  <p className="truncate text-sm text-neutral-500">{recordType.description ?? "Manage records in this table."}</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-neutral-400 group-hover:text-neutral-950" aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>
      </Panel>
    </section>
  );
}

export default async function RecordsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { recordTypes, query } = await getRecordTypesPageData(params);
  const transactions = recordTypes.filter((recordType) => transactionKeys.has(recordType.key));
  const records = recordTypes.filter((recordType) => !transactionKeys.has(recordType.key));
  return (
    <>
      <PageHeader title="Records" />
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={query} aria-label="Contains" placeholder="Contains across all shown fields" className={`${inputClass} min-w-0 flex-1`} /><button className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Search</button></form>
      <div className="grid gap-5">
        <RecordTypeSection title="Records" recordTypes={records} />
        <RecordTypeSection title="Transactions" recordTypes={transactions} />
        {!recordTypes.length ? <Panel className="p-4 text-sm text-neutral-500">No record types configured.</Panel> : null}
      </div>
    </>
  );
}
