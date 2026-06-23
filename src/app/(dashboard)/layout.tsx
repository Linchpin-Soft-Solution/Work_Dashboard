import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import SidebarNav from "@/components/SidebarNav";
import DashboardMobileNav from "@/components/DashboardMobileNav";
import ChangePasswordDialog from "@/components/ChangePasswordDialog";
import SignOutDialog from "@/components/SignOutDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { canViewAuditLog } from "@/lib/audit-access";

const adminLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/attendance", label: "Attendance" },
  { href: "/leaves", label: "Leaves" },
  { href: "/logs", label: "Daily Logs" },
  { href: "/targets", label: "Targets" },
  { href: "/pay", label: "Pay Records" },
  { href: "/invoices", label: "Invoices" },
  { href: "/calendar", label: "Calendar" },
  { href: "/reports", label: "Reports" },
  { href: "/crm", label: "Sales CRM" },
  { href: "/users", label: "User Management" },
  { href: "/audit", label: "Audit Log" },
];

const employeeLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/attendance", label: "Attendance" },
  { href: "/leaves", label: "Leaves" },
  { href: "/logs", label: "Daily Logs" },
  { href: "/targets", label: "Targets" },
  { href: "/calendar", label: "Calendar" },
  { href: "/pay", label: "Pay Records" },
];

const crmManagerLinks = [
  { href: "/crm", label: "CRM Dashboard" },
  { href: "/crm/prospects", label: "Prospects" },
  { href: "/crm/follow-ups", label: "Follow-ups" },
  { href: "/crm/reports", label: "Reports" },
  { href: "/crm/stages", label: "Pipeline Settings" },
];

const crmRepLinks = [
  { href: "/crm", label: "CRM Dashboard" },
  { href: "/crm/prospects", label: "Prospects" },
  { href: "/crm/follow-ups", label: "Follow-ups" },
];

// Sales reps and managers get the standard employee tools plus their CRM links.
const salesRepLinks = [...employeeLinks, ...crmRepLinks];
const salesManagerLinks = [...employeeLinks, ...crmManagerLinks];

const roleLabels: Record<string, string> = {
  ADMIN: "Admin",
  EMPLOYEE: "Employee",
  INTERN: "Intern",
  SALES_MANAGER: "Sales Manager",
  SALES_REP: "Sales Rep",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) redirect("/login");

  const role = session.user.role;
  const roleLabel = roleLabels[role] ?? "Employee";
  const links =
    role === "ADMIN"
      ? adminLinks.filter((l) => l.href !== "/audit" || canViewAuditLog(session.user))
      : role === "SALES_MANAGER"
        ? salesManagerLinks
        : role === "SALES_REP"
          ? salesRepLinks
          : employeeLinks;

  const sidebarContent = (
    <>
      <div className="hidden md:block p-5 border-b border-gray-100 dark:border-gray-800">
        <Image 
          src="/linchpin-logo.png" 
          alt="Linchpin Logo" 
          width={200} 
          height={40} 
          className="h-auto w-auto max-h-24"
          priority
        />
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          {roleLabel} · {session.user.name}
        </p>
      </div>
      <div className="md:hidden px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{session.user.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{roleLabel}</p>
      </div>

      <SidebarNav links={links} />

      <div className="px-3 py-4 border-t border-gray-100 dark:border-gray-800 mt-auto">
        <ThemeToggle />
        <ChangePasswordDialog />
        <SignOutDialog />
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 flex-col md:flex-row overflow-hidden w-full transition-colors duration-300">
      <DashboardMobileNav sidebarContent={sidebarContent} />
      
      {/* Sidebar Desktop */}
      <aside className="w-56 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 hidden md:flex flex-col shrink-0 transition-colors duration-300">
        {sidebarContent}
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto w-full bg-gray-50 dark:bg-gray-950 transition-colors duration-300 text-foreground">
        {children}
      </main>
    </div>
  );
}