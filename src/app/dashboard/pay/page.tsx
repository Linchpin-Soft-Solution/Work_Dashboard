import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import PayRecordsClient from "./PayRecordsClient";

export default async function PayPage() {
  const session = await auth();
  if (!session) return null;

  const isAdmin = session.user.role === "ADMIN";

  let users: { id: string; name: string; designation: string | null; baseMonthlySalary: number }[] = [];

  if (isAdmin) {
    users = await prisma.user.findMany({
      where: { isActive: true, role: { in: ["EMPLOYEE", "INTERN"] } },
      select: { id: true, name: true, designation: true, baseMonthlySalary: true },
      orderBy: { name: "asc" },
    });
  }

  return <PayRecordsClient session={session} users={users} />;
}
