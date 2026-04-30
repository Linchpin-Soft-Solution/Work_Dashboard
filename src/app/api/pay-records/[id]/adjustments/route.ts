import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const payRecordId = id;
    const body = await req.json();
    const { amount, type, reason } = body;

    if (!amount || !type || !reason) {
      return NextResponse.json({ error: "amount, type, and reason are required" }, { status: 400 });
    }

    const payRecord = await prisma.payRecord.findUnique({ where: { id: payRecordId } });
    if (!payRecord) {
      return NextResponse.json({ error: "Pay record not found" }, { status: 404 });
    }

    const adjustment = await prisma.payAdjustment.create({
      data: {
        payRecordId,
        amount: Number(amount),
        type,
        reason,
        createdByAdminId: session.user.id,
      }
    });

    // Update final pay
    const adjustmentValue = type === "DEDUCTION" ? -Number(amount) : Number(amount);
    
    const updatedRecord = await prisma.payRecord.update({
      where: { id: payRecordId },
      data: {
        finalPay: payRecord.finalPay + adjustmentValue,
      },
      include: {
        User: { select: { id: true, name: true, designation: true } },
        PayAdjustment: true
      }
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        adminId: session.user.id,
        actionType: "ADD_PAY_ADJUSTMENT",
        affectedUserId: payRecord.userId,
        details: `Added ${type} of ${amount} to pay record for ${payRecord.month.toISOString()}`,
        reason: reason,
      }
    });

    return NextResponse.json({ payRecord: updatedRecord });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to add adjustment" }, { status: 500 });
  }
}
