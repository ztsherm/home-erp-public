import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getRecordTypesPageData } from "@/features/metadata/queries";
import { PageHeader, Panel } from "@/components/shell";

const transactionKeys = new Set(["item_putaway", "item_transfer", "item_consumption", "item_maintenance"]);

function RecordTypeSection({ title, recordTypes }: { title: string; recordTypes: Awaited<ReturnType<typeof getRecordTypesPageData>>["recordTypes"] }) {
  if (!recordTypes.length) return null;
  return (
    <section className="grid gap-2">
      <h2 className="px-1 text-sm font-semibold text-neutral-600">{title}</h2>
      <Panel className="overflow-hidden">
        <div className="grid divide-y divide-neutral-100">
          {recordTypes.map((recordType) => (
            <Link key={recordType.id} href={`/customize/${recordType.id}`} className="group block p-4 hover:bg-stone-50">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-neutral-950">{recordType.name}</p>
                  <p className="truncate text-sm text-neutral-500">{recordType.description ?? "Customize this record type."}</p>
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

export default async function CustomizeRecordsPage() {
  const { recordTypes, user } = await getRecordTypesPageData();
  const isAdmin = user.role === "ADMINISTRATOR";
  const transactions = recordTypes.filter((recordType) => transactionKeys.has(recordType.key));
  const records = recordTypes.filter((recordType) => !transactionKeys.has(recordType.key));

  return (
    <>
      <PageHeader
        title="Records"
        action={isAdmin ? <Link href="/customize/records/new" className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Create</Link> : null}
      />
      <div className="grid gap-5">
        <RecordTypeSection title="Records" recordTypes={records} />
        <RecordTypeSection title="Transactions" recordTypes={transactions} />
        {!recordTypes.length ? <Panel className="p-4 text-sm text-neutral-500">No record types configured.</Panel> : null}
      </div>
    </>
  );
}
