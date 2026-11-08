"use client";

import { useRef } from "react";
import { ChevronsRight } from "lucide-react";
import { skipTask } from "@/features/tasks/actions";

export function SkipTaskForm({ taskId }: { taskId: string }) {
  const moveNextTaskDateRef = useRef<HTMLInputElement>(null);
  return (
    <form action={skipTask}>
      <input type="hidden" name="id" value={taskId} />
      <input ref={moveNextTaskDateRef} type="hidden" name="moveNextTaskDate" value="no" />
      <button
        type="submit"
        onClick={() => {
          if (moveNextTaskDateRef.current) {
            moveNextTaskDateRef.current.value = window.confirm("Move this task's next task date forward by its schedule interval?") ? "yes" : "no";
          }
        }}
        className="inline-flex min-h-10 items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold"
      >
        <ChevronsRight className="h-4 w-4" />
        Skip
      </button>
    </form>
  );
}
