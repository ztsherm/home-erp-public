"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginAction, pinLoginAction } from "@/features/auth/actions";
import { ArrowRight, Delete, Home, KeyRound, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [shake, setShake] = useState(false);
  const [showPasswordFallback, setShowPasswordFallback] = useState(false);

  // Auto-submit when 4 digits are entered
  useEffect(() => {
    if (pin.length === 4 && !isPending) {
      handlePinSubmit(pin);
    }
  }, [pin]);

  // Physical keyboard support
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (showPasswordFallback) return;
      if (e.key >= "0" && e.key <= "9") {
        if (pin.length < 4) {
          setError(null);
          setPin((prev) => prev + e.key);
        }
      } else if (e.key === "Backspace") {
        setError(null);
        setPin((prev) => prev.slice(0, -1));
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pin, showPasswordFallback]);

  function handleDigitClick(digit: string) {
    if (pin.length < 4 && !isPending) {
      setError(null);
      setPin((prev) => prev + digit);
    }
  }

  function handleBackspace() {
    if (!isPending) {
      setError(null);
      setPin((prev) => prev.slice(0, -1));
    }
  }

  function handlePinSubmit(pinToSubmit: string) {
    if (pinToSubmit.length !== 4) return;
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("pin", pinToSubmit);
      const res = await pinLoginAction(null, formData);
      if (res?.error) {
        setError(res.error);
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setPin("");
      } else if (res?.success) {
        router.replace("/");
      }
    });
  }

  // Password submission handler
  function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await loginAction(null, formData);
      if (res?.error) {
        setError(res.error);
      } else if (res?.success) {
        router.replace("/");
      }
    });
  }

  return (
    <main className="min-h-screen w-full bg-[#f8f9ff] text-[#121c2a] flex flex-col justify-between items-center px-6 py-8 select-none font-sans">
      {/* Top Branding Section */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#2563eb] text-white flex items-center justify-center mb-3 shadow-[0_4px_12px_rgba(37,99,235,0.2)]">
            <Home className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#121c2a]">HOME ERP</h1>
          <p className="text-xs text-[#737686] mt-0.5">Home & Inventory Assistant</p>
        </div>

        {!showPasswordFallback ? (
          <div className="flex flex-col items-center w-full">
            <h2 className="text-lg font-semibold text-[#434655] mb-6">Enter PIN to Start</h2>

            {/* 4 PIN Dots */}
            <div className={`flex gap-6 mb-6 ${shake ? "animate-shake" : ""}`}>
              {[0, 1, 2, 3].map((index) => {
                const filled = index < pin.length;
                return (
                  <div
                    key={index}
                    className={`w-5 h-5 rounded-full border-[2.5px] transition-all duration-200 ${
                      filled
                        ? "bg-[#004ac6] border-[#004ac6] scale-110"
                        : "border-[#c3c6d7] bg-transparent"
                    }`}
                  />
                );
              })}
            </div>

            {error ? (
              <p className="text-sm font-medium text-[#ba1a1a] bg-[#ffdad6] px-4 py-1.5 rounded-full mb-3 text-center">
                {error}
              </p>
            ) : null}

            {isPending ? (
              <p className="text-xs font-medium text-[#004ac6] animate-pulse">Verifying PIN...</p>
            ) : (
              <p className="text-xs text-[#737686]">Tap keypad or use your keyboard</p>
            )}
          </div>
        ) : (
          <div className="w-full bg-white rounded-2xl p-6 shadow-sm border border-[#e6eeff]">
            <div className="flex items-center gap-2 mb-4">
              <KeyRound className="w-5 h-5 text-[#004ac6]" />
              <h2 className="text-base font-semibold text-[#121c2a]">Sign in with Password</h2>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#434655] mb-1">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full bg-[#f8f9ff] border border-[#c3c6d7] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#004ac6]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#434655] mb-1">
                  Password
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="w-full bg-[#f8f9ff] border border-[#c3c6d7] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#004ac6]"
                />
              </div>
              {error ? (
                <p className="text-xs text-[#ba1a1a] bg-[#ffdad6] p-2 rounded-lg">{error}</p>
              ) : null}
              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-[#004ac6] text-white font-semibold rounded-xl py-3 text-sm shadow-md hover:bg-[#003ea8] transition-colors disabled:opacity-50"
              >
                {isPending ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Bottom Keypad Section */}
      {!showPasswordFallback ? (
        <div className="w-full max-w-xs mb-4">
          <div className="grid grid-cols-3 gap-y-4 gap-x-4 place-items-center">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigitClick(digit)}
                className="w-[72px] h-[72px] rounded-full bg-white shadow-[0_4px_12px_rgba(31,41,55,0.06)] flex items-center justify-center text-2xl font-semibold text-[#121c2a] active:scale-95 active:bg-[#e6eeff] transition-all touch-manipulation"
              >
                {digit}
              </button>
            ))}
            {/* Controls row */}
            <button
              type="button"
              aria-label="Delete"
              onClick={handleBackspace}
              className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-[#434655] active:scale-95 active:bg-[#e6eeff] transition-all touch-manipulation"
            >
              <Delete className="w-7 h-7" />
            </button>
            <button
              type="button"
              onClick={() => handleDigitClick("0")}
              className="w-[72px] h-[72px] rounded-full bg-white shadow-[0_4px_12px_rgba(31,41,55,0.06)] flex items-center justify-center text-2xl font-semibold text-[#121c2a] active:scale-95 active:bg-[#e6eeff] transition-all touch-manipulation"
            >
              0
            </button>
            <button
              type="button"
              aria-label="Submit PIN"
              disabled={pin.length !== 4 || isPending}
              onClick={() => handlePinSubmit(pin)}
              className={`w-[72px] h-[72px] rounded-full bg-[#004ac6] text-white shadow-[0_4px_12px_rgba(0,74,198,0.3)] flex items-center justify-center transition-all touch-manipulation ${
                pin.length === 4 && !isPending ? "opacity-100 active:scale-95" : "opacity-40 pointer-events-none"
              }`}
            >
              <ArrowRight className="w-7 h-7" />
            </button>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setShowPasswordFallback(true);
              }}
              className="text-xs font-medium text-[#737686] hover:text-[#004ac6] flex items-center gap-1.5 transition-colors py-2 px-3 rounded-lg hover:bg-white"
            >
              <Lock className="w-3.5 h-3.5" />
              Sign in with password
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setShowPasswordFallback(false);
            }}
            className="text-xs font-medium text-[#004ac6] hover:underline"
          >
            &larr; Back to PIN Keypad
          </button>
        </div>
      )}
    </main>
  );
}
