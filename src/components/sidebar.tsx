"use client";

import Link from "next/link";
import { useState } from "react";
import { createPortal } from "react-dom";
import { Boxes, CalendarClock, FileText, Home, List, Menu, Settings, SlidersHorizontal, TableProperties, X } from "lucide-react";

const primaryLinks = [
  { href: "/records", label: "Records", icon: TableProperties },
  { href: "/lists", label: "Lists", icon: List },
  { href: "/customize", label: "Customize", icon: SlidersHorizontal },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/workflows", label: "Workflows", icon: CalendarClock },
  { href: "/assets", label: "Items", icon: Boxes },
  { href: "/events", label: "Events", icon: CalendarClock },
];

export function SidebarMenu({ personName }: { personName: string }) {
  const [open, setOpen] = useState(false);
  const drawer = open ? (
    <div className="fixed inset-0 z-[100] bg-neutral-950/45">
      <aside className="flex h-full w-[min(86vw,340px)] flex-col border-r border-neutral-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-200 bg-white p-4">
          <div>
            <p className="text-sm text-neutral-500">Home ERP</p>
            <h2 className="font-semibold">{personName}</h2>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-stone-100" aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>
        <nav className="grid gap-1 bg-white p-3">
          <Link onClick={() => setOpen(false)} href="/" className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold text-[#004ac6] bg-[#eff4ff] hover:bg-[#dbe1ff] transition-colors mb-1">
            <Home className="h-5 w-5 text-[#004ac6]" />
            Home ERP Assistant
          </Link>
          {primaryLinks.map((link) => (
            <Link key={link.href} onClick={() => setOpen(false)} href={link.href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-800 hover:bg-stone-100">
              <link.icon className="h-5 w-5" />{link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-neutral-200 bg-white p-3">
          <Link onClick={() => setOpen(false)} href="/settings" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-neutral-800 hover:bg-stone-100"><Settings className="h-5 w-5" />Settings</Link>
        </div>
      </aside>
    </div>
  ) : null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-stone-100" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
      {drawer && typeof document !== "undefined" ? createPortal(drawer, document.body) : null}
    </>
  );
}
