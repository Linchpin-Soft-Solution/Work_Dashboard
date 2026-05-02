import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { renderToStream } from "@react-pdf/renderer";
import { InvoicePDF } from "@/components/InvoicePDF";
import path from "path";
import fs from "fs";

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

    const logoPath = path.join(process.cwd(), "public", "linchpin-logo.png");
    let logoData = "";
    try {
      const buffer = fs.readFileSync(logoPath);
      logoData = `data:image/png;base64,${buffer.toString('base64')}`;
    } catch (e) {
      console.error("Logo not found at", logoPath);
    }

    const companyDetails = {
      name: "Linchpin Soft Solutions Private Limited",
      logoUrl: logoData,
      address: "Begumpet, Hyderabad - 500016",
      email: "info@linchpinsoftsolution.com",
      phone: "+91 74163 93958",
      gstin: "36AAFCL5842D12L",
      bank: "YES Bank",
      bank_account_number: "000663700003726",
      ifsc: "YESB0000006",
      bank_address: "Raj Bhavan Road, Somajiguda, Hyderabad - 500082"
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
