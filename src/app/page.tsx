import CreateNotebookButton from "@/components/create-notebook-button";
import TicketGate from "@/components/ticket-gate";
import { getStats } from "@/lib/stats";
import { hasTicketSession } from "@/lib/tickets";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!(await hasTicketSession())) {
    return <TicketGate />;
  }
  const stats = await getStats();
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 flex flex-col items-center justify-center">
      <header className="mb-10 text-center">
        <div className="mb-4 flex items-center justify-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none border border-[var(--lf-accent)]/60 bg-[var(--lf-accent)]/10 font-mono text-sm font-bold text-[var(--lf-accent)] shadow-[0_0_18px_rgba(0,0,0,0.25)]">
            LF
          </span>
          <div className="flex flex-col justify-center text-left">
            <div className="relative inline-block">
              <h1 className="forge-title forge-flicker font-mono text-2xl font-bold uppercase leading-none tracking-[0.18em]">
                LessonForge
              </h1>
              <div className="forge-smoke">
                <span className="smoke-p" style={{ left: "20%", animationDelay: "0s" }} />
                <span className="smoke-p" style={{ left: "40%", animationDelay: "0.8s" }} />
                <span className="smoke-p" style={{ left: "60%", animationDelay: "1.6s" }} />
                <span className="smoke-p" style={{ left: "80%", animationDelay: "2.4s" }} />
                <span className="smoke-p" style={{ left: "30%", animationDelay: "3.2s" }} />
                <span className="smoke-p" style={{ left: "50%", animationDelay: "0.4s" }} />
                <span className="smoke-p" style={{ left: "70%", animationDelay: "1.2s" }} />
                <span className="smoke-p" style={{ left: "90%", animationDelay: "2s" }} />
                <span className="smoke-p" style={{ left: "10%", animationDelay: "2.8s" }} />
              </div>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">BOSS-G INNOVATIONS &copy; 2026</p>
          </div>
        </div>
        <p className="font-mono text-xs tracking-wide text-zinc-500">
          Forged by AI, Sharpened by Human Expertise
        </p>
      </header>

      <section className="lf-panel lf-frame relative w-full p-8">
        <p className="mx-auto text-center font-mono text-sm leading-relaxed text-[var(--lf-fg)]">
          Pedagogical authority remains absolute: Review. Refine. Approve.
        </p>
        <div className="mt-6">
          <CreateNotebookButton />
        </div>
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 border-t pt-4 font-mono text-[11px] uppercase tracking-wider" style={{ borderColor: "color-mix(in srgb, var(--lf-accent), transparent 85%)" }}>
        <span className="text-zinc-500">Lesson Plan Minted</span>
        <span className="text-sm font-bold text-[var(--lf-accent)]">{stats.plans}</span>
        <span className="text-zinc-700">|</span>
        <span className="text-zinc-500">Assessment Refined</span>
        <span className="text-sm font-bold text-[var(--lf-accent)]">{stats.assessments}</span>
      </div>
    </div>
  );
}
