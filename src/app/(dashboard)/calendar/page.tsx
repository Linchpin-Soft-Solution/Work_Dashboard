import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import CalendarClient from "./CalendarClient";

export default async function CalendarPage() {
  const session = await auth();
  if (!session) return null;

  const isAdmin = session.user.role === "ADMIN";
  let users: { id: string; name: string }[] = [];

  if (isAdmin) {
    users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  return <CalendarClient session={session} users={users} />;
}
