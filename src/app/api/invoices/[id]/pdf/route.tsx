import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { renderToStream } from "@react-pdf/renderer";
import { InvoicePDF } from "@/components/InvoicePDF";

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

    const companyDetails = {
      name: "Linchpin Soft Solution",
      tagline: "Digital Marketing & Creative Studio",
      address: "123, Tech Park, Sector 18, Noida - 201301",
      email: "contact@linchpinsoft.com",
      phone: "+91 98765 43210",
      gstin: "09XXXXX0000X1Z5",
      bank: "HDFC Bank",
      ifsc: "HDFC0001234",
      upi: "linchpin@hdfcbank"
    };

    // Render the PDF to a Node stream
    const stream = await renderToStream(
      <InvoicePDF invoice={invoice} companyDetails={companyDetails} />
    );

    return new NextResponse(stream as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Failed to generate PDF:", error);
    return NextResponse.json({ error: "Failed to generate PDF", details: error.message || String(error) }, { status: 500 });
  }
}
