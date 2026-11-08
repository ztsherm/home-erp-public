import { getListPageData } from "@/features/metadata/queries";
import { PageHeader, Panel } from "@/components/shell";

export default async function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { list } = await getListPageData(id);
  return (
    <>
      <PageHeader title={list.name} />
      <Panel className="overflow-hidden">
        <div className="border-b border-neutral-100 bg-stone-50 px-4 py-3">
          <h2 className="font-semibold">Options</h2>
        </div>
        <div className="divide-y divide-neutral-100">
          {list.options.filter((option) => option.active).map((option) => (
            <div key={option.id} className="p-4">
              <p className="font-medium text-neutral-950">{option.label}</p>
            </div>
          ))}
          {!list.options.filter((option) => option.active).length ? <p className="p-4 text-sm text-neutral-500">No options configured.</p> : null}
        </div>
      </Panel>
    </>
  );
}
