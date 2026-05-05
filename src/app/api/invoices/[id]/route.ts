import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: { orderBy: { sortOrder: 'asc' } } }
    });

    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ invoice });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch invoice" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const {
      clientName, clientEmail, clientPhone, clientAddress, clientGstin,
      projectName, issueDate, dueDate, lineItems, discountPercent, notes, isQuotation
    } = body;

    if (!clientName || !lineItems || !Array.isArray(lineItems)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Calculate totals in paise
    let subtotal = 0;
    let gstAmount = 0;
    const itemsData = lineItems.map((item: any, index: number) => {
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

    // Delete old items and create new ones
    await prisma.invoiceItem.deleteMany({
      where: { invoiceId: id }
    });

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        clientName, clientEmail, clientPhone, clientAddress, clientGstin,
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
    console.error("Failed to update invoice:", error);
    return NextResponse.json({ error: error.message || "Failed to update invoice" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    const invoice = await prisma.invoice.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ invoice });
  } catch (error: any) {
    console.error("Failed to update invoice:", error);
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    await prisma.invoice.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete invoice:", error);
    return NextResponse.json({ error: "Failed to delete invoice" }, { status: 500 });
  }
}
