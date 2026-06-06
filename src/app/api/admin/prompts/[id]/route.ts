import type { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/api/response";
import { getPrompt } from "@/services/prompt-service";
import { recordAudit } from "@/services/audit-service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("prompts.view");
    const { id } = await params;
    const prompt = await getPrompt(id);
    if (!prompt) return fail("Prompt not found.", 404);

    // Sibling versions (same code) help drive the version selector / rollback.
    const versions = await prisma.aIPrompt.findMany({
      where: { code: prompt.code },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        version: true,
        status: true,
        isDefault: true,
        publishedAt: true,
        createdAt: true,
      },
    });
    return ok({ prompt, versions });
  } catch (err) {
    return handleApiError(err);
  }
}

const editSchema = z.object({
  name: z.string().min(1).optional(),
  modelName: z.string().min(1).optional(),
  taskType: z.enum(["TASK_1", "TASK_2"]).nullable().optional(),
  systemInstruction: z.string().min(1).optional(),
  userPromptTemplate: z.string().min(1).optional(),
  generationConfig: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(["DRAFT", "TESTING"]).optional(),
});

// Only DRAFT/TESTING prompts may be edited directly (section 19.3 rule 1).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requirePermission("prompts.manage");
    const { id } = await params;
    const existing = await getPrompt(id);
    if (!existing) return fail("Prompt not found.", 404);
    if (existing.status === "PUBLISHED") {
      return fail(
        "Published prompts cannot be edited directly. Clone it first.",
        409,
      );
    }

    const input = editSchema.parse(await req.json());
    const updated = await prisma.aIPrompt.update({
      where: { id },
      data: {
        name: input.name,
        modelName: input.modelName,
        taskType: input.taskType,
        systemInstruction: input.systemInstruction,
        userPromptTemplate: input.userPromptTemplate,
        generationConfig:
          (input.generationConfig as Prisma.InputJsonValue) ?? undefined,
        status: input.status,
        updatedBy: admin.id,
      },
    });

    await recordAudit({
      adminUserId: admin.id,
      action: "EDIT_PROMPT",
      entityType: "AIPrompt",
      entityId: id,
      beforeValue: {
        name: existing.name,
        modelName: existing.modelName,
        status: existing.status,
      },
      afterValue: { name: updated.name, modelName: updated.modelName, status: updated.status },
    });

    return ok(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
