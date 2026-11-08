import Link from "next/link";
import { CameraOff } from "lucide-react";
import { PageHeader, Panel } from "@/components/shell";
import { getAssetsPageData } from "@/features/inventory/queries";
import { shortDateTime } from "@/lib/format";
import { Pagination } from "@/components/pagination";
import { inputClass } from "@/components/shell";

function ItemPhoto({ src, name }: Readonly<{ src: string | null; name: string }>) {
  if (src) {
    return (
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-neutral-200 bg-stone-50">
        <img src={src} alt={name} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-md border border-neutral-200 bg-stone-50 text-neutral-400">
      <CameraOff className="h-6 w-6" />
    </div>
  );
}

export default async function AssetsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { items, itemRecordType, lastTransactionDateByItemId, query, status, pagination } = await getAssetsPageData(params);
  const exportParams = new URLSearchParams();
  if (query) exportParams.set("q", query);
  if (status !== "active") exportParams.set("status", status);
  const exportHref = `/api/inventory/export${exportParams.size ? `?${exportParams}` : ""}`;
  return (
    <>
      <PageHeader title="Assets" eyebrow="Items and their current locations" action={<a href={exportHref} className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold">Export CSV</a>} />
      <form className="mb-4 grid gap-2 rounded-lg border border-neutral-200 bg-white p-3 sm:grid-cols-[1fr_auto_auto]">
        <input name="q" defaultValue={query} aria-label="Contains" placeholder="Contains across all shown fields" className={inputClass} />
        <select name="status" defaultValue={status} className={inputClass}><option value="active">Active</option><option value="archived">Archived</option><option value="all">All</option></select>
        <button className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Apply</button>
      </form>
      <div className="grid gap-4">
        {items.map((item) => {
          const lastTransactionDate = lastTransactionDateByItemId.get(item.id);
          const header = (
            <div className="flex min-w-0 flex-1 items-start gap-4 p-4">
              <ItemPhoto src={item.photoUrl} name={item.name} />
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-neutral-950">{item.name}</h2>
                <p className="mt-1 text-sm text-neutral-500">Last Transaction Date: {lastTransactionDate ? shortDateTime(lastTransactionDate) : "Not set"}</p>
              </div>
            </div>
          );
          return (
            <Panel key={item.id} className="virtual-row overflow-hidden">
              {itemRecordType ? <Link href={`/records/${itemRecordType.id}/${item.id}`} className="flex min-w-0 hover:bg-stone-50">{header}</Link> : header}
              {item.itemLocations.length ? (
                <div className="border-t border-neutral-200 p-4">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[420px] text-left text-sm">
                      <thead className="text-neutral-500"><tr><th className="py-2">Room</th><th>Area</th><th>Quantity</th></tr></thead>
                      <tbody className="divide-y divide-neutral-100">
                        {item.itemLocations.map((row) => (
                          <tr key={row.id}>
                            <td className="py-2">{row.room?.name ?? "—"}</td>
                            <td>{row.area?.name ?? "—"}</td>
                            <td>{String(row.quantity)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </Panel>
          );
        })}
      </div>
      <Pagination data={pagination} pathname="/assets" searchParams={params} />
    </>
  );
}
