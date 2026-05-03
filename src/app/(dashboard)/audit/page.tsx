import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import AuditClient from "./AuditClient";

export default async function AuditLogPage() {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    redirect("/");
  }

  // Fetch audit logs
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 500, // Limit to recent 500 for performance
  });

  // Fetch users for mapping IDs to names
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
  });

  return <AuditClient initialLogs={logs} users={users} />;
}
