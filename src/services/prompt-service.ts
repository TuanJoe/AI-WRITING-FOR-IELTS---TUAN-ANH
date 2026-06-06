import { Prisma } from "@prisma/client";
import type { AIPrompt, TaskType } from "@prisma/client";
import { prisma } from "@/lib/db";

// Prompt selection & version management (sections 5.2, 19.3). Lifecycle:
// DRAFT -> TESTING -> PUBLISHED -> DEPRECATED -> ARCHIVED.

/**
 * Select the active prompt for a task type. Prefers the default published prompt
 * scoped to the task type, then any published prompt for the task type, then a
 * task-agnostic published default.
 */
export async function getActivePrompt(
  taskType: TaskType,
): Promise<AIPrompt | null> {
  const candidates = await prisma.aIPrompt.findMany({
    where: {
      status: "PUBLISHED",
      OR: [{ taskType }, { taskType: null }],
    },
    orderBy: [{ isDefault: "desc" }, { publishedAt: "desc" }],
  });

  // Prefer task-specific over task-agnostic.
  return (
    candidates.find((p) => p.taskType === taskType && p.isDefault) ??
    candidates.find((p) => p.taskType === taskType) ??
    candidates.find((p) => p.isDefault) ??
    candidates[0] ??
    null
  );
}

export async function listPrompts(filters?: {
  status?: AIPrompt["status"];
  code?: string;
}): Promise<AIPrompt[]> {
  return prisma.aIPrompt.findMany({
    where: {
      status: filters?.status,
      code: filters?.code,
    },
    orderBy: [{ code: "asc" }, { createdAt: "desc" }],
  });
}

export async function getPrompt(id: string): Promise<AIPrompt | null> {
  return prisma.aIPrompt.findUnique({ where: { id } });
}

/** Bump a semantic version string's patch component (e.g. 1.0.0 -> 1.0.1). */
export function bumpPatchVersion(version: string): string {
  const parts = version.split(".").map((n) => parseInt(n, 10));
  while (parts.length < 3) parts.push(0);
  parts[2] = (Number.isNaN(parts[2]) ? 0 : parts[2]) + 1;
  return parts.join(".");
}

/** Clone a prompt into a new DRAFT with an incremented version. */
export async function clonePrompt(
  sourceId: string,
  userId: string,
): Promise<AIPrompt> {
  const source = await prisma.aIPrompt.findUniqueOrThrow({
    where: { id: sourceId },
  });

  // Find the highest existing version for this code to avoid collisions.
  const siblings = await prisma.aIPrompt.findMany({
    where: { code: source.code },
    select: { version: true },
  });
  let nextVersion = bumpPatchVersion(source.version);
  const existing = new Set(siblings.map((s) => s.version));
  while (existing.has(nextVersion)) {
    nextVersion = bumpPatchVersion(nextVersion);
  }

  return prisma.aIPrompt.create({
    data: {
      name: source.name,
      code: source.code,
      version: nextVersion,
      taskType: source.taskType,
      modelProvider: source.modelProvider,
      modelName: source.modelName,
      systemInstruction: source.systemInstruction,
      userPromptTemplate: source.userPromptTemplate,
      outputSchema: source.outputSchema ?? Prisma.JsonNull,
      generationConfig: source.generationConfig ?? Prisma.JsonNull,
      status: "DRAFT",
      isDefault: false,
      createdBy: userId,
      updatedBy: userId,
    },
  });
}

/**
 * Publish a prompt. Enforces a single default published prompt per task type:
 * other published prompts for the same code/task type are deprecated.
 */
export async function publishPrompt(
  id: string,
  userId: string,
): Promise<AIPrompt> {
  return prisma.$transaction(async (tx) => {
    const prompt = await tx.aIPrompt.findUniqueOrThrow({ where: { id } });

    // Deprecate previously published versions in the same family + task type.
    await tx.aIPrompt.updateMany({
      where: {
        code: prompt.code,
        taskType: prompt.taskType,
        status: "PUBLISHED",
        id: { not: id },
      },
      data: { status: "DEPRECATED", isDefault: false },
    });

    return tx.aIPrompt.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        isDefault: true,
        publishedBy: userId,
        publishedAt: new Date(),
        updatedBy: userId,
      },
    });
  });
}

/** Roll back to a previously published version: re-publish the target. */
export async function rollbackPrompt(
  id: string,
  userId: string,
): Promise<AIPrompt> {
  return publishPrompt(id, userId);
}

export async function archivePrompt(
  id: string,
  userId: string,
): Promise<AIPrompt> {
  return prisma.aIPrompt.update({
    where: { id },
    data: { status: "ARCHIVED", isDefault: false, updatedBy: userId },
  });
}
