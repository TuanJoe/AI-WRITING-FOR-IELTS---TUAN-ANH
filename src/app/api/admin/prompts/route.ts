import type { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { ok, handleApiError } from "@/lib/api/response";
import { listPrompts } from "@/services/prompt-service";
import { recordAudit } from "@/services/audit-service";

export async function GET(req: NextRequest) {
  try {
    await requirePermission("prompts.view");
    const status = req.nextUrl.searchParams.get("status") || undefined;
    const prompts = await listPrompts({
      status: status as never,
    });
    return ok(prompts);
  } catch (err) {
    return handleApiError(err);
  }
}

const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).regex(/^[a-z0-9_]+$/, "Use lowercase, digits, underscores"),
  version: z.string().min(1),
  taskType: z.enum(["TASK_1", "TASK_2"]).nullable().optional(),
  modelProvider: z.string().default("gemini"),
  modelName: z.string().min(1),
  systemInstruction: z.string().min(1),
  userPromptTemplate: z.string().min(1),
  generationConfig: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requirePermission("prompts.manage");
    const input = createSchema.parse(await req.json());

    const prompt = await prisma.aIPrompt.create({
      data: {
        name: input.name,
        code: input.code,
        version: input.version,
        taskType: input.taskType ?? null,
        modelProvider: input.modelProvider,
        modelName: input.modelName,
        systemInstruction: input.systemInstruction,
        userPromptTemplate: input.userPromptTemplate,
        generationConfig:
          (input.generationConfig as Prisma.InputJsonValue) ?? undefined,
        status: "DRAFT",
        createdBy: admin.id,
        updatedBy: admin.id,
      },
    });

    await recordAudit({
      adminUserId: admin.id,
      action: "CREATE_PROMPT",
      entityType: "AIPrompt",
      entityId: prompt.id,
      afterValue: { code: prompt.code, version: prompt.version },
    });

    return ok(prompt, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
