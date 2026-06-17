import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessCrm, isCrmManager } from "@/lib/crm-auth";
import { Prisma } from "@/generated/prisma";

// GET /api/crm/dashboard — rep worklist or manager rollup
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessCrm(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const manager = isCrmManager(session.user.role);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);

  // Reps are scoped to their own prospects; managers see the whole team.
  const scope: Prisma.ProspectWhereInput = manager ? {} : { assignedRepId: session.user.id };
  const callScope: Prisma.CallWhereInput = manager ? {} : { userId: session.user.id };

  // Pipeline: count + value by stage.
  const stages = await prisma.pipelineStage.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  const grouped = await prisma.prospect.groupBy({
    by: ["stageId"],
    where: scope,
    _count: { _all: true },
    _sum: { dealValue: true },
  });
  const pipeline = stages.map((s) => {
    const g = grouped.find((x) => x.stageId === s.id);
    return {
      stageId: s.id,
      name: s.name,
      isWon: s.isWon,
      isLost: s.isLost,
      count: g?._count._all ?? 0,
      value: g?._sum.dealValue ?? 0,
    };
  });

  const [callsDueToday, overdueFollowUps, callsLoggedToday] = await Promise.all([
    prisma.prospect.count({
      where: { ...scope, nextFollowUpAt: { gte: startOfToday, lte: endOfToday } },
    }),
    prisma.prospect.count({
      where: { ...scope, nextFollowUpAt: { lt: startOfToday } },
    }),
    prisma.call.count({
      where: { ...callScope, calledAt: { gte: startOfToday, lte: endOfToday } },
    }),
  ]);

  const wonStageIds = stages.filter((s) => s.isWon).map((s) => s.id);
  const lostStageIds = stages.filter((s) => s.isLost).map((s) => s.id);
  const [wonThisMonth, lostThisMonth] = await Promise.all([
    prisma.prospect.count({
      where: { ...scope, stageId: { in: wonStageIds }, updatedAt: { gte: startOfMonth } },
    }),
    prisma.prospect.count({
      where: { ...scope, stageId: { in: lostStageIds }, updatedAt: { gte: startOfMonth } },
    }),
  ]);

  const base = {
    manager,
    pipeline,
    callsDueToday,
    overdueFollowUps,
    callsLoggedToday,
    wonThisMonth,
    lostThisMonth,
  };

  if (!manager) return NextResponse.json(base);

  // Manager extra: calls logged per rep this month.
  const reps = await prisma.user.findMany({
    where: { role: "SALES_REP" },
    select: { id: true, name: true },
  });
  const callsByRep = await prisma.call.groupBy({
    by: ["userId"],
    where: { calledAt: { gte: startOfMonth } },
    _count: { _all: true },
  });
  const repActivity = reps.map((r) => ({
    repId: r.id,
    name: r.name,
    callsThisMonth: callsByRep.find((c) => c.userId === r.id)?._count._all ?? 0,
  }));

  return NextResponse.json({ ...base, repActivity });
}
