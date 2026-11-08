import Link from "next/link";
import { getRecordListPageData } from "@/features/metadata/queries";
import { RecordIcon } from "@/components/record-icon";
import { PageHeader, Panel } from "@/components/shell";
import { Pagination } from "@/components/pagination";
import { inputClass } from "@/components/shell";

export default async function RecordRowsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const queryParams = await searchParams;
  const { recordType, records, user, query, pagination } = await getRecordListPageData(id, queryParams);
  const canWriteRecords = !recordType.editableRecords || user.role === "ADMINISTRATOR";
  return (
    <>
      <PageHeader
        title={recordType.name}
        eyebrow="Records"
        icon={recordType.icon ? <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-stone-100"><RecordIcon name={recordType.icon} /></span> : null}
        action={canWriteRecords ? <Link href={`/records/${recordType.id}/new`} className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">New</Link> : null}
      />
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={query} aria-label="Contains" placeholder="Contains across all shown fields" className={`${inputClass} min-w-0 flex-1`} /><button className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Search</button></form>
      <Panel className="divide-y divide-neutral-100 overflow-hidden">
        {records.map((record) => (
          <Link key={record.id} href={record.href ?? `/records/${recordType.id}/${record.id}`} className="virtual-row block p-4 hover:bg-stone-50">
            <p className="font-medium">{record.title}</p>
            <p className="text-sm text-neutral-500">{record.subtitle}</p>
          </Link>
        ))}
        {!records.length ? <p className="p-4 text-sm text-neutral-500">No {recordType.name.toLowerCase()} records yet.</p> : null}
      </Panel>
      <Pagination data={pagination} pathname={`/records/${recordType.id}`} searchParams={queryParams} />
    </>
  );
}
