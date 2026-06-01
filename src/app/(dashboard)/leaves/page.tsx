import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import LeavesClient from "./LeavesClient";

export const metadata = {
  title: "Leaves Management | Linchpin",
  description: "Apply for leaves, track leave status, and manage team absence.",
};

export default async function LeavesPage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const isAdmin = session.user.role === "ADMIN";
  
  // If Admin, fetch all active employees to populate retroactive leave logging dropdowns
  let employees: { id: string; name: string; designation: string | null }[] = [];
  if (isAdmin) {
    employees = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        designation: true,
      },
      orderBy: { name: "asc" },
    });
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl">
          Leaves Management
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Apply for leaves, track approval status, and manage team absence.
        </p>
      </div>

      <LeavesClient 
        sessionUser={{
          id: session.user.id,
          name: session.user.name || "",
          role: session.user.role as "ADMIN" | "EMPLOYEE" | "INTERN",
        }}
        employees={employees}
      />
    </div>
  );
}
