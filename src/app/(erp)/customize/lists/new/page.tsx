import Link from "next/link";
import { NewListForm } from "@/components/list-config-form";
import { PageHeader, Panel } from "@/components/shell";
import { requireAdministrator } from "@/server/auth/context";

export default async function NewCustomizeListPage() {
  await requireAdministrator();

  return (
    <>
      <PageHeader
        title="Create List"
        action={<Link href="/customize/lists" className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold">Cancel</Link>}
      />
      <Panel className="p-4">
        <NewListForm />
      </Panel>
    </>
  );
}
