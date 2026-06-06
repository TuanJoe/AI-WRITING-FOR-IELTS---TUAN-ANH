import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { hasPermission, isAdminRole } from "@/lib/auth/rbac";
import { AppShell, type NavItem } from "@/components/AppShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdminRole(user.role)) redirect("/dashboard");

  // Build nav from the user's permissions (section 6).
  const nav: NavItem[] = [{ href: "/admin/dashboard", label: "Dashboard" }];
  if (hasPermission(user.role, "submissions.viewAll"))
    nav.push({ href: "/admin/submissions", label: "Submissions" });
  if (hasPermission(user.role, "prompts.view"))
    nav.push({ href: "/admin/prompts", label: "Prompts" });
  if (hasPermission(user.role, "finance.view")) {
    nav.push({ href: "/admin/ai-usage", label: "AI Usage" });
    nav.push({ href: "/admin/pricing", label: "Pricing & Rates" });
  }
  if (hasPermission(user.role, "users.manage"))
    nav.push({ href: "/admin/users", label: "Users" });
  if (hasPermission(user.role, "audit.view"))
    nav.push({ href: "/admin/audit-logs", label: "Audit Logs" });
  nav.push({ href: "/dashboard", label: "← Student App" });

  return (
    <AppShell title="IELTS Admin" navItems={nav} userEmail={user.email}>
      {children}
    </AppShell>
  );
}
