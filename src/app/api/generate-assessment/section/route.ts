import { requireTicket } from "@/lib/tickets";
import { NextRequest, NextResponse } from "next/server";
import { generateAssessment } from "@/lib/ai-providers";
import { officialAssessmentTemplateSections } from "@/lib/official-assessment-template";
import { getNotebook, saveNotebook } from "@/lib/store";
import { jsonError } from "@/lib/http";
import type { SourceDoc, AssessmentSection } from "@/lib/types";

export const maxDuration = 300;

interface RegenerateSectionBody {
  notebookId?: string;
  sectionId?: string;
  instructions?: string;
  feedback?: string;
  competency?: string;
  topic?: string;
  modelId?: string;
  assessmentType?: string;
  numberOfItems?: string;
  itemTypes?: string[];
  difficultyLevel?: string;
  timeLimit?: string;
  totalPoints?: string;
}

export async function POST(request: NextRequest) {
  const denied = await requireTicket();
  if (denied) return denied;

  try {
    const body = (await request.json().catch(() => ({}))) as RegenerateSectionBody;
    if (!body.notebookId || !body.sectionId) {
      return NextResponse.json({ error: "notebookId and sectionId are required." }, { status: 400 });
    }

    const notebook = await getNotebook(body.notebookId);
    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found." }, { status: 404 });
    }

    const instructions = body.instructions?.trim().slice(0, 4000) || undefined;
    const standards = body.competency?.trim() || undefined;
    const topic = body.topic?.trim() || undefined;

    if (!standards || !topic) {
      return NextResponse.json(
        { error: "Competency and topic are required." },
        { status: 400 }
      );
    }

    const sources: SourceDoc[] = notebook.sources;
    const numItems = body.numberOfItems ? parseInt(body.numberOfItems, 10) : 
      (notebook.assessmentResult?.details?.numberOfItems ? parseInt(notebook.assessmentResult.details.numberOfItems, 10) : 10);
    const assessmentSections = officialAssessmentTemplateSections(numItems);

    // Find the target section
    const targetSection = assessmentSections.find((s) => s.id === body.sectionId);
    if (!targetSection) {
      return NextResponse.json({ error: "Section not found." }, { status: 404 });
    }

    // Build feedback instruction
    let fullInstructions = instructions || "";
    if (body.feedback) {
      fullInstructions += `\n\nREVISION REQUEST:\nPrevious content to revise:\n"""\n${notebook.assessmentResult?.sections.find((s) => s.sectionId === body.sectionId)?.content || ""}\n"""\n\nTeacher feedback: ${body.feedback}`;
    }

    const saved = notebook.assessmentResult?.details;
    const { sections } = await generateAssessment({
      sources,
      sections: [targetSection],
      instructions: fullInstructions || undefined,
      standards,
      learnerContext: notebook.details?.learnerContext?.trim() || undefined,
      topic,
      assessmentType: body.assessmentType ?? saved?.assessmentType,
      numberOfItems: "1",
      itemTypes: body.itemTypes ?? saved?.itemTypes,
      difficultyLevel: body.difficultyLevel ?? saved?.difficultyLevel,
      timeLimit: body.timeLimit ?? saved?.timeLimit,
      totalPoints: body.totalPoints ?? saved?.totalPoints,
      modelId: body.modelId,
    });

    const updatedSection = sections.find((s) => s.sectionId === body.sectionId);

    if (notebook.assessmentResult) {
      const idx = notebook.assessmentResult.sections.findIndex((s) => s.sectionId === body.sectionId);
      if (idx >= 0 && updatedSection) {
        // Remove approval when regenerating
        const { approvedAt, ...rest } = notebook.assessmentResult.sections[idx];
        notebook.assessmentResult.sections[idx] = { ...rest, ...updatedSection };
      } else if (updatedSection) {
        notebook.assessmentResult.sections.push(updatedSection);
      }
    }

    await saveNotebook(notebook);
    return NextResponse.json({ notebook });
  } catch (error) {
    return jsonError(error);
  }
}
