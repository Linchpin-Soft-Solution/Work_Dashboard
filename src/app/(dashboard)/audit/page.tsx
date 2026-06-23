import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canViewAuditLog } from "@/lib/audit-access";
import AuditClient from "./AuditClient";

export default async function AuditLogPage() {
  const session = await auth();

  // Restricted to a single user — other admins are not allowed.
  if (!session || !canViewAuditLog(session.user)) {
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
