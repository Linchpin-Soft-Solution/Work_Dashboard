// Access control for the Audit Log.
//
// The audit log is restricted to a single person — even other ADMINs cannot
// see it. Allowed if the user's id or name matches the values below.

const AUDIT_ALLOWED_ID = "cmpupqdld0006jr04nj0uksd8";
const AUDIT_ALLOWED_NAME = "Akshay";

export function canViewAuditLog(user: {
  id?: string | null;
  name?: string | null;
}): boolean {
  return user?.id === AUDIT_ALLOWED_ID || user?.name === AUDIT_ALLOWED_NAME;
}
