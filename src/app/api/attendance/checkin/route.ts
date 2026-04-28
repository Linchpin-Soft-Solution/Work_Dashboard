import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

function getISTHour(): { hour: number; minute: number } {
  // IST = UTC+5:30
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const istMs = utcMs + 5.5 * 60 * 60 * 1000;
  const ist = new Date(istMs);
  return { hour: ist.getHours(), minute: ist.getMinutes() };
}

function todayIST(): Date {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const istMs = utcMs + 5.5 * 60 * 60 * 1000;
  const ist = new Date(istMs);
  // Return midnight IST as UTC date
  return new Date(Date.UTC(ist.getFullYear(), ist.getMonth(), ist.getDate()));
}

export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // IP check — only enforced when IP_CHECK=true
  if (process.env.IP_CHECK === "true") {
    const headersList = await headers();
    const forwarded = headersList.get("x-forwarded-for");
    const clientIp = forwarded ? forwarded.split(",")[0].trim() : null;
    const officeIp = process.env.OFFICE_IP;

    if (clientIp !== officeIp) {
      return NextResponse.json(
        { error: "You must be connected to the office WiFi to check in." },
        { status: 403 }
      );
    }
  }

  const today = todayIST();
  const now = new Date();

  // Determine status from IST time
  const { hour, minute } = getISTHour();
  const isLate = hour > 9 || (hour === 9 && minute >= 30);
  const status = isLate ? "LATE" : "PRESENT";
  const payMultiplier = isLate ? 0.5 : 1.0;

  // Block if already checked in or if day is a holiday
  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId: session.user.id, date: today } },
  });

  if (existing?.status === "HOLIDAY") {
    return NextResponse.json(
      { error: "Today is a company holiday. No check-in required." },
      { status: 409 }
    );
  }

  if (existing?.checkInTime) {
    return NextResponse.json(
      { error: "Already checked in today." },
      { status: 409 }
    );
  }

  const record = await prisma.attendance.upsert({
    where: { userId_date: { userId: session.user.id, date: today } },
    update: { checkInTime: now, status, payMultiplier },
    create: {
      userId: session.user.id,
      date: today,
      checkInTime: now,
      status,
      payMultiplier,
    },
  });

  return NextResponse.json({ record });
}
