import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessCrm, isCrmManager } from "@/lib/crm-auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/crm/prospects/[id]/remarks — add a free-text remark
export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessCrm(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const prospect = await prisma.prospect.findUnique({ where: { id } });
    if (!prospect) return NextResponse.json({ error: "Prospect not found" }, { status: 404 });

    if (!isCrmManager(session.user.role) && prospect.assignedRepId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const text = (body.text || "").trim();
    if (!text) return NextResponse.json({ error: "Remark text is required" }, { status: 400 });

    const remark = await prisma.remark.create({
      data: {
        prospectId: id,
        userId: session.user.id,
        text,
      },
    });

    await prisma.crmActivity.create({
      data: {
        prospectId: id,
        userId: session.user.id,
        type: "REMARK",
        detail: text.length > 80 ? `${text.slice(0, 77)}...` : text,
      },
    });

    return NextResponse.json({ remark });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add remark";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
