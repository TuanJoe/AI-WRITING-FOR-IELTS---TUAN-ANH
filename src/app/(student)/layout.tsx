import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isAdminRole } from "@/lib/auth/rbac";
import { AppShell, type NavItem } from "@/components/AppShell";

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/writing/new", label: "New Submission" },
  { href: "/submissions", label: "History" },
  { href: "/profile", label: "Profile & Usage" },
];

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const nav = [...NAV];
  if (isAdminRole(user.role)) {
    nav.push({ href: "/admin/dashboard", label: "Admin CMS" });
  }

  return (
    <AppShell title="IELTS Scorer" navItems={nav} userEmail={user.email}>
      {children}
    </AppShell>
  );
}
