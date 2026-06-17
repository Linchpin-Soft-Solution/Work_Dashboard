import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isCrmManager } from "@/lib/crm-auth";
import { Prisma } from "@/generated/prisma";

// GET /api/crm/reports?from=&to= — manager report set
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isCrmManager(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  const to = toParam ? new Date(toParam) : new Date();
  to.setHours(23, 59, 59, 999);
  const from = fromParam ? new Date(fromParam) : new Date(to.getFullYear(), to.getMonth() - 1, to.getDate());
  from.setHours(0, 0, 0, 0);

  const callWindow: Prisma.CallWhereInput = { calledAt: { gte: from, lte: to } };

  // ── Call activity: calls per rep + connect rate ──────────────────────────────
  const reps = await prisma.user.findMany({
    where: { role: "SALES_REP" },
    select: { id: true, name: true },
  });
  const callsByRep = await prisma.call.groupBy({
    by: ["userId"],
    where: callWindow,
    _count: { _all: true },
  });
  const connectedByRep = await prisma.call.groupBy({
    by: ["userId"],
    where: {
      ...callWindow,
      outcome: { in: ["CONNECTED_INTERESTED", "CONNECTED_CALLBACK", "CONNECTED_NOT_INTERESTED"] },
    },
    _count: { _all: true },
  });
  const callActivity = reps.map((r) => {
    const total = callsByRep.find((c) => c.userId === r.id)?._count._all ?? 0;
    const connected = connectedByRep.find((c) => c.userId === r.id)?._count._all ?? 0;
    return {
      repId: r.id,
      name: r.name,
      calls: total,
      connected,
      connectRate: total > 0 ? Math.round((connected / total) * 100) : 0,
    };
  });

  // ── Pipeline snapshot: count + value by stage ───────────────────────────────
  const stages = await prisma.pipelineStage.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  const grouped = await prisma.prospect.groupBy({
    by: ["stageId"],
    _count: { _all: true },
    _sum: { dealValue: true },
  });
  const pipelineSnapshot = stages.map((s) => {
    const g = grouped.find((x) => x.stageId === s.id);
    return {
      name: s.name,
      count: g?._count._all ?? 0,
      value: g?._sum.dealValue ?? 0,
    };
  });

  // ── Win/loss: conversion rate + lost-reason breakdown ───────────────────────
  const wonStageIds = stages.filter((s) => s.isWon).map((s) => s.id);
  const lostStageIds = stages.filter((s) => s.isLost).map((s) => s.id);
  const [wonCount, lostCount, totalProspects] = await Promise.all([
    prisma.prospect.count({ where: { stageId: { in: wonStageIds } } }),
    prisma.prospect.count({ where: { stageId: { in: lostStageIds } } }),
    prisma.prospect.count(),
  ]);
  const lostReasonGroups = await prisma.prospect.groupBy({
    by: ["lostReason"],
    where: { stageId: { in: lostStageIds }, lostReason: { not: null } },
    _count: { _all: true },
  });
  const winLoss = {
    won: wonCount,
    lost: lostCount,
    total: totalProspects,
    conversionRate: wonCount + lostCount > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0,
    lostReasons: lostReasonGroups.map((g) => ({ reason: g.lostReason ?? "Unknown", count: g._count._all })),
  };

  // ── Source performance: prospects + won by source ───────────────────────────
  const bySource = await prisma.prospect.groupBy({
    by: ["source"],
    _count: { _all: true },
  });
  const wonBySource = await prisma.prospect.groupBy({
    by: ["source"],
    where: { stageId: { in: wonStageIds } },
    _count: { _all: true },
  });
  const sourcePerformance = bySource.map((g) => {
    const won = wonBySource.find((w) => w.source === g.source)?._count._all ?? 0;
    return {
      source: g.source,
      total: g._count._all,
      won,
      winRate: g._count._all > 0 ? Math.round((won / g._count._all) * 100) : 0,
    };
  });

  return NextResponse.json({
    from: from.toISOString(),
    to: to.toISOString(),
    callActivity,
    pipelineSnapshot,
    winLoss,
    sourcePerformance,
  });
}
