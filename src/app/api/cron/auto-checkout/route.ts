import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { todayIST } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    
    // In development environments, we bypass the CRON_SECRET check for easier local testing.
    if (process.env.NODE_ENV === "production") {
      if (!process.env.CRON_SECRET) {
        console.error("Auto-Checkout Cron Error: CRON_SECRET is not defined in environment variables on Vercel.");
        return new Response("Unauthorized: CRON_SECRET is missing", { status: 401 });
      }

      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.error("Auto-Checkout Cron Error: Invalid Authorization header.");
        return new Response("Unauthorized", { status: 401 });
      }
    } else {
      console.log("Auto-Checkout Cron: Bypassing authentication check in development mode.");
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
