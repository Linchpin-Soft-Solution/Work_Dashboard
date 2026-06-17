import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { isCrmManager } from "@/lib/crm-auth";
import ImportClient from "./ImportClient";

export default async function ImportPage() {
  const session = await auth();
  if (!session) return null;
  if (!isCrmManager(session.user.role)) redirect("/crm");

  const reps = await prisma.user.findMany({
    where: { role: "SALES_REP", isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return <ImportClient reps={reps} />;
}
