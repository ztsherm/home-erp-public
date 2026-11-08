import Link from "next/link";
import { requireCurrentUser } from "@/server/auth/context";
import { CreateSheet } from "@/components/sheet";
import { SidebarMenu } from "@/components/sidebar";
import { FavoritesMenu } from "@/components/personalization";
import { getFavorites } from "@/features/personalization/queries";
export { Field, Panel, inputClass } from "@/components/ui";

export async function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireCurrentUser();
  const favorites = await getFavorites(user.householdId, user.id);
  return (
    <div className="min-h-screen pb-24 pt-20">
      <header className="fixed left-3 right-3 top-3 z-40 rounded-full border border-neutral-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3">
          <SidebarMenu personName={user.personName} />
          <form action="/search" className="flex min-w-0 flex-1 rounded-full bg-stone-100">
            <input name="q" placeholder="Search records" className="min-h-10 flex-1 bg-transparent px-4 text-sm outline-none" />
          </form>
          <FavoritesMenu favorites={favorites} />
          <div
            className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-neutral-950 bg-cover bg-center text-sm font-semibold text-white"
            style={user.profilePhotoUrl ? { backgroundImage: `url(${user.profilePhotoUrl})` } : undefined}
            aria-label="Profile"
          >
            {user.profilePhotoUrl ? null : user.personName.slice(0, 1)}
          </div>
        </div>
      </header>
      <main className="px-4">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white">
        <div className="relative mx-auto grid max-w-lg grid-cols-5 items-center px-2">
          <Link href="/records" className="py-4 text-center text-xs font-medium text-neutral-700">Records</Link>
          <Link href="/tasks" className="py-4 text-center text-xs font-medium text-neutral-700">Tasks</Link>
          <CreateSheet />
          <Link href="/events" className="py-4 text-center text-xs font-medium text-neutral-700">Events</Link>
          <Link href="/assets" className="py-4 text-center text-xs font-medium text-neutral-700">Assets</Link>
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({ title, icon, action }: { title: string; eyebrow?: string; icon?: React.ReactNode; action?: React.ReactNode }) {
  return <div className="mb-5 flex items-end justify-between gap-3"><div className="flex min-w-0 items-center gap-2">{icon}<h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1></div>{action}</div>;
}
