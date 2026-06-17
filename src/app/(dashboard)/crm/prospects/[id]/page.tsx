import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isCrmManager } from "@/lib/crm-auth";
import ProspectDetailClient from "./ProspectDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProspectDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session) return null;

  const { id } = await params;
  const manager = isCrmManager(session.user.role);
  const reps = manager
    ? await prisma.user.findMany({
        where: { role: "SALES_REP", isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  return <ProspectDetailClient prospectId={id} isManager={manager} reps={reps} />;
}
