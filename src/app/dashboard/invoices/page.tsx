import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import InvoicesClient from "./InvoicesClient";

export default async function InvoicesPage() {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    include: { User: { select: { name: true } } },
  });

  const companyDetails = {
    name: process.env.COMPANY_NAME || "Linchpin Soft Solution",
    address: process.env.COMPANY_ADDRESS || "Begumpet Hyderabad",
    gstin: process.env.COMPANY_GSTIN || "",
  };

  return <InvoicesClient initialInvoices={invoices} companyDetails={companyDetails} />;
}
