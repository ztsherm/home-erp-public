"use client";

import { Trash2 } from "lucide-react";
import { removeItemTaskSchedule } from "@/features/metadata/actions";

export function RemoveItemTaskScheduleForm({ itemId, taskScheduleId, returnTo }: { itemId: string; taskScheduleId: string; returnTo: string }) {
  return (
    <form action={removeItemTaskSchedule} onSubmit={(event) => {
      if (!window.confirm("Remove this task schedule from this item?")) event.preventDefault();
    }}>
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="taskScheduleId" value={taskScheduleId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button type="submit" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 text-neutral-700 hover:bg-red-50 hover:text-red-700" aria-label="Remove schedule">
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
}
