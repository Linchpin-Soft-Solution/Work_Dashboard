import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isCrmManager } from "@/lib/crm-auth";
import ProspectsClient from "./ProspectsClient";

export default async function ProspectsPage() {
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

  return <ProspectsClient isManager={manager} reps={reps} />;
}
