import Link from "next/link";
import { shortDateTime } from "@/lib/format";

export type EventCardData = {
  id: string;
  href?: string;
  action: "Created" | "Edited" | "Deleted";
  title: string;
  user: string;
  timestamp: Date;
  details: string;
};

const actionClass = {
  Created: "text-green-700",
  Edited: "text-blue-700",
  Deleted: "text-red-700",
};

export function EventCard({ event }: { event: EventCardData }) {
  const content = (
    <div className="grid gap-2 p-4">
      <div className="flex min-w-0 items-baseline gap-2">
        <span className={`text-sm font-semibold ${actionClass[event.action]}`}>{event.action}</span>
        <span className="truncate text-sm font-semibold text-neutral-950">{event.title}</span>
      </div>
      <p className="text-sm text-neutral-500">{event.user} - {shortDateTime(event.timestamp)}</p>
      <p className="text-sm text-neutral-800">{event.details}</p>
    </div>
  );

  return event.href ? <Link href={event.href} className="block hover:bg-stone-50">{content}</Link> : content;
}
