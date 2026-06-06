import { prisma } from "@/lib/db";

// Audit logging for sensitive admin actions (section 19.6).
export type AuditAction =
  | "ADMIN_LOGIN"
  | "VIEW_RAW_ESSAY"
  | "EXPORT_SUBMISSIONS"
  | "CREATE_PROMPT"
  | "EDIT_PROMPT"
  | "CLONE_PROMPT"
  | "TEST_PROMPT"
  | "PUBLISH_PROMPT"
  | "ROLLBACK_PROMPT"
  | "ARCHIVE_PROMPT"
  | "EDIT_PRICING"
  | "CREATE_PRICING"
  | "EDIT_EXCHANGE_RATE"
  | "CREATE_EXCHANGE_RATE"
  | "OVERRIDE_SCORE"
  | "BAN_USER"
  | "UPDATE_USER"
  | "ADJUST_QUOTA"
  | "CHANGE_FEATURE_FLAG"
  | "CHANGE_MODEL_ROUTING";

export interface AuditInput {
  adminUserId: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  beforeValue?: unknown;
  afterValue?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function recordAudit(input: AuditInput) {
  return prisma.adminAuditLog.create({
    data: {
      adminUserId: input.adminUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      beforeValue: input.beforeValue
        ? JSON.parse(JSON.stringify(input.beforeValue))
        : undefined,
      afterValue: input.afterValue
        ? JSON.parse(JSON.stringify(input.afterValue))
        : undefined,
      ipAddress: input.ipAddress ?? undefined,
      userAgent: input.userAgent ?? undefined,
    },
  });
}
