import type { Role } from "@prisma/client";

// Role-based access control (section 6). Permissions are coarse-grained
// capabilities that admin pages / APIs check server-side.

export type Permission =
  | "admin.access" // can access the admin CMS at all
  | "submissions.viewAll"
  | "submissions.viewRawEssay"
  | "submissions.export"
  | "users.manage"
  | "prompts.view"
  | "prompts.manage" // create / edit / clone / test
  | "prompts.publish" // publish / rollback / archive
  | "finance.view" // token usage, cost
  | "pricing.manage" // model pricing & exchange rates
  | "routing.manage"
  | "featureFlags.manage"
  | "audit.view";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  STUDENT: [],
  TEACHER: ["admin.access", "submissions.viewAll"],
  SUPPORT: [
    "admin.access",
    "submissions.viewAll",
    "users.manage",
    "prompts.view",
  ],
  PRODUCT_ADMIN: [
    "admin.access",
    "submissions.viewAll",
    "submissions.viewRawEssay",
    "submissions.export",
    "users.manage",
    "prompts.view",
    "prompts.manage",
    "prompts.publish",
    "routing.manage",
    "featureFlags.manage",
    "audit.view",
  ],
  FINANCE_ADMIN: [
    "admin.access",
    "submissions.viewAll",
    "finance.view",
    "pricing.manage",
    "audit.view",
  ],
  SUPER_ADMIN: [
    "admin.access",
    "submissions.viewAll",
    "submissions.viewRawEssay",
    "submissions.export",
    "users.manage",
    "prompts.view",
    "prompts.manage",
    "prompts.publish",
    "finance.view",
    "pricing.manage",
    "routing.manage",
    "featureFlags.manage",
    "audit.view",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function isAdminRole(role: Role): boolean {
  return hasPermission(role, "admin.access");
}

export const ADMIN_ROLES: Role[] = [
  "TEACHER",
  "SUPPORT",
  "PRODUCT_ADMIN",
  "FINANCE_ADMIN",
  "SUPER_ADMIN",
];
