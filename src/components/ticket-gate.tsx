"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SmolderButton from "@/components/smolder-button";

export default function TicketGate() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleEnter() {
    const code = input.trim();
    if (!code) {
      setError("Enter your entrance ticket.");
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket: code }),
      });
      if (res.ok) {
        router.refresh();
        return;
      }
      setError("Invalid or expired ticket.");
    } catch {
      setError("Could not check your ticket. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6" style={{ backgroundColor: "var(--lf-bg)" }}>
      <div className="lf-panel lf-frame relative w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <span className="forge-title mb-3 inline-block font-mono text-3xl font-bold uppercase tracking-wider">
            LessonForge
          </span>
          <p className="font-mono text-xs text-zinc-500">Enter entrance ticket to proceed</p>
        </div>

        <div className="space-y-4">
          <input
            type="password"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleEnter()}
            placeholder="Ticket number"
            aria-label="Entrance ticket number"
            className="lf-input w-full px-4 py-3 text-center font-mono text-sm tracking-widest"
            autoFocus
          />
          {error && (
            <p role="alert" className="text-center text-sm text-red-400">{error}</p>
          )}
          <SmolderButton
            variant="forge"
            onClick={handleEnter}
            className="w-full rounded-none px-6 py-3 font-mono text-sm font-bold uppercase tracking-widest"
          >
            Enter
          </SmolderButton>
        </div>
      </div>
    </div>
  );
}
