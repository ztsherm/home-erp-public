import { PageHeader, Panel } from "@/components/shell";
import { TaskFilterSelect } from "@/components/task-filter-select";
import { TaskList } from "@/components/task-list";
import { getTasksPageData } from "@/features/tasks/queries";
import { Pagination } from "@/components/pagination";
import { inputClass } from "@/components/shell";

export default async function TasksPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const data = await getTasksPageData(params);
  return (
    <>
      <PageHeader title="Tasks" />
      <div className="grid gap-4">
        <form className="flex gap-2">
          <input type="hidden" name="assigned" value={data.selected} />
          <input name="q" defaultValue={data.query} aria-label="Contains" placeholder="Contains across all shown fields" className={`${inputClass} min-w-0 flex-1`} />
          <button className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Search</button>
        </form>
        <TaskFilterSelect people={data.people} selected={data.selected} query={data.query} />
        <Panel className="overflow-hidden">
          <TaskList tasks={data.tasks} people={data.people} taskRecordTypeId={data.taskRecordType?.id} />
        </Panel>
        <Pagination data={data.pagination} pathname="/tasks" searchParams={params} />
      </div>
    </>
  );
}
