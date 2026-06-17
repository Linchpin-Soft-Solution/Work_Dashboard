import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { canAccessCrm } from "@/lib/crm-auth";

// Gate the whole /crm section to CRM-capable roles.
export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canAccessCrm(session.user.role)) redirect("/");
  return <>{children}</>;
}
