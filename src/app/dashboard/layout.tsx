import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import Image from "next/image";
import SidebarNav from "@/components/SidebarNav";
import DashboardMobileNav from "@/components/DashboardMobileNav";

const adminLinks = [
  { href: "/dashboard/attendance", label: "Attendance" },
  { href: "/dashboard/logs", label: "Daily Logs" },
  { href: "/dashboard/targets", label: "Targets" },
  { href: "/dashboard/pay", label: "Pay Records" },
  { href: "/dashboard/invoices", label: "Invoices" },
  { href: "/dashboard/calendar", label: "Calendar" },
  { href: "/dashboard/reports", label: "Reports" },
  { href: "/dashboard/users", label: "User Management" },
  { href: "/dashboard/audit", label: "Audit Log" },
];

const employeeLinks = [
  { href: "/dashboard/attendance", label: "Attendance" },
  { href: "/dashboard/logs", label: "Daily Logs" },
  { href: "/dashboard/targets", label: "Targets" },
  { href: "/dashboard/calendar", label: "Calendar" },
  { href: "/dashboard/pay", label: "Pay Records" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";
  const links = isAdmin ? adminLinks : employeeLinks;

  const sidebarContent = (
    <>
      <div className="hidden md:block p-5 border-b border-gray-100">
        <Image 
          src="/linchpin-logo.png" 
          alt="Linchpin Logo" 
          width={200} 
          height={40} 
          className="h-auto w-auto max-h-24"
          priority
        />
        <p className="text-xs text-gray-400 mt-2">
          {isAdmin ? "Admin" : "Employee"} · {session.user.name}
        </p>
      </div>
      <div className="md:hidden px-5 py-4 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900">{session.user.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">{isAdmin ? "Admin" : "Employee"}</p>
      </div>

      <SidebarNav links={links} />

      <div className="px-3 py-4 border-t border-gray-100 mt-auto">
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition"
          >
            Sign out
          </button>
        </form>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-gray-50 flex-col md:flex-row overflow-hidden w-full">
      <DashboardMobileNav sidebarContent={sidebarContent} />
      
      {/* Sidebar Desktop */}
      <aside className="w-56 bg-white border-r border-gray-200 hidden md:flex flex-col shrink-0">
        {sidebarContent}
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto w-full">
        {children}
      </main>
    </div>
  );
}