import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function todayIST(): Date {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const istMs = utcMs + 5.5 * 60 * 60 * 1000;
  const ist = new Date(istMs);
  return new Date(Date.UTC(ist.getFullYear(), ist.getMonth(), ist.getDate()));
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    const today = todayIST();

    // 11:59 PM IST = 18:29 UTC
    const checkOutTime = new Date(today.getTime() + (18 * 60 + 29) * 60 * 1000);

    // Find all attendance records for today where the user checked in but did not check out
    const unfinishedRecords = await prisma.attendance.findMany({
      where: {
        date: today,
        checkInTime: { not: null },
        checkOutTime: null,
      },
      include: {
        User: {
          select: {
            name: true,
          },
        },
      },
    });

    if (unfinishedRecords.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No users required auto-checkout today.",
        updatedCount: 0,
      });
    }

    // Update checkOutTime for all of them
    const updatedIds = unfinishedRecords.map(r => r.id);
    await prisma.attendance.updateMany({
      where: {
        id: { in: updatedIds },
      },
      data: {
        checkOutTime,
      },
    });

    const names = unfinishedRecords.map(r => r.User.name);

    return NextResponse.json({
      success: true,
      message: `Successfully auto-checked out ${unfinishedRecords.length} users.`,
      updatedUsers: names,
      updatedCount: unfinishedRecords.length,
    });
  } catch (error: any) {
    console.error("Auto-Checkout Cron Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
