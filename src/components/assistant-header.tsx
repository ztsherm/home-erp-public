"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Database, LogOut, Search, Settings, ShieldCheck, User, X } from "lucide-react";
import { logoutAction } from "@/features/auth/actions";

export function AssistantHeader({
  title = "Home ERP",
  showBack = false,
  backHref = "/",
  cancelHref,
  user,
}: {
  title?: string;
  showBack?: boolean;
  backHref?: string;
  cancelHref?: string;
  user?: {
    name: string;
    personName: string;
    role: string;
    profilePhotoUrl?: string | null;
  };
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 w-full z-40 bg-[#f8f9ff]/90 backdrop-blur-md border-b border-[#dee9fc] h-14">
      <div className="max-w-4xl mx-auto h-full px-4 flex items-center justify-between">
        {showBack ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => (backHref ? router.push(backHref) : router.back())}
              className="p-2 rounded-full hover:bg-[#eff4ff] text-[#004ac6] transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-lg text-[#004ac6] tracking-tight truncate max-w-[200px] sm:max-w-xs">
              {title}
            </h1>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/" className="font-extrabold text-xl text-[#004ac6] tracking-tight">
              {title}
            </Link>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          {cancelHref && (!showBack || cancelHref !== backHref) ? (
            <Link
              href={cancelHref}
              className="text-xs font-semibold text-[#004ac6] hover:bg-[#eff4ff] px-3 py-1.5 rounded-lg transition-colors"
            >
              Cancel
            </Link>
          ) : (
            <>
              <Link
                href="/assistant/scan"
                className="p-2 rounded-full hover:bg-[#eff4ff] text-[#434655] transition-colors"
                aria-label="Search and scan"
              >
                <Search className="w-5 h-5" />
              </Link>

              {user ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="w-9 h-9 rounded-full bg-[#004ac6] text-white flex items-center justify-center font-bold text-sm shadow-sm hover:scale-105 transition-transform"
                    aria-label="User Profile"
                  >
                    {user.personName ? user.personName.slice(0, 1).toUpperCase() : "U"}
                  </button>

                  {menuOpen ? (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setMenuOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#dee9fc] py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-4 py-2 border-b border-[#eff4ff]">
                          <p className="font-semibold text-sm text-[#121c2a] truncate">{user.personName}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {user.role === "ADMINISTRATOR" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-[#004ac6]">
                                <ShieldCheck className="w-3 h-3" /> Admin
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700">
                                Member
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="py-1">
                          <Link
                            href="/records"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#121c2a] hover:bg-[#eff4ff] transition-colors font-medium"
                          >
                            <Database className="w-4 h-4 text-[#004ac6]" />
                            Enter ERP Backend
                          </Link>
                          <Link
                            href="/assistant/settings"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#121c2a] hover:bg-[#eff4ff] transition-colors"
                          >
                            <Settings className="w-4 h-4 text-[#737686]" />
                            Settings
                          </Link>
                        </div>

                        <div className="border-t border-[#eff4ff] pt-1">
                          <form action={logoutAction}>
                            <button
                              type="submit"
                              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-[#ba1a1a] hover:bg-[#ffdad6]/40 transition-colors"
                            >
                              <LogOut className="w-4 h-4" />
                              Sign Out / Switch PIN
                            </button>
                          </form>
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
