import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/attendance?month=2025-04 OR /api/attendance?userId=xxx&date=2025-04-28
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const isAdmin = session.user.role === "ADMIN";

  // Admin fetching a specific date for all employees
  if (isAdmin && searchParams.get("date") && !searchParams.get("userId")) {
    const date = new Date(searchParams.get("date")!);
    const records = await prisma.attendance.findMany({
      where: { date },
      include: { User: { select: { id: true, name: true, designation: true } } },
      orderBy: { User: { name: "asc" } },
    });
    return NextResponse.json({ records });
  }

  // Fetch a specific employee's monthly records (admin or self)
  const targetUserId = isAdmin && searchParams.get("userId")
    ? searchParams.get("userId")!
    : session.user.id;

  const monthParam = searchParams.get("month"); // e.g. "2025-04"
  let startDate: Date, endDate: Date;

  if (monthParam) {
    const [year, month] = monthParam.split("-").map(Number);
    startDate = new Date(Date.UTC(year, month - 1, 1));
    endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));
  } else {
    // Default: current month in IST
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const istMs = utcMs + 5.5 * 60 * 60 * 1000;
    const ist = new Date(istMs);
    startDate = new Date(Date.UTC(ist.getFullYear(), ist.getMonth(), 1));
    endDate = new Date(Date.UTC(ist.getFullYear(), ist.getMonth() + 1, 0, 23, 59, 59));
  }

  const records = await prisma.attendance.findMany({
    where: {
      userId: targetUserId,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ records });
}
