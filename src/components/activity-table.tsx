import { shortDateTime } from "@/lib/format";
import { Panel } from "@/components/ui";

export type ActivityTableRow = {
  id: string;
  action: string;
  summary: string;
  createdAt: Date;
  people: { name: string } | null;
};

function typeLabel(action: string) {
  if (action === "UPDATE") return "Edited";
  if (action === "DELETE") return "Deleted";
  return "Created";
}

export function ActivityTable({ activity }: { activity: ActivityTableRow[] }) {
  return (
    <Panel className="overflow-hidden">
      {activity.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-stone-50 text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Timestamp</th>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Action / Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {activity.map((event) => (
                <tr key={event.id}>
                  <td className="whitespace-nowrap px-4 py-3">{shortDateTime(event.createdAt)}</td>
                  <td className="px-4 py-3">{event.people?.name ?? "System"}</td>
                  <td className="px-4 py-3">{typeLabel(event.action)}</td>
                  <td className="px-4 py-3">{event.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="p-4 text-sm text-neutral-500">No activity has been logged for this record.</p>
      )}
    </Panel>
  );
}
