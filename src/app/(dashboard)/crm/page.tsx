import { auth } from "@/auth";
import CrmDashboardClient from "./CrmDashboardClient";

export default async function CrmDashboardPage() {
  const session = await auth();
  if (!session) return null;
  return <CrmDashboardClient userName={session.user.name ?? "there"} />;
}
