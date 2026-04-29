import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import Image from "next/image";
import SidebarNav from "@/components/SidebarNav";

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

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <Image 
            src="/linchpin-logo.png" 
            alt="Linchpin Logo" 
            width={200} 
            height={40} 
            className="h-auto w-auto max-h-24"
            priority
          />
        <div className="px-5 pb-5 border-b border-gray-100">
          
          <p className="text-xs text-gray-400 mt-2">
            {isAdmin ? "Admin" : "Employee"} · {session.user.name}
          </p>
        </div>

        <SidebarNav links={links} />

        <div className="px-3 py-4 border-t border-gray-100">
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
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}