"use client";

import { useState, useEffect, useCallback } from "react";
import { Session } from "next-auth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ChevronLeft, ChevronRight, Plus, Trash2, Download } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PayAdjustment {
  id: string;
  amount: number;
  type: "BONUS" | "DEDUCTION" | "SICK_LEAVE" | "OTHER";
  reason: string;
  createdAt: string;
}

interface PayRecord {
  id: string;
  userId: string;
  month: string;
  baseSalary: number;
  workingDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  calculatedPay: number;
  finalPay: number;
  User: { id: string; name: string; designation: string | null };
  PayAdjustment: PayAdjustment[];
}

interface User {
  id: string;
  name: string;
  designation: string | null;
  baseMonthlySalary: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function addMonths(monthStr: string, delta: number) {
  const [y, m] = monthStr.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmt(n: number) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const ADJ_LABELS: Record<string, string> = {
  BONUS: "Bonus",
  DEDUCTION: "Deduction",
  SICK_LEAVE: "Sick Leave",
  OTHER: "Other",
};

// ─── Month Picker ─────────────────────────────────────────────────────────────
function MonthPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(parseInt(value.slice(0, 4)));

  useEffect(() => {
    if (open) setPickerYear(parseInt(value.slice(0, 4)));
  }, [open, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={
        <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal")} />
      }>
        <CalendarIcon className="mr-2 h-4 w-4" />
        {value ? format(new Date(value + "-01T00:00:00"), "MMMM yyyy") : "Pick a month"}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="center">
        <div className="flex items-center justify-between pb-3">
          <Button variant="outline" size="icon" onClick={() => setPickerYear(y => y - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-semibold">{pickerYear}</div>
          <Button variant="outline" size="icon" onClick={() => setPickerYear(y => y + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => {
            const val = `${pickerYear}-${String(i + 1).padStart(2, "0")}`;
            return (
              <Button key={m} variant={val === value ? "default" : "ghost"} className="text-xs h-9"
                onClick={() => { onChange(val); setOpen(false); }}>
                {m}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Add Adjustment Dialog ────────────────────────────────────────────────────
function AddAdjustmentDialog({ payRecordId, onClose, onSaved }: {
  payRecordId: string;
  onClose: () => void;
  onSaved: (pr: PayRecord) => void;
}) {
  const [type, setType] = useState("BONUS");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (!amount || !reason.trim()) { setErr("Amount and reason are required."); return; }
    setSaving(true);
    const res = await fetch(`/api/pay-records/${payRecordId}/adjustments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, amount: parseFloat(amount), reason }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setErr(data.error || "Failed."); return; }
    onSaved(data.payRecord);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h3 className="font-bold text-gray-800 text-lg mb-5">Add Adjustment</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select value={type} onChange={e => setType(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {Object.entries(ADJ_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₹)</label>
            <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <p className="text-xs text-gray-400 mt-1">Deductions will be subtracted; all others are added.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reason <span className="text-red-500">*</span></label>
            <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Describe the reason for this adjustment…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition">
            {saving ? "Saving…" : "Add Adjustment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Pay Record Detail Card ───────────────────────────────────────────────────
function PayRecordCard({ record, isAdmin, onUpdated }: {
  record: PayRecord;
  isAdmin: boolean;
  onUpdated: (pr: PayRecord) => void;
}) {
  const [showAddAdj, setShowAddAdj] = useState(false);
  const [deletingAdj, setDeletingAdj] = useState<string | null>(null);

  async function deleteAdj(adjId: string) {
    if (!confirm("Remove this adjustment?")) return;
    setDeletingAdj(adjId);
    const res = await fetch(`/api/pay-records/${record.id}/adjustments/${adjId}`, { method: "DELETE" });
    const data = await res.json();
    setDeletingAdj(null);
    if (res.ok) onUpdated(data.payRecord);
  }

  const dailyRate = record.workingDays > 0 ? record.baseSalary / record.workingDays : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {showAddAdj && (
        <AddAdjustmentDialog
          payRecordId={record.id}
          onClose={() => setShowAddAdj(false)}
          onSaved={(pr) => { onUpdated(pr); setShowAddAdj(false); }}
        />
      )}

      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-800">
            {isAdmin ? record.User.name : format(new Date(record.month), "MMMM yyyy")}
          </p>
          {isAdmin && (
            <p className="text-xs text-gray-400 mt-0.5">
              {record.User.designation} · {format(new Date(record.month), "MMMM yyyy")}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Final Pay</p>
          <p className="text-xl font-bold text-indigo-600">{fmt(record.finalPay)}</p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Base Salary", value: fmt(record.baseSalary) },
          { label: "Daily Rate", value: fmt(dailyRate) },
          { label: "Working Days", value: record.workingDays },
          { label: "Base Calculated", value: fmt(record.calculatedPay) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className="text-sm font-semibold text-gray-800">{value}</p>
          </div>
        ))}
      </div>

      {/* Attendance Summary */}
      <div className="px-6 pb-4 flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
          <span className="text-xs font-medium text-emerald-700">Present</span>
          <span className="text-sm font-bold text-emerald-800">{record.presentDays}</span>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <span className="text-xs font-medium text-amber-700">Late</span>
          <span className="text-sm font-bold text-amber-800">{record.lateDays}</span>
        </div>
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <span className="text-xs font-medium text-red-600">Absent</span>
          <span className="text-sm font-bold text-red-700">{record.absentDays}</span>
        </div>
      </div>

      {/* Adjustments */}
      <div className="border-t border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">Adjustments</p>
          {isAdmin && (
            <button onClick={() => setShowAddAdj(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          )}
        </div>

        {record.PayAdjustment.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No adjustments.</p>
        ) : (
          <div className="space-y-2">
            {record.PayAdjustment.map(adj => (
              <div key={adj.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                      adj.type === "DEDUCTION"
                        ? "bg-red-50 text-red-600 border-red-200"
                        : adj.type === "BONUS"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-blue-50 text-blue-600 border-blue-200"
                    }`}>{ADJ_LABELS[adj.type]}</span>
                    <span className={`text-sm font-semibold ${adj.type === "DEDUCTION" ? "text-red-600" : "text-emerald-600"}`}>
                      {adj.type === "DEDUCTION" ? "-" : "+"}{fmt(adj.amount)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{adj.reason}</p>
                </div>
                {isAdmin && (
                  <button onClick={() => deleteAdj(adj.id)} disabled={deletingAdj === adj.id}
                    className="text-gray-300 hover:text-red-500 transition disabled:opacity-40 ml-4">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CSV Export ───────────────────────────────────────────────────────────────
function exportCSV(records: PayRecord[], month: string) {
  const header = ["Employee", "Month", "Base Salary", "Working Days", "Present", "Late", "Absent", "Base Pay", "Adjustments", "Final Pay"];
  const rows = records.map(r => {
    const adjTotal = r.PayAdjustment.reduce((s, a) => s + (a.type === "DEDUCTION" ? -a.amount : a.amount), 0);
    return [
      r.User.name,
      format(new Date(r.month), "MMMM yyyy"),
      r.baseSalary,
      r.workingDays,
      r.presentDays,
      r.lateDays,
      r.absentDays,
      r.calculatedPay.toFixed(2),
      adjTotal.toFixed(2),
      r.finalPay.toFixed(2),
    ];
  });

  const csv = [header, ...rows].map(row => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pay-records-${month}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Admin View ───────────────────────────────────────────────────────────────
function AdminView({ users }: { users: User[] }) {
  const [month, setMonth] = useState(currentMonthValue());
  const [selectedUserId, setSelectedUserId] = useState("");
  const [workingDays, setWorkingDays] = useState("26");
  const [records, setRecords] = useState<PayRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [addingAdjForRecordId, setAddingAdjForRecordId] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ month });
    const res = await fetch(`/api/pay-records?${params}`);
    const data = await res.json();
    setLoading(false);
    if (data.payRecords) setRecords(data.payRecords);
  }, [month]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  async function generate() {
    if (!selectedUserId) { setMsg({ text: "Please select an employee.", ok: false }); return; }
    setGenerating(true);
    setMsg(null);
    const res = await fetch("/api/pay-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedUserId, month, workingDays: parseInt(workingDays) }),
    });
    const data = await res.json();
    setGenerating(false);
    if (!res.ok) { setMsg({ text: data.error || "Failed.", ok: false }); return; }
    setMsg({ text: "Pay record calculated successfully.", ok: true });
    fetchRecords();
  }

  function updateRecord(updated: PayRecord) {
    setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
  }

  return (
    <div className="space-y-6">
      {addingAdjForRecordId && (
        <AddAdjustmentDialog
          payRecordId={addingAdjForRecordId}
          onClose={() => setAddingAdjForRecordId(null)}
          onSaved={(pr) => { updateRecord(pr); setAddingAdjForRecordId(null); }}
        />
      )}

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Calculate Pay Record</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Month</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setMonth(m => addMonths(m, -1))}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <MonthPicker value={month} onChange={setMonth} />
              <button onClick={() => setMonth(m => addMonths(m, 1))}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Employee</label>
            <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[180px]">
              <option value="">Select employee…</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Working Days</label>
            <input type="number" min="1" max="31" value={workingDays} onChange={e => setWorkingDays(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-24" />
          </div>

          <button onClick={generate} disabled={generating}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition">
            {generating ? "Calculating…" : "Calculate Pay"}
          </button>
        </div>

        {msg && (
          <p className={`mt-3 text-sm px-4 py-2.5 rounded-lg ${msg.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
            {msg.text}
          </p>
        )}
      </div>

      {/* Summary Table */}
      {records.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">
              All Records — {format(new Date(month + "-01T00:00:00"), "MMMM yyyy")}
            </h3>
            <button onClick={() => exportCSV(records, month)}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-medium">Employee</th>
                  <th className="px-5 py-3 text-right font-medium">Base Salary</th>
                  <th className="px-5 py-3 text-right font-medium">Present</th>
                  <th className="px-5 py-3 text-right font-medium">Late</th>
                  <th className="px-5 py-3 text-right font-medium">Absent</th>
                  <th className="px-5 py-3 text-right font-medium">Base Pay</th>
                  <th className="px-5 py-3 text-right font-medium">Final Pay</th>
                  <th className="px-5 py-3 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50/60 transition">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800">{r.User.name}</p>
                      {r.User.designation && <p className="text-xs text-gray-400">{r.User.designation}</p>}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600">{fmt(r.baseSalary)}</td>
                    <td className="px-5 py-3 text-right text-emerald-600 font-medium">{r.presentDays}</td>
                    <td className="px-5 py-3 text-right text-amber-600 font-medium">{r.lateDays}</td>
                    <td className="px-5 py-3 text-right text-red-500 font-medium">{r.absentDays}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{fmt(r.calculatedPay)}</td>
                    <td className="px-5 py-3 text-right font-bold text-indigo-600">{fmt(r.finalPay)}</td>
                    <td className="px-5 py-3 text-center">
                      <button 
                        onClick={() => setAddingAdjForRecordId(r.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Adj
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detailed Cards with Adjustments */}
      {loading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
      ) : records.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400">No pay records for this month. Calculate one above.</div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Detailed Breakdown</h3>
          {records.map(r => (
            <PayRecordCard key={r.id} record={r} isAdmin={true} onUpdated={updateRecord} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Employee View ────────────────────────────────────────────────────────────
function EmployeeView({ userId }: { userId: string }) {
  const [records, setRecords] = useState<PayRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/pay-records?userId=${userId}`)
      .then(r => r.json())
      .then(d => { if (d.payRecords) setRecords(d.payRecords); setLoading(false); });
  }, [userId]);

  if (loading) return <div className="py-12 text-center text-sm text-gray-400">Loading…</div>;

  if (records.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-400 text-sm">No pay records available yet.</p>
        <p className="text-gray-400 text-xs mt-1">Your admin will generate your monthly pay records.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {records.map(r => (
        <PayRecordCard key={r.id} record={r} isAdmin={false} onUpdated={() => {}} />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PayRecordsClient({
  session,
  users,
}: {
  session: Session;
  users: User[];
}) {
  const isAdmin = session.user.role === "ADMIN";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pay Records</h1>
        <p className="text-sm text-gray-500 mt-1">
          {isAdmin
            ? "Calculate monthly pay and manage adjustments for each employee."
            : "View your monthly pay history including attendance breakdown and adjustments."}
        </p>
      </div>

      {isAdmin ? (
        <AdminView users={users} />
      ) : (
        <EmployeeView userId={session.user.id} />
      )}
    </div>
  );
}
