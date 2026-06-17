// Shared role helpers for the Sales CRM module.
//
// Two dedicated CRM roles live on the User.role enum: SALES_MANAGER and
// SALES_REP. ADMIN is granted full manager access for oversight.
//   - Managers (SALES_MANAGER | ADMIN) act across the whole team.
//   - Reps (SALES_REP) are scoped to prospects assigned to them.

export function canAccessCrm(role: string): boolean {
  return role === "SALES_MANAGER" || role === "SALES_REP" || role === "ADMIN";
}

export function isCrmManager(role: string): boolean {
  return role === "SALES_MANAGER" || role === "ADMIN";
}
