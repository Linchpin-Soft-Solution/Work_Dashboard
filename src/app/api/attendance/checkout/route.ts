import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { todayIST } from "@/lib/utils";

export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = todayIST();
  const now = new Date();

  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId: session.user.id, date: today } },
  });

  if (!existing || !existing.checkInTime) {
    return NextResponse.json(
      { error: "You haven't checked in yet today." },
      { status: 409 }
    );
  }

  if (existing.checkOutTime) {
    return NextResponse.json(
      { error: "Already checked out today." },
      { status: 409 }
    );
  }

  const record = await prisma.attendance.update({
    where: { userId_date: { userId: session.user.id, date: today } },
    data: { checkOutTime: now },
  });

  return NextResponse.json({ record });
}
