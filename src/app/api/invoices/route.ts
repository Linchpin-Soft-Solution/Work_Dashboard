import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    include: { User: { select: { name: true } } },
  });

  return NextResponse.json({ invoices });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      clientName,
      clientAddress,
      clientGstin,
      lineItems,
      gstRate,
      subtotal,
      gstAmount,
      totalAmount,
      isQuotation,
    } = body;

    // Generate Invoice/Quotation Number
    const prefix = isQuotation ? "QT" : "INV";
    const year = new Date().getFullYear();
    
    // Find highest existing number for this year and type
    const latest = await prisma.invoice.findFirst({
      where: {
        invoiceNumber: { startsWith: `${prefix}-${year}-` },
      },
      orderBy: { invoiceNumber: "desc" },
    });

    let nextNum = 1;
    if (latest) {
      const parts = latest.invoiceNumber.split("-");
      nextNum = parseInt(parts[2], 10) + 1;
    }

    const invoiceNumber = `${prefix}-${year}-${String(nextNum).padStart(3, "0")}`;

    const invoice = await prisma.invoice.create({
      data: {
        createdById: session.user.id,
        invoiceNumber,
        clientName,
        clientAddress,
        clientGstin,
        lineItems,
        gstRate: parseFloat(gstRate) || 0,
        subtotal: parseFloat(subtotal) || 0,
        gstAmount: parseFloat(gstAmount) || 0,
        totalAmount: parseFloat(totalAmount) || 0,
        isQuotation: !!isQuotation,
        status: "DRAFT",
      },
    });

    return NextResponse.json({ invoice });
  } catch (error: any) {
    console.error("Failed to create invoice:", error);
    return NextResponse.json({ error: error.message || "Failed to create invoice" }, { status: 500 });
  }
}
