import Link from "next/link";
import { getTasksPageData } from "@/features/tasks/queries";
import { completeTask, skipTask } from "@/features/tasks/actions";
import { AssistantHeader } from "@/components/assistant-header";
import { TaskAssignSelect } from "@/components/task-assign-select";
import { CalendarCheck, Check, ClipboardList, SkipForward } from "lucide-react";
import { shortDate } from "@/lib/format";

export default async function AssistantTasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { tasks, people, selected, counts, user } = (await getTasksPageData(params)) as any;

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#121c2a] pt-16 pb-24 font-sans">
      <AssistantHeader title="Pending Tasks" showBack backHref="/" user={user} />

      <main className="max-w-2xl mx-auto px-4 mt-4 space-y-4">
        {/* Filter Pills with Bucket Counts */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Link
            href="/assistant/tasks?assigned=me"
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
              selected === "me"
                ? "bg-[#004ac6] text-white shadow-sm"
                : "bg-white text-[#434655] border border-[#dee9fc] hover:bg-[#eff4ff]"
            }`}
          >
            <span>Assigned to Me</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                selected === "me"
                  ? "bg-white/25 text-white"
                  : "bg-[#eff4ff] text-[#004ac6]"
              }`}
            >
              {counts?.me ?? 0}
            </span>
          </Link>
          <Link
            href="/assistant/tasks?assigned=all"
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
              selected === "all"
                ? "bg-[#004ac6] text-white shadow-sm"
                : "bg-white text-[#434655] border border-[#dee9fc] hover:bg-[#eff4ff]"
            }`}
          >
            <span>All Household</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                selected === "all"
                  ? "bg-white/25 text-white"
                  : "bg-[#eff4ff] text-[#004ac6]"
              }`}
            >
              {counts?.all ?? 0}
            </span>
          </Link>
          <Link
            href="/assistant/tasks?assigned=unassigned"
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
              selected === "unassigned"
                ? "bg-[#004ac6] text-white shadow-sm"
                : "bg-white text-[#434655] border border-[#dee9fc] hover:bg-[#eff4ff]"
            }`}
          >
            <span>Unassigned</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                selected === "unassigned"
                  ? "bg-white/25 text-white"
                  : "bg-[#eff4ff] text-[#004ac6]"
              }`}
            >
              {counts?.unassigned ?? 0}
            </span>
          </Link>
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {tasks.map((task: any) => {
            const isOverdue = new Date(task.dueDate) < new Date();
            return (
              <div
                key={task.id}
                className="p-4 bg-white rounded-2xl shadow-[0_2px_8px_rgba(31,41,55,0.03)] border border-[#dee9fc] space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-[#121c2a] truncate">{task.title}</span>
                      {isOverdue ? (
                        <span className="text-[10px] font-bold uppercase bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                          Overdue
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-[#737686]">
                      Item: <strong className="text-[#121c2a]">{task.item.name}</strong> • Due:{" "}
                      {shortDate(task.dueDate)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                    {/* Skip Action */}
                    <form action={skipTask}>
                      <input type="hidden" name="id" value={task.id} />
                      <button
                        type="submit"
                        title="Skip this task"
                        className="flex items-center gap-1 px-3 py-2 bg-neutral-100 text-[#434655] hover:bg-neutral-200 rounded-xl text-xs font-semibold active:scale-95 transition-all"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                        Skip
                      </button>
                    </form>

                    {/* Complete Action */}
                    <form action={completeTask}>
                      <input type="hidden" name="id" value={task.id} />
                      <button
                        type="submit"
                        title="Mark task completed"
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-[#006c49] text-white rounded-xl text-xs font-bold shadow-sm hover:bg-[#005236] active:scale-95 transition-all"
                      >
                        <Check className="w-4 h-4" />
                        Complete
                      </button>
                    </form>
                  </div>
                </div>

                {/* Task Assignee */}
                <div className="pt-2 border-t border-[#eff4ff]">
                  <TaskAssignSelect
                    taskId={task.id}
                    assignedToId={task.assignedToId}
                    people={people}
                  />
                </div>
              </div>
            );
          })}

          {!tasks.length ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-[#dee9fc] space-y-2">
              <CalendarCheck className="w-10 h-10 text-[#006c49] mx-auto" />
              <p className="text-sm font-bold text-[#121c2a]">All caught up!</p>
              <p className="text-xs text-[#737686]">No open tasks pending in this category.</p>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
