import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isCrmManager } from "@/lib/crm-auth";
import StagesClient from "./StagesClient";

export default async function StagesPage() {
  const session = await auth();
  if (!session) return null;
  if (!isCrmManager(session.user.role)) redirect("/crm");
  return <StagesClient />;
}
