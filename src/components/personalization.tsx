import Link from "next/link";
import { Star } from "lucide-react";
import { toggleFavorite } from "@/features/personalization/actions";

export function FavoritesMenu({ favorites }: { favorites: Array<{ id: string; href: string; label: string }> }) {
  return <details className="relative">
    <summary className="grid h-10 w-10 list-none place-items-center rounded-full bg-stone-100 [&::-webkit-details-marker]:hidden" aria-label="Favorites"><Star className="h-5 w-5" /></summary>
    <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl">
      <p className="border-b border-neutral-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Favorites</p>
      {favorites.map((favorite) => <Link key={favorite.id} href={favorite.href} className="block truncate px-4 py-3 text-sm hover:bg-stone-50">{favorite.label}</Link>)}
      {!favorites.length ? <p className="px-4 py-4 text-sm text-neutral-500">Star a record or report to keep it here.</p> : null}
    </div>
  </details>;
}

export function FavoriteToggle({ href, label, active }: { href: string; label: string; active: boolean }) {
  return <form action={toggleFavorite}><input type="hidden" name="href" value={href} /><input type="hidden" name="label" value={label} /><button className={`grid h-10 w-10 place-items-center rounded-md border ${active ? "border-amber-300 bg-amber-50 text-amber-600" : "border-neutral-200 bg-white text-neutral-500"}`} aria-label={active ? "Remove from favorites" : "Add to favorites"}><Star className={`h-5 w-5 ${active ? "fill-current" : ""}`} /></button></form>;
}
