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
    name: "Linchpin Soft Solution",
    tagline: "Digital Marketing & Creative Studio",
    address: "123, Tech Park, Sector 18, Noida - 201301",
    email: "contact@linchpinsoft.com",
    phone: "+91 98765 43210",
    gstin: "09XXXXX0000X1Z5",
    bank: "HDFC Bank",
    ifsc: "HDFC0001234",
    upi: "linchpin@hdfcbank",
  };

  return <InvoicesClient initialInvoices={invoices} companyDetails={companyDetails} />;
}
