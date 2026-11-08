import Link from "next/link";
import { Check, CircleDashed } from "lucide-react";
import { assignTask, completeTask } from "@/features/tasks/actions";
import { shortDateTime } from "@/lib/format";
import { SkipTaskForm } from "@/components/skip-task-form";
import { SubmitButton } from "@/components/submit-button";

type PersonOption = { id: string; name: string };
type TaskRow = {
  id: string;
  title: string;
  dueDate: Date;
  assignedToId: string | null;
  item: { name: string };
  assignedTo: { name: string } | null;
};

function dueLabel(dueDate: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  if (due < today) return `Overdue - ${shortDateTime(dueDate)}`;
  if (due.getTime() === today.getTime()) return "Due today";
  return `Due ${dueDate.toLocaleDateString()}`;
}

export function TaskList({ tasks, people, taskRecordTypeId }: { tasks: TaskRow[]; people: PersonOption[]; taskRecordTypeId?: string }) {
  return (
    <div className="grid divide-y divide-neutral-100">
      {tasks.map((task) => (
        <div key={task.id} className="virtual-row grid gap-3 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium text-neutral-950">{taskRecordTypeId ? <Link href={`/records/${taskRecordTypeId}/${task.id}`} className="underline">{task.title}</Link> : task.title}</p>
              <p className="text-sm text-neutral-500">{task.item.name} - {dueLabel(task.dueDate)}</p>
              <p className="text-sm text-neutral-500">{task.assignedTo ? `Assigned to ${task.assignedTo.name}` : "Unassigned"}</p>
            </div>
            <CircleDashed className="mt-1 h-5 w-5 shrink-0 text-neutral-400" aria-hidden="true" />
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <form action={assignTask} className="flex min-w-0 gap-2">
              <input type="hidden" name="id" value={task.id} />
              <select key={task.assignedToId ?? "unassigned"} name="assignedToId" defaultValue={task.assignedToId ?? ""} className="min-h-10 min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-950">
                <option value="">Unassigned</option>
                {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
              </select>
              <SubmitButton pendingLabel="Assigning...">Assign</SubmitButton>
            </form>
            <form action={completeTask}>
              <input type="hidden" name="id" value={task.id} />
              <button type="submit" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-neutral-950 px-3 py-2 text-sm font-semibold text-white">
                <Check className="h-4 w-4" />
                Completed
              </button>
            </form>
            <SkipTaskForm taskId={task.id} />
          </div>
        </div>
      ))}
      {!tasks.length ? <p className="p-4 text-sm text-neutral-500">No open tasks match this filter.</p> : null}
    </div>
  );
}
