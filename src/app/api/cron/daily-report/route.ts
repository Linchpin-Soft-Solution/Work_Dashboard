import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDailyReportSummary } from "@/lib/openrouter";
import { Resend } from "resend";
import { todayIST } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    
    // In development environments, we bypass the CRON_SECRET check for easier local testing.
    if (process.env.NODE_ENV === "production") {
      if (!process.env.CRON_SECRET) {
        console.error("Daily-Report Cron Error: CRON_SECRET is not defined in environment variables on Vercel.");
        return new Response("Unauthorized: CRON_SECRET is missing", { status: 401 });
      }

      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.error("Daily-Report Cron Error: Invalid Authorization header.");
        return new Response("Unauthorized", { status: 401 });
      }
    } else {
      console.log("Daily-Report Cron: Bypassing authentication check in development mode.");
    }

    const today = todayIST();

    const nextDay = new Date(today);
    nextDay.setDate(nextDay.getDate() + 1);

    // Gather data
    const attendances = await prisma.attendance.findMany({
      where: { date: { gte: today, lt: nextDay } },
      include: { User: true },
    });

    const logs = await prisma.dailyLog.findMany({
      where: { date: { gte: today, lt: nextDay } },
      include: { User: true },
    });

    const targets = await prisma.target.findMany({
      where: { status: "COMPLETED", updatedAt: { gte: today, lt: nextDay } },
      include: { User_Target_assignedToIdToUser: true },
    });

    let compileData = `Date: ${today.toDateString()}\n\n`;
    compileData += `Attendance:\n`;
    if (attendances.length === 0) compileData += "No attendance records.\n";
    attendances.forEach(a => { compileData += `- ${a.User.name}: ${a.status}\n`; });
    compileData += `\nDaily Logs:\n`;
    if (logs.length === 0) compileData += "No daily logs submitted.\n";
    logs.forEach(l => { compileData += `- ${l.User.name}: ${l.content}\n`; });
    compileData += `\nCompleted Targets:\n`;
    if (targets.length === 0) compileData += "No targets completed today.\n";
    targets.forEach(t => { compileData += `- ${t.title} (by ${t.User_Target_assignedToIdToUser.name})\n`; });
    compileData += `\n`;

    const aiSummary = await generateDailyReportSummary(compileData);

    const report = await prisma.dailyReport.upsert({
      where: { date: today },
      update: { content: aiSummary, generatedAt: new Date(), emailSent: false },
      create: { date: today, content: aiSummary },
    });

    // Email to admins
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true } });
      const adminEmails = admins.map(a => a.email);

      if (adminEmails.length > 0) {
        await resend.emails.send({
          from: "Linchpin <noreply@linchpinsoftsolution.com>",
          to: adminEmails,
          subject: `Daily Report: ${today.toDateString()}`,
          text: aiSummary,
        });

        await prisma.dailyReport.update({
          where: { id: report.id },
          data: { emailSent: true },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
