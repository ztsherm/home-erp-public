"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Handshake, Search, User, X } from "lucide-react";
import { itemLoan } from "@/features/inventory/actions";

type PersonOption = {
  id: string;
  name: string;
  email: string | null;
};

export function LoanFlowClient({
  itemId,
  itemName,
  brand,
  model,
}: {
  itemId: string;
  itemName: string;
  brand: string | null;
  model: string | null;
}) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [matchingPeople, setMatchingPeople] = useState<PersonOption[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<PersonOption | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounced search for borrower (only when typing and no person is selected)
  useEffect(() => {
    if (selectedPerson || !query.trim()) {
      setMatchingPeople([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/assistant/people/search?q=${encodeURIComponent(query.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          setMatchingPeople(data.people ?? []);
        }
      } catch (err) {
        console.error("People search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, selectedPerson]);

  return (
    <form
      action={async (formData) => {
        setIsSubmitting(true);
        try {
          await itemLoan(formData);
          router.push(`/assistant/item/${itemId}`);
        } catch (err) {
          console.error("Loan out failed", err);
          setIsSubmitting(false);
        }
      }}
      className="bg-white rounded-2xl p-5 sm:p-6 shadow-[0_4px_12px_rgba(31,41,55,0.05)] border border-[#dee9fc] space-y-4"
    >
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="borrowerId" value={selectedPerson?.id ?? ""} />

      {/* Step 1: Searchable Borrower Field */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#434655] mb-1.5">
          Borrower (Search Person) *
        </label>

        {selectedPerson ? (
          <div className="flex items-center justify-between p-3.5 bg-[#eff4ff] border border-[#dbe1ff] rounded-xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[#004ac6] text-white font-bold text-sm flex items-center justify-center shrink-0">
                {selectedPerson.name.slice(0, 1)}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-[#121c2a] truncate">{selectedPerson.name}</p>
                {selectedPerson.email ? (
                  <p className="text-xs text-[#737686] truncate">{selectedPerson.email}</p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedPerson(null);
                setQuery("");
              }}
              className="text-xs font-bold text-[#004ac6] hover:underline shrink-0 ml-2"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="space-y-2 relative">
            <div className="relative">
              <Search className="w-4 h-4 text-[#737686] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type to search borrower name or email..."
                className="w-full bg-[#f8f9ff] border border-[#c3c6d7] focus:border-[#004ac6] rounded-xl pl-10 pr-4 py-3 text-xs outline-none shadow-sm"
              />
            </div>

            {/* Live Search Results Dropdown */}
            {isSearching ? (
              <div className="p-3 text-center text-xs text-[#737686] bg-neutral-50 rounded-xl">
                Searching people...
              </div>
            ) : query.trim() ? (
              <div className="max-h-48 overflow-y-auto bg-white border border-[#c3c6d7] rounded-xl divide-y divide-neutral-100 shadow-lg">
                {matchingPeople.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => {
                      setSelectedPerson(person);
                      setQuery("");
                      setMatchingPeople([]);
                    }}
                    className="w-full p-3 text-left hover:bg-[#eff4ff] flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="font-bold text-xs text-[#121c2a]">{person.name}</p>
                      {person.email ? (
                        <p className="text-[10px] text-[#737686]">{person.email}</p>
                      ) : null}
                    </div>
                    <span className="text-[10px] font-bold text-[#004ac6] bg-blue-100 px-2 py-0.5 rounded-full">
                      Select
                    </span>
                  </button>
                ))}

                {matchingPeople.length === 0 && !isSearching ? (
                  <div className="p-3 text-center text-xs text-[#737686]">
                    No person found matching &quot;{query}&quot;
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-[11px] text-[#737686] px-1">
                Start typing to find people in your records.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Loan Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#434655] mb-1.5">
            Loan Date
          </label>
          <input
            name="loanDate"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="w-full bg-[#f8f9ff] border border-[#c3c6d7] rounded-xl px-4 py-3 text-xs outline-none focus:border-[#004ac6]"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#434655] mb-1.5">
            Expected Return Date
          </label>
          <input
            name="expectedReturnDate"
            type="date"
            className="w-full bg-[#f8f9ff] border border-[#c3c6d7] rounded-xl px-4 py-3 text-xs outline-none focus:border-[#004ac6]"
          />
        </div>
      </div>

      {/* Condition Notes */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#434655] mb-1.5">
          Condition Notes
        </label>
        <input
          name="conditionNotes"
          placeholder="e.g. In good working condition, original case included"
          className="w-full bg-[#f8f9ff] border border-[#c3c6d7] rounded-xl px-4 py-3 text-xs outline-none focus:border-[#004ac6]"
        />
      </div>

      {/* General Notes */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#434655] mb-1.5">
          General Notes
        </label>
        <textarea
          name="notes"
          rows={2}
          placeholder="Optional notes or instructions..."
          className="w-full bg-[#f8f9ff] border border-[#c3c6d7] rounded-xl p-3 text-xs outline-none focus:border-[#004ac6]"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!selectedPerson || isSubmitting}
        className="w-full bg-[#004ac6] text-white font-bold text-sm py-3.5 rounded-xl shadow-md hover:bg-[#003ea8] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Handshake className="w-4 h-4" />
        {isSubmitting ? "Loaning out..." : "Confirm Loan Out"}
      </button>
    </form>
  );
}
