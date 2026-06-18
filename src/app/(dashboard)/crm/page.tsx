import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isCrmManager } from "@/lib/crm-auth";
import CrmDashboardClient from "./CrmDashboardClient";

export default async function CrmDashboardPage() {
  const session = await auth();
  if (!session) return null;

  const manager = isCrmManager(session.user.role);
  const reps = manager
    ? await prisma.user.findMany({
        where: { role: "SALES_REP", isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <CrmDashboardClient
      userName={session.user.name ?? "there"}
      isManager={manager}
      reps={reps}
    />
  );
}
