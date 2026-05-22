import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { renderToStream } from "@react-pdf/renderer";
import { PaySlipPDF } from "@/components/PaySlipPDF";
import path from "path";
import fs from "fs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const payRecord = await prisma.payRecord.findUnique({
      where: { id },
      include: { 
        User: { select: { id: true, name: true, designation: true } },
        PayAdjustment: true 
      }
    });

    if (!payRecord) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isAdmin = session.user.role === "ADMIN";
    if (!isAdmin && payRecord.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const logoPath = path.join(process.cwd(), "public", "linchpin-logo.png");
    const signPath = path.join(process.cwd(), "public", "sign.png");
    
    let logoData = "";
    try {
      if (fs.existsSync(logoPath)) {
        const buffer = fs.readFileSync(logoPath);
        logoData = `data:image/png;base64,${buffer.toString('base64')}`;
      }
    } catch (e) {
      console.error("Logo not found at", logoPath);
    }

    let signData = "";
    try {
      if (fs.existsSync(signPath)) {
        const buffer = fs.readFileSync(signPath);
        signData = `data:image/png;base64,${buffer.toString('base64')}`;
      }
    } catch (e) {
      console.error("Signature not found at", signPath);
    }

    const companyDetails = {
      name: "Linchpin Soft Solutions Private Limited",
      logoUrl: logoData,
      signatureUrl: signData,
      address: "Begumpet, Hyderabad - 500016",
      email: "info@linchpinsoftsolution.com",
      phone: "+91 74163 93958",
      gstin: "36AAFCL5842D12L"
    };

    const stream = await renderToStream(
      <PaySlipPDF payRecord={payRecord} companyDetails={companyDetails} />
    );

    const monthDate = new Date(payRecord.month);
    const filename = `Payslip_${payRecord.User.name.replace(/\s+/g, '_')}_${monthDate.toLocaleString('default', { month: 'short' })}_${monthDate.getFullYear()}.pdf`;

    return new NextResponse(stream as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Failed to generate PDF:", error);
    return NextResponse.json({ error: "Failed to generate PDF", details: error.message || String(error) }, { status: 500 });
  }
}
