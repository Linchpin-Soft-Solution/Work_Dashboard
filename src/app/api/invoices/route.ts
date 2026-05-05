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
      clientEmail,
      clientPhone,
      clientAddress,
      clientGstin,
      projectName,
      issueDate,
      dueDate,
      lineItems,
      discountPercent,
      notes,
      isQuotation,
    } = body;

    if (!clientName || !lineItems || !Array.isArray(lineItems)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Generate Invoice/Quotation Number
    const prefix = isQuotation ? "LSS-QT" : "LSS-INV";
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
      // Format: LSS-INV-YYYY-XXX
      const lastPart = parts[parts.length - 1];
      nextNum = parseInt(lastPart, 10) + 1;
    }

    const invoiceNumber = `${prefix}-${year}-${String(nextNum).padStart(3, "0")}`;

    // Calculate totals in paise (integers)
    let subtotal = 0;
    let gstAmount = 0;
    const itemsData = lineItems.map((item: any, index: number) => {
      // Inputs are in rupees (floats), convert to paise (integers)
      const qty = parseInt(item.qty, 10) || 1;
      const rateRupees = parseFloat(item.rate) || 0;
      const ratePaise = Math.round(rateRupees * 100);
      const parsedGst = parseFloat(item.gstPercent);
      const gstPercent = isNaN(parsedGst) ? 18.0 : parsedGst;

      const itemTotalPaise = qty * ratePaise;
      const itemGstPaise = Math.round(itemTotalPaise * (gstPercent / 100));

      subtotal += itemTotalPaise;
      gstAmount += itemGstPaise;

      return {
        name: item.name || item.description,
        description: item.description,
        category: item.category || "General",
        qty,
        rate: ratePaise,
        gstPercent,
        sortOrder: index,
      };
    });

    const discPercent = parseFloat(discountPercent) || 0;
    const discountAmountPaise = Math.round(subtotal * (discPercent / 100));
    const totalAmountPaise = subtotal + gstAmount - discountAmountPaise;

    const invoice = await prisma.invoice.create({
      data: {
        createdById: session.user.id,
        invoiceNumber,
        clientName,
        clientEmail,
        clientPhone,
        clientAddress,
        clientGstin,
        projectName,
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        subtotal,
        gstAmount,
        discountPercent: discPercent,
        discountAmount: discountAmountPaise,
        totalAmount: totalAmountPaise,
        notes,
        isQuotation: !!isQuotation,
        status: "DRAFT",
        items: {
          create: itemsData,
        },
      },
      include: {
        items: true,
      }
    });

    return NextResponse.json({ invoice });
  } catch (error: any) {
    console.error("Failed to create invoice:", error);
    return NextResponse.json({ error: error.message || "Failed to create invoice" }, { status: 500 });
  }
}
