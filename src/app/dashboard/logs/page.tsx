import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import LogsClient from "./LogsClient";

export default async function LogsPage() {
  const session = await auth();
  if (!session) return null;

  const isAdmin = session.user.role === "ADMIN";
  let users: { id: string; name: string; designation: string | null }[] = [];
  
  if (isAdmin) {
    users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, designation: true },
      orderBy: { name: "asc" },
    });
  }

  return <LogsClient session={session} users={users} />;
}
