"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Check, 
  X, 
  User, 
  Clock, 
  AlertTriangle, 
  FileText,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/hooks/use-confirm";

interface SessionUser {
  id: string;
  name: string;
  role: "ADMIN" | "EMPLOYEE" | "INTERN";
}

interface EmployeeSummary {
  id: string;
  name: string;
  designation: string | null;
}

interface LeaveRequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  type: "CASUAL" | "SICK" | "PAID" | "UNPAID" | "UNINFORMED";
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  managerNote: string | null;
  approvedById: string | null;
  createdAt: string;
  User: {
    id: string;
    name: string;
    designation: string | null;
    role: string;
  };
}

interface LeavesClientProps {
  sessionUser: SessionUser;
  employees: EmployeeSummary[];
}

// Helper: Calculate total working days in a range (excluding weekends)
function calculateDaysCount(startStr: string, endStr: string): number {
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) { // Skip Sunday & Saturday
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50",
    APPROVED: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50",
    REJECTED: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status === "PENDING" && <Clock className="w-3.5 h-3.5" />}
      {status === "APPROVED" && <CheckCircle2 className="w-3.5 h-3.5" />}
      {status === "REJECTED" && <XCircle className="w-3.5 h-3.5" />}
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    CASUAL: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50",
    SICK: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50",
    PAID: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50",
    UNPAID: "bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-800/50",
    UNINFORMED: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50",
  };

  const labelMap: Record<string, string> = {
    CASUAL: "Casual Leave",
    SICK: "Sick Leave",
    PAID: "Paid Leave",
    UNPAID: "Unpaid Leave",
    UNINFORMED: "Uninformed Leave",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[type] ?? "bg-gray-100 text-gray-600"}`}>
      {labelMap[type] ?? type}
    </span>
  );
}

export default function LeavesClient({ sessionUser, employees }: LeavesClientProps) {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"my-leaves" | "approvals">("my-leaves");
  const { confirm, ConfirmDialog } = useConfirm();

  // Admin and Employee filter options
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Modals state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showLogBehalfModal, setShowLogBehalfModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedLeaveForApproval, setSelectedLeaveForApproval] = useState<LeaveRequest | null>(null);
  const [approvalAction, setApprovalAction] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [managerNote, setManagerNote] = useState("");

  // Form input fields
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leaveType, setLeaveType] = useState<"CASUAL" | "SICK" | "PAID" | "UNPAID" | "UNINFORMED">("CASUAL");
  const [reason, setReason] = useState("");
  const [targetEmployeeId, setTargetEmployeeId] = useState("");
  const [autoApprove, setAutoApprove] = useState(true);

  // Status handling states
  const [actionSaving, setActionSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const isAdmin = sessionUser.role === "ADMIN";

  // Fetch Leaves
  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      let url = "/api/leaves";
      const params = new URLSearchParams();
      
      // If employee, backend enforces self leaves anyway. If admin is on "my-leaves" tab, we request admin's own leaves.
      if (!isAdmin || activeTab === "my-leaves") {
        params.append("userId", sessionUser.id);
      } else {
        // Admin views approvals, can apply query filters
        if (employeeFilter) params.append("userId", employeeFilter);
        if (statusFilter) params.append("status", statusFilter);
        if (typeFilter) params.append("type", typeFilter);
      }

      const res = await fetch(`${url}?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setLeaves(data.leaves || []);
      } else {
        setErrorMsg(data.error || "Failed to load leaves.");
      }
    } catch {
      setErrorMsg("Something went wrong while fetching leaves.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, activeTab, employeeFilter, statusFilter, typeFilter, sessionUser.id]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  // Handle tab change
  const handleTabChange = (tab: "my-leaves" | "approvals") => {
    setActiveTab(tab);
    setLeaves([]); // Clear old list to avoid flash
    // Reset filters
    setEmployeeFilter("");
    setStatusFilter("");
    setTypeFilter("");
  };

  // Submit Apply Leave
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason.trim()) {
      setErrorMsg("All fields are required.");
      return;
    }

    setActionSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate,
          endDate,
          type: leaveType,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg("Leave application submitted successfully!");
        setShowApplyModal(false);
        // Reset form
        setStartDate("");
        setEndDate("");
        setLeaveType("CASUAL");
        setReason("");
        fetchLeaves();
      } else {
        setErrorMsg(data.error || "Failed to submit leave request.");
      }
    } catch {
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setActionSaving(false);
    }
  };

  // Submit Log Leave on Behalf of Employee (retroactive)
  const handleLogBehalf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmployeeId || !startDate || !endDate || !reason.trim()) {
      setErrorMsg("All fields are required.");
      return;
    }

    setActionSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetEmployeeId,
          startDate,
          endDate,
          type: leaveType,
          reason: reason.trim(),
          autoApprove: autoApprove,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg("Absence logged and processed successfully!");
        setShowLogBehalfModal(false);
        // Reset form
        setTargetEmployeeId("");
        setStartDate("");
        setEndDate("");
        setLeaveType("CASUAL");
        setReason("");
        setAutoApprove(true);
        fetchLeaves();
      } else {
        setErrorMsg(data.error || "Failed to log leave on behalf.");
      }
    } catch {
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setActionSaving(false);
    }
  };

  // Process Approval / Rejection
  const openApprovalModal = (leave: LeaveRequest, action: "APPROVED" | "REJECTED") => {
    setSelectedLeaveForApproval(leave);
    setApprovalAction(action);
    setManagerNote("");
    setErrorMsg("");
    setSuccessMsg("");
    setShowApprovalModal(true);
  };

  const handleProcessLeave = async () => {
    if (!selectedLeaveForApproval) return;

    setActionSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/leaves/approve", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveId: selectedLeaveForApproval.id,
          status: approvalAction,
          managerNote: managerNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Leave request has been successfully ${approvalAction.toLowerCase()}!`);
        setShowApprovalModal(false);
        setSelectedLeaveForApproval(null);
        fetchLeaves();
      } else {
        setErrorMsg(data.error || "Failed to process leave request.");
      }
    } catch {
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setActionSaving(false);
    }
  };

  // Quick stats calculation
  const stats = {
    pending: leaves.filter(l => l.status === "PENDING").length,
    approvedThisMonth: leaves.filter(l => {
      if (l.status !== "APPROVED") return false;
      const leaveMonth = new Date(l.startDate).getMonth();
      const currentMonth = new Date().getMonth();
      return leaveMonth === currentMonth;
    }).reduce((acc, l) => acc + calculateDaysCount(l.startDate, l.endDate), 0),
    rejectedCount: leaves.filter(l => l.status === "REJECTED").length,
    uninformedCount: leaves.filter(l => l.type === "UNINFORMED" && l.status === "APPROVED").length,
  };

  const pendingApprovals = leaves.filter(l => l.status === "PENDING");

  return (
    <div className="space-y-8">
      {/* Toast Messages */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 rounded-xl px-4 py-3 text-sm">
          <Check className="w-5 h-5 shrink-0" />
          <p>{successMsg}</p>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p>{errorMsg}</p>
        </div>
      )}

      {/* Tabs Layout */}
      {isAdmin && (
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => handleTabChange("my-leaves")}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition ${
              activeTab === "my-leaves"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            My Leaves
          </button>
          <button
            onClick={() => handleTabChange("approvals")}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition ${
              activeTab === "approvals"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            Team Approvals
          </button>
        </div>
      )}

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">Pending Requests</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-amber-500">{stats.pending}</span>
            <span className="text-xs text-gray-400">awaiting decision</span>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">Approved Leave Days</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-emerald-500">{stats.approvedThisMonth}</span>
            <span className="text-xs text-gray-400">days this month</span>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">Rejected Requests</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-rose-500">{stats.rejectedCount}</span>
            <span className="text-xs text-gray-400">requests rejected</span>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">Uninformed Absence Logs</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-orange-500">{stats.uninformedCount}</span>
            <span className="text-xs text-gray-400">unplanned absences</span>
          </div>
        </div>
      </div>

      {/* Primary Actions Row */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          {activeTab === "approvals" && (
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Review Leave and Attendance Override Records
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {activeTab === "my-leaves" ? (
            <Button
              onClick={() => { setShowApplyModal(true); setErrorMsg(""); setSuccessMsg(""); }}
              className="bg-indigo-600 text-white hover:bg-indigo-700 font-semibold rounded-xl flex items-center gap-1.5 px-4 py-2"
            >
              <Plus className="w-4 h-4" /> Apply for Leave
            </Button>
          ) : (
            <Button
              onClick={() => { setShowLogBehalfModal(true); setErrorMsg(""); setSuccessMsg(""); }}
              className="bg-gray-800 dark:bg-gray-700 text-white hover:bg-gray-900 dark:hover:bg-gray-600 font-semibold rounded-xl flex items-center gap-1.5 px-4 py-2"
            >
              <Plus className="w-4 h-4" /> Log Employee Absence
            </Button>
          )}
        </div>
      </div>

      {/* Admin Panel: Pending Requests (Quick Cards) */}
      {isAdmin && activeTab === "approvals" && pendingApprovals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" /> Pending Team Approvals
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingApprovals.map(l => (
              <div 
                key={l.id} 
                className="bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
                <div className="flex justify-between items-start pl-2">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100">{l.User.name}</h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{l.User.designation || "Employee"}</p>
                  </div>
                  <TypeBadge type={l.type} />
                </div>
                
                <div className="mt-4 space-y-2 text-sm pl-2">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <CalendarIcon className="w-4 h-4 shrink-0 text-gray-400" />
                    <span>
                      {formatDate(l.startDate)} – {formatDate(l.endDate)} 
                      <span className="font-semibold text-gray-800 dark:text-gray-200 ml-1.5">
                        ({calculateDaysCount(l.startDate, l.endDate)} working days)
                      </span>
                    </span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3 border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300 mt-2 italic">
                    "{l.reason}"
                  </div>
                </div>

                <div className="flex gap-2 mt-5 pl-2">
                  <button
                    onClick={() => openApprovalModal(l, "APPROVED")}
                    className="flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => openApprovalModal(l, "REJECTED")}
                    className="flex-1 py-2 rounded-xl text-xs font-bold border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition flex items-center justify-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaves History Table Section */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex flex-wrap gap-4 items-center justify-between">
          <h3 className="font-bold text-gray-800 dark:text-gray-100">
            {activeTab === "my-leaves" ? "My Leave History" : "Team Leave Log"}
          </h3>
          
          {/* Query Filter row (Only on Team Approvals Tab) */}
          {activeTab === "approvals" && (
            <div className="flex flex-wrap gap-2 items-center">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={employeeFilter}
                onChange={e => setEmployeeFilter(e.target.value)}
                className="border border-gray-200 dark:border-gray-800 rounded-lg px-2.5 py-1 text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
              >
                <option value="">All Employees</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="border border-gray-200 dark:border-gray-800 rounded-lg px-2.5 py-1 text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="border border-gray-200 dark:border-gray-800 rounded-lg px-2.5 py-1 text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
              >
                <option value="">All Leave Types</option>
                <option value="CASUAL">Casual Leave</option>
                <option value="SICK">Sick Leave</option>
                <option value="PAID">Paid Leave</option>
                <option value="UNPAID">Unpaid Leave</option>
                <option value="UNINFORMED">Uninformed Leave</option>
              </select>
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading leave logs…</div>
        ) : leaves.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No leave requests found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/40 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {activeTab === "approvals" && <th className="px-6 py-3 text-left font-medium">Employee</th>}
                  <th className="px-6 py-3 text-left font-medium">Leave Type</th>
                  <th className="px-6 py-3 text-left font-medium">Duration</th>
                  <th className="px-6 py-3 text-left font-medium">Days</th>
                  <th className="px-6 py-3 text-left font-medium">Reason</th>
                  <th className="px-6 py-3 text-left font-medium">Status</th>
                  <th className="px-6 py-3 text-left font-medium">Manager Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {leaves.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition">
                    {activeTab === "approvals" && (
                      <td className="px-6 py-3.5">
                        <p className="font-semibold text-gray-800 dark:text-gray-100">{l.User.name}</p>
                        {l.User.designation && <p className="text-xs text-gray-400">{l.User.designation}</p>}
                      </td>
                    )}
                    <td className="px-6 py-3.5"><TypeBadge type={l.type} /></td>
                    <td className="px-6 py-3.5 text-gray-600 dark:text-gray-400 font-medium">
                      {formatDate(l.startDate)} <br />
                      <span className="text-xs text-gray-400">to {formatDate(l.endDate)}</span>
                    </td>
                    <td className="px-6 py-3.5 text-gray-700 dark:text-gray-300 font-bold">
                      {calculateDaysCount(l.startDate, l.endDate)}
                    </td>
                    <td className="px-6 py-3.5 text-gray-600 dark:text-gray-400 max-w-[200px] truncate" title={l.reason}>
                      {l.reason}
                    </td>
                    <td className="px-6 py-3.5"><StatusBadge status={l.status} /></td>
                    <td className="px-6 py-3.5 text-xs text-gray-500 dark:text-gray-400 italic max-w-[150px] truncate" title={l.managerNote || ""}>
                      {l.managerNote || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- MODAL DIALOGS --- */}

      {/* 1. APPLY LEAVE MODAL */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <form 
            onSubmit={handleApplyLeave}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 border dark:border-gray-800 space-y-4"
          >
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">Apply for Leave</h3>
              <button 
                type="button" 
                onClick={() => setShowApplyModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={e => setLeaveType(e.target.value as any)}
                  className="w-full border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="CASUAL">Casual Leave (Paid)</option>
                  <option value="SICK">Sick Leave (Paid)</option>
                  <option value="PAID">Paid Leave</option>
                  <option value="UNPAID">Unpaid Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Reason / Description</label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="State the reason for your leave request..."
                  className="w-full border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setShowApplyModal(false)}
                className="flex-1 py-2 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionSaving}
                className="flex-1 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {actionSaving ? "Submitting…" : "Apply"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. LOG LEAVE ON BEHALF MODAL (ADMIN Retroactive & Uninformed Absence) */}
      {showLogBehalfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <form 
            onSubmit={handleLogBehalf}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 border dark:border-gray-800 space-y-4"
          >
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">Log Employee Absence</h3>
              <button 
                type="button" 
                onClick={() => setShowLogBehalfModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Select Employee</label>
                <select
                  required
                  value={targetEmployeeId}
                  onChange={e => setTargetEmployeeId(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} {emp.designation ? `(${emp.designation})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Absence Type</label>
                <select
                  value={leaveType}
                  onChange={e => setLeaveType(e.target.value as any)}
                  className="w-full border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="UNINFORMED">Uninformed Leave (Unpaid · 0.0× Pay)</option>
                  <option value="UNPAID">Unpaid Approved Leave (0.0× Pay)</option>
                  <option value="CASUAL">Casual Leave (Fully Paid · 1.0× Pay)</option>
                  <option value="SICK">Sick Leave (Fully Paid · 1.0× Pay)</option>
                  <option value="PAID">Standard Paid Leave (1.0× Pay)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Reason / Admin Remarks</label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Explain why this absence is logged (e.g. absent without call, retro approved sick leave)..."
                  className="w-full border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4 py-2 border border-gray-100 dark:border-gray-800">
                <div>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Auto-Approve Request</p>
                  <p className="text-[10px] text-gray-400">Immediately logs leave and applies payroll multipliers</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoApprove}
                  onChange={e => setAutoApprove(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setShowLogBehalfModal(false)}
                className="flex-1 py-2 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionSaving}
                className="flex-1 py-2 rounded-xl text-sm font-semibold bg-gray-800 dark:bg-gray-700 text-white hover:bg-gray-900 dark:hover:bg-gray-600 disabled:opacity-50 transition"
              >
                {actionSaving ? "Saving…" : "Log Absence"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. DECISION APPROVAL/REJECTION MODAL */}
      {showApprovalModal && selectedLeaveForApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 border dark:border-gray-800 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">
                {approvalAction === "APPROVED" ? "Approve Leave Request" : "Reject Leave Request"}
              </h3>
              <button 
                type="button" 
                onClick={() => setShowApprovalModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-4 border border-gray-100 dark:border-gray-800 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p><span className="font-semibold text-gray-800 dark:text-gray-200">Employee:</span> {selectedLeaveForApproval.User.name}</p>
                <p><span className="font-semibold text-gray-800 dark:text-gray-200">Type:</span> {selectedLeaveForApproval.type}</p>
                <p><span className="font-semibold text-gray-800 dark:text-gray-200">Dates:</span> {formatDate(selectedLeaveForApproval.startDate)} – {formatDate(selectedLeaveForApproval.endDate)} ({calculateDaysCount(selectedLeaveForApproval.startDate, selectedLeaveForApproval.endDate)} days)</p>
                <p className="italic">"{selectedLeaveForApproval.reason}"</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Manager Remarks / Reason {approvalAction === "REJECTED" && <span className="text-rose-500">*</span>}
                </label>
                <textarea
                  rows={3}
                  required={approvalAction === "REJECTED"}
                  value={managerNote}
                  onChange={e => setManagerNote(e.target.value)}
                  placeholder={approvalAction === "APPROVED" ? "Add an optional approval note..." : "Add a mandatory rejection reason..."}
                  className="w-full border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setShowApprovalModal(false)}
                className="flex-1 py-2 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessLeave}
                disabled={actionSaving || (approvalAction === "REJECTED" && !managerNote.trim())}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold text-white transition ${
                  approvalAction === "APPROVED" 
                    ? "bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50" 
                    : "bg-rose-600 hover:bg-rose-700 disabled:opacity-50"
                }`}
              >
                {actionSaving ? "Processing…" : approvalAction === "APPROVED" ? "Confirm Approval" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog />
    </div>
  );
}
