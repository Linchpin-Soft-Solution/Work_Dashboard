import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ReportsClient from "./ReportsClient";

export const metadata = {
  title: "Daily Reports - Linchpin",
};

export default async function ReportsPage() {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return <ReportsClient />;
}
