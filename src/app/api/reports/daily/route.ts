import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateDailyReportSummary } from "@/lib/openrouter";
import { Resend } from "resend";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reports = await prisma.dailyReport.findMany({
      orderBy: { date: "desc" },
    });

    return NextResponse.json(reports);
  } catch (error: any) {
    console.error("Failed to fetch daily reports:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const authHeader = req.headers.get("Authorization");
    const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (!isCron && (!session || session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { date: reqDate, sendEmail } = await req.json().catch(() => ({ date: null, sendEmail: false }));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = reqDate ? new Date(reqDate) : today;
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // 1. Gather Attendance
    const attendances = await prisma.attendance.findMany({
      where: {
        date: {
          gte: targetDate,
          lt: nextDay,
        },
      },
      include: { User: true },
    });

    // 2. Gather Daily Logs
    const logs = await prisma.dailyLog.findMany({
      where: {
        date: {
          gte: targetDate,
          lt: nextDay,
        },
      },
      include: { User: true },
    });

    // 3. Gather Completed Targets
    const targets = await prisma.target.findMany({
      where: {
        status: "COMPLETED",
        updatedAt: {
          gte: targetDate,
          lt: nextDay,
        },
      },
      include: { User_Target_assignedToIdToUser: true },
    });

    // 4. Format data for OpenRouter
    let compileData = `Date: ${targetDate.toDateString()}\n\n`;

    compileData += `Attendance:\n`;
    if (attendances.length === 0) compileData += "No attendance records.\n";
    attendances.forEach(a => {
      compileData += `- ${a.User.name}: ${a.status}\n`;
    });
    compileData += `\n`;

    compileData += `Daily Logs:\n`;
    if (logs.length === 0) compileData += "No daily logs submitted.\n";
    logs.forEach(l => {
      compileData += `- ${l.User.name}: ${l.content}\n`;
    });
    compileData += `\n`;

    compileData += `Completed Targets:\n`;
    if (targets.length === 0) compileData += "No targets completed today.\n";
    targets.forEach(t => {
      compileData += `- ${t.title} (by ${t.User_Target_assignedToIdToUser.name})\n`;
    });
    compileData += `\n`;

    // 5. Call OpenRouter
    const aiSummary = await generateDailyReportSummary(compileData);

    // 6. Save Report
    const report = await prisma.dailyReport.upsert({
      where: { date: targetDate },
      update: { content: aiSummary, generatedAt: new Date(), emailSent: false },
      create: { date: targetDate, content: aiSummary },
    });

    // 7. Optionally email to admins
    if (sendEmail && process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true } });
      const adminEmails = admins.map(a => a.email);

      if (adminEmails.length > 0) {
        await resend.emails.send({
          from: "Linchpin <noreply@linchpinsoftsolution.com>",
          to: adminEmails,
          subject: `Daily Report: ${targetDate.toDateString()}`,
          text: aiSummary,
        });

        await prisma.dailyReport.update({
          where: { id: report.id },
          data: { emailSent: true },
        });
      }
    }

    return NextResponse.json(report);
  } catch (error: any) {
    console.error("Failed to generate daily report:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
