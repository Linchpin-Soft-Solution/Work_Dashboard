import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isCrmManager } from "@/lib/crm-auth";
import ReportsClient from "./ReportsClient";

export default async function ReportsPage() {
  const session = await auth();
  if (!session) return null;
  if (!isCrmManager(session.user.role)) redirect("/crm");
  return <ReportsClient />;
}
