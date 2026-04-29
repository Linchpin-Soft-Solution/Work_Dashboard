import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; adjId: string } }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adjustment = await prisma.payAdjustment.findUnique({
      where: { id: params.adjId },
    });

    if (!adjustment || adjustment.payRecordId !== params.id) {
      return NextResponse.json({ error: "Adjustment not found" }, { status: 404 });
    }

    await prisma.payAdjustment.delete({ where: { id: params.adjId } });

    // Revert finalPay on parent record
    const adjustmentValue =
      adjustment.type === "DEDUCTION" ? adjustment.amount : -adjustment.amount;

    const updated = await prisma.payRecord.update({
      where: { id: params.id },
      data: { finalPay: { increment: adjustmentValue } },
      include: {
        User: { select: { id: true, name: true, designation: true } },
        PayAdjustment: true,
      },
    });

    return NextResponse.json({ payRecord: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete adjustment" },
      { status: 500 }
    );
  }
}
