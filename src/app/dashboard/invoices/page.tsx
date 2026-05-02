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
    include: { 
      User: { select: { name: true } },
      items: true 
    },
  });

  const companyDetails = {
    name: "Linchpin Soft Solutions Private Limited",
    address: "Begumpet, Hyderabad - 500016",
    email: "info@linchpinsoftsolution.com",
    phone: "+91 74163 93958",
    gstin: "36AAFCL5842D12L",
    bank: "YES Bank",
    bank_account_number: "000663700003726",
    ifsc: "YESB0000006",
    bank_address: "Raj Bhavan Road, Somajiguda, Hyderabad - 500082",
    logoUrl: "/linchpin-logo.png",
  };

  return <InvoicesClient initialInvoices={invoices} companyDetails={companyDetails} />;
}
