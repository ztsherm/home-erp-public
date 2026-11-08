"use client";

import { useEffect } from "react";
import { recordRecentView } from "@/features/personalization/actions";

export function RecentRecordTracker({ href, label }: { href: string; label: string }) {
  useEffect(() => { void recordRecentView(href, label); }, [href, label]);
  return null;
}
