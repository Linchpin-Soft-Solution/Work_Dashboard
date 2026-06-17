// Shared client-side types and label maps for the Sales CRM UI.

export type CallOutcome =
  | "CONNECTED_INTERESTED"
  | "CONNECTED_CALLBACK"
  | "CONNECTED_NOT_INTERESTED"
  | "NO_ANSWER"
  | "UNREACHABLE"
  | "WRONG_NUMBER";

export type LeadSource = "REFERRAL" | "INBOUND" | "COLD_LIST" | "EVENT" | "OTHER";

export type CrmActivityType = "CALL" | "REMARK" | "STAGE_CHANGE" | "ASSIGNMENT" | "FOLLOW_UP_SET";

export interface Stage {
  id: string;
  name: string;
  sortOrder: number;
  isWon: boolean;
  isLost: boolean;
  isActive?: boolean;
}

export interface RepRef {
  id: string;
  name: string;
}

export interface Prospect {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string | null;
  city: string | null;
  industry: string | null;
  source: LeadSource;
  dealValue: number | null;
  stageId: string;
  assignedRepId: string;
  nextFollowUpAt: string | null;
  lastCallOutcome: CallOutcome | null;
  lostReason: string | null;
  isInvalid: boolean;
  createdAt: string;
  updatedAt: string;
  Stage: Stage;
  Rep: RepRef;
}

export interface TimelineCall {
  id: string;
  outcome: CallOutcome;
  durationSeconds: number | null;
  remark: string | null;
  calledAt: string;
  User: RepRef;
}

export interface TimelineRemark {
  id: string;
  text: string;
  createdAt: string;
  User: RepRef;
}

export interface TimelineActivity {
  id: string;
  type: CrmActivityType;
  detail: string;
  createdAt: string;
  User: RepRef;
}

export interface ProspectDetail extends Prospect {
  Calls: TimelineCall[];
  Remarks: TimelineRemark[];
  Activities: TimelineActivity[];
}

export const OUTCOME_LABELS: Record<CallOutcome, string> = {
  CONNECTED_INTERESTED: "Connected — Interested",
  CONNECTED_CALLBACK: "Connected — Call back later",
  CONNECTED_NOT_INTERESTED: "Connected — Not interested",
  NO_ANSWER: "No answer / Busy",
  UNREACHABLE: "Switched off / Unreachable",
  WRONG_NUMBER: "Wrong / Invalid number",
};

export const OUTCOME_ORDER: CallOutcome[] = [
  "CONNECTED_INTERESTED",
  "CONNECTED_CALLBACK",
  "CONNECTED_NOT_INTERESTED",
  "NO_ANSWER",
  "UNREACHABLE",
  "WRONG_NUMBER",
];

export const SOURCE_LABELS: Record<LeadSource, string> = {
  REFERRAL: "Referral",
  INBOUND: "Inbound",
  COLD_LIST: "Cold list",
  EVENT: "Event",
  OTHER: "Other",
};

export const SOURCE_ORDER: LeadSource[] = ["REFERRAL", "INBOUND", "COLD_LIST", "EVENT", "OTHER"];

export function formatINR(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Visual helpers ──────────────────────────────────────────────────────────

// Coloured pill classes for a pipeline stage, keyed off its won/lost flags.
export function stageBadgeClass(stage: { isWon?: boolean; isLost?: boolean }): string {
  if (stage.isWon)
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-transparent";
  if (stage.isLost)
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-transparent";
  return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-transparent";
}

// A solid accent colour (for dots / left borders) for a stage.
export function stageDotClass(stage: { isWon?: boolean; isLost?: boolean }): string {
  if (stage.isWon) return "bg-emerald-500";
  if (stage.isLost) return "bg-red-500";
  return "bg-blue-500";
}

// Coloured pill classes for a call outcome.
export function outcomeBadgeClass(outcome: CallOutcome): string {
  switch (outcome) {
    case "CONNECTED_INTERESTED":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-transparent";
    case "CONNECTED_CALLBACK":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-transparent";
    case "CONNECTED_NOT_INTERESTED":
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 border-transparent";
    case "NO_ANSWER":
    case "UNREACHABLE":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-transparent";
    case "WRONG_NUMBER":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-transparent";
  }
}

// Follow-up urgency relative to "now" — drives highlighting.
export function followUpStatus(value: string | null): "none" | "overdue" | "today" | "upcoming" {
  if (!value) return "none";
  const d = new Date(value);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  if (d < start) return "overdue";
  if (d <= end) return "today";
  return "upcoming";
}
