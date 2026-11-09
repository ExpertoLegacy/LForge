import { notFound } from "next/navigation";
import { getNotebook } from "@/lib/store";
import Workspace from "@/components/workspace";
import TicketGate from "@/components/ticket-gate";
import { hasTicketSession } from "@/lib/tickets";

export const dynamic = "force-dynamic";

export default async function NotebookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await hasTicketSession())) {
    return <TicketGate />;
  }
  const { id } = await params;
  const notebook = await getNotebook(id);
  if (!notebook) {
    notFound();
  }
  return (
    <div className="flex h-screen flex-col">
      <Workspace initialNotebook={notebook} />
    </div>
  );
}
