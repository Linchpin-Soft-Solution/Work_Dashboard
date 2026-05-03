import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import TargetsClient from "./TargetsClient";

export default async function TargetsPage() {
  const session = await auth();
  if (!session) return null;

  const isAdmin = session.user.role === "ADMIN";
  let users: { id: string; name: string; designation: string | null }[] = [];
  
  if (isAdmin) {
    users = await prisma.user.findMany({
      where: { isActive: true, role: { in: ["EMPLOYEE", "INTERN"] } },
      select: { id: true, name: true, designation: true },
      orderBy: { name: "asc" },
    });
  }

  return <TargetsClient session={session} users={users} />;
}
