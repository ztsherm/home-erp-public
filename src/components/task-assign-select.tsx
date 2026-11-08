"use client";

import { useTransition } from "react";
import { UserCheck } from "lucide-react";
import { assignTask } from "@/features/tasks/actions";

type PersonOption = { id: string; name: string };

export function TaskAssignSelect({
  taskId,
  assignedToId,
  people,
}: {
  taskId: string;
  assignedToId: string | null;
  people: PersonOption[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2 text-xs text-[#434655]">
      <div className="flex items-center gap-1.5 shrink-0">
        <UserCheck className="w-3.5 h-3.5 text-[#004ac6]" />
        <span className="font-semibold text-[#121c2a]">Assignee:</span>
      </div>
      <select
        defaultValue={assignedToId ?? ""}
        disabled={isPending}
        onChange={(e) => {
          const val = e.target.value;
          startTransition(async () => {
            const formData = new FormData();
            formData.set("id", taskId);
            formData.set("assignedToId", val);
            await assignTask(formData);
          });
        }}
        className={`bg-[#f8f9ff] border border-[#c3c6d7] focus:border-[#004ac6] rounded-xl px-2.5 py-1 text-xs text-[#121c2a] outline-none transition-opacity ${
          isPending ? "opacity-50" : ""
        }`}
      >
        <option value="">(Unassigned)</option>
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      {isPending ? (
        <span className="text-[10px] text-[#737686] animate-pulse">Saving...</span>
      ) : null}
    </div>
  );
}
