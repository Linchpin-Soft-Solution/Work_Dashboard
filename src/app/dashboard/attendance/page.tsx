"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AttendanceRecord {
  id: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: "PRESENT" | "LATE" | "ABSENT" | "HOLIDAY";
  payMultiplier: number;
  dailyLogSubmitted: boolean;
  overrideReason: string | null;
  overriddenByAdminId: string | null;
}

interface AdminRecord extends AttendanceRecord {
  User: { id: string; name: string; designation: string | null };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMonths(dateStr: string, months: number) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function todayValue() {
  const now = new Date();
  // IST date
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PRESENT: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    LATE: "bg-amber-100 text-amber-700 border border-amber-200",
    ABSENT: "bg-red-100 text-red-600 border border-red-200",
    HOLIDAY: "bg-sky-100 text-sky-700 border border-sky-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ─── Employee View ────────────────────────────────────────────────────────────
function EmployeeView({ userId }: { userId: string }) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [month, setMonth] = useState(currentMonthValue());
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(parseInt(currentMonthValue().slice(0, 4), 10));

  useEffect(() => {
    if (popoverOpen) {
      setPickerYear(parseInt(month.slice(0, 4), 10));
    }
  }, [popoverOpen, month]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/attendance?month=${month}`);
    const data = await res.json();
    setLoading(false);
    if (data.records) {
      setRecords(data.records);
      const today = todayValue();
      const tr = data.records.find(
        (r: AttendanceRecord) => r.date.slice(0, 10) === today
      );
      setTodayRecord(tr ?? null);
    }
  }, [month]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  async function handleCheckIn() {
    setActionLoading(true);
    setMsg(null);
    const res = await fetch("/api/attendance/checkin", { method: "POST" });
    const data = await res.json();
    setActionLoading(false);
    if (!res.ok) {
      setMsg({ text: data.error, ok: false });
    } else {
      setMsg({ text: "Checked in successfully!", ok: true });
      fetchRecords();
    }
  }

  async function handleCheckOut() {
    setActionLoading(true);
    setMsg(null);
    const res = await fetch("/api/attendance/checkout", { method: "POST" });
    const data = await res.json();
    setActionLoading(false);
    if (!res.ok) {
      setMsg({ text: data.error, ok: false });
    } else {
      setMsg({ text: "Checked out successfully!", ok: true });
      fetchRecords();
    }
  }

  const checkedIn = !!todayRecord?.checkInTime;
  const checkedOut = !!todayRecord?.checkOutTime;

  return (
    <div className="space-y-6">
      {/* Today Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Today</p>
            <h2 className="text-xl font-bold text-gray-800 mt-0.5">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "Asia/Kolkata",
              })}
            </h2>
          </div>
          {todayRecord && <StatusBadge status={todayRecord.status} />}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1">Check-in</p>
            <p className="text-lg font-semibold text-gray-800">
              {formatTime(todayRecord?.checkInTime ?? null)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1">Check-out</p>
            <p className="text-lg font-semibold text-gray-800">
              {formatTime(todayRecord?.checkOutTime ?? null)}
            </p>
          </div>
        </div>

        {msg && (
          <div
            className={`mb-4 text-sm px-4 py-2.5 rounded-lg ${
              msg.ok
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-600 border border-red-200"
            }`}
          >
            {msg.text}
          </div>
        )}

        {todayRecord?.status === "HOLIDAY" ? (
          <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 text-sm text-sky-700 font-medium text-center">
            🎉 Today is a company holiday — no check-in required.
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={handleCheckIn}
              disabled={checkedIn || actionLoading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {actionLoading && !checkedIn ? "…" : "Check In"}
            </button>
            <button
              onClick={handleCheckOut}
              disabled={!checkedIn || checkedOut || actionLoading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-800 text-white hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {actionLoading && checkedIn && !checkedOut ? "…" : "Check Out"}
            </button>
          </div>
        )}
      </div>

      {/* Monthly Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Monthly History</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMonth(prev => addMonths(prev + "-01", -1).slice(0, 7))}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger render={
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[160px] justify-start text-left font-normal",
                    !month && "text-muted-foreground"
                  )}
                />
              }>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {month ? format(new Date(month + "-01T00:00:00"), "MMMM yyyy") : <span>Pick a month</span>}
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
                  {[
                    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
                  ].map((m, i) => {
                    const val = `${pickerYear}-${String(i + 1).padStart(2, "0")}`;
                    const isSelected = val === month;
                    return (
                      <Button
                        key={m}
                        variant={isSelected ? "default" : "ghost"}
                        className="text-xs h-9"
                        onClick={() => {
                          setMonth(val);
                          setPopoverOpen(false);
                        }}
                      >
                        {m}
                      </Button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
            <button
              onClick={() => setMonth(prev => addMonths(prev + "-01", 1).slice(0, 7))}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No records for this month.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-medium">Date</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Check-in</th>
                  <th className="px-5 py-3 text-left font-medium">Check-out</th>
                  <th className="px-5 py-3 text-left font-medium">Multiplier</th>
                  <th className="px-5 py-3 text-left font-medium">Log</th>
                  <th className="px-5 py-3 text-left font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/60 transition">
                    <td className="px-5 py-3 text-gray-700">{formatDate(r.date)}</td>
                    <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-5 py-3 text-gray-600">{formatTime(r.checkInTime)}</td>
                    <td className="px-5 py-3 text-gray-600">{formatTime(r.checkOutTime)}</td>
                    <td className="px-5 py-3 text-gray-600">{r.payMultiplier.toFixed(1)}×</td>
                    <td className="px-5 py-3">
                      {r.dailyLogSubmitted ? (
                        <span className="text-emerald-600 font-medium">✓</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {r.overriddenByAdminId && (
                        <span
                          title={r.overrideReason ?? ""}
                          className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full cursor-help"
                        >
                          Edited by Admin
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// multiplier defaults per status
const STATUS_MULTIPLIER: Record<string, number> = {
  PRESENT: 1.0,
  LATE: 0.5,
  ABSENT: 0.0,
  HOLIDAY: 1.0,
};

// ─── Admin Override Dialog ────────────────────────────────────────────────────
function OverrideDialog({
  record,
  onClose,
  onSaved,
}: {
  record: AdminRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState(record.status);
  // multiplier starts from existing record value
  const [multiplier, setMultiplier] = useState(String(record.payMultiplier));
  // track whether admin manually edited the multiplier
  const [multiplierTouched, setMultiplierTouched] = useState(false);
  const [checkIn, setCheckIn] = useState(
    record.checkInTime
      ? new Date(record.checkInTime).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Asia/Kolkata",
        })
      : ""
  );
  const [checkOut, setCheckOut] = useState(
    record.checkOutTime
      ? new Date(record.checkOutTime).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Asia/Kolkata",
        })
      : ""
  );
  const [dailyLogSubmitted, setDailyLogSubmitted] = useState(record.dailyLogSubmitted);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // When status changes, auto-set the multiplier unless admin already touched it
  function handleStatusChange(newStatus: AttendanceRecord["status"]) {
    setStatus(newStatus);
    if (!multiplierTouched) {
      setMultiplier(String(STATUS_MULTIPLIER[newStatus] ?? 0.0));
    }
  }

  async function save() {
    if (!reason.trim()) {
      setErr("Reason is required.");
      return;
    }
    setSaving(true);
    const dateStr = record.date.slice(0, 10);
    const body: Record<string, unknown> = {
      userId: record.User.id,
      date: dateStr,
      status,
      payMultiplier: parseFloat(multiplier),
      dailyLogSubmitted,
      reason: reason.trim(),
    };
    if (checkIn) body.checkInTime = `${dateStr}T${checkIn}:00+05:30`;
    if (checkOut) body.checkOutTime = `${dateStr}T${checkOut}:00+05:30`;

    const res = await fetch("/api/attendance/override", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      setErr(d.error ?? "Failed to save.");
    } else {
      onSaved();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h3 className="font-bold text-gray-800 text-lg mb-1">Override Attendance</h3>
        <p className="text-sm text-gray-500 mb-5">
          {record.User.name} · {formatDate(record.date)}
        </p>

        <div className="space-y-4">
          {/* Status + Multiplier */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value as AttendanceRecord["status"])}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="PRESENT">Present (×1.0)</option>
                <option value="LATE">Late (×0.5)</option>
                <option value="ABSENT">Absent (×0.0)</option>
                <option value="HOLIDAY">Holiday (×1.0)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Pay Multiplier
                {!multiplierTouched && (
                  <span className="ml-1 text-gray-400 font-normal">(auto)</span>
                )}
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={multiplier}
                onChange={(e) => {
                  setMultiplierTouched(true);
                  setMultiplier(e.target.value);
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Check-in (IST)</label>
              <input
                type="time"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Check-out (IST)</label>
              <input
                type="time"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Daily Log toggle */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Daily Log Submitted</p>
              <p className="text-xs text-gray-400 mt-0.5">Mark whether the employee's log was submitted</p>
            </div>
            <button
              type="button"
              onClick={() => setDailyLogSubmitted((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                dailyLogSubmitted ? "bg-indigo-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                  dailyLogSubmitted ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you are overriding this record…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {err && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {err}
            </p>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {saving ? "Saving…" : "Save Override"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Admin View ───────────────────────────────────────────────────────────────
function AdminView() {
  const [date, setDate] = useState(todayValue());
  const [records, setRecords] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [overrideTarget, setOverrideTarget] = useState<AdminRecord | null>(null);
  const [holidayLoading, setHolidayLoading] = useState(false);
  const [holidayMsg, setHolidayMsg] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/attendance?date=${date}`);
    const data = await res.json();
    setLoading(false);
    if (data.records) setRecords(data.records);
  }, [date]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  async function markHoliday() {
    if (!confirm(`Mark ${date} as a company holiday for all employees?`)) return;
    setHolidayLoading(true);
    setHolidayMsg(null);
    const res = await fetch("/api/attendance/override", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date }),
    });
    setHolidayLoading(false);
    if (res.ok) {
      setHolidayMsg("Holiday marked for all employees.");
      fetchRecords();
    } else {
      const d = await res.json();
      setHolidayMsg(d.error ?? "Failed.");
    }
  }

  const summary = records.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      {overrideTarget && (
        <OverrideDialog
          record={overrideTarget}
          onClose={() => setOverrideTarget(null)}
          onSaved={() => {
            setOverrideTarget(null);
            fetchRecords();
          }}
        />
      )}

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Date</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDate(prev => addDays(prev, -1))}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <Popover>
              <PopoverTrigger render={
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[160px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                />
              }>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(new Date(date), "PPP") : <span>Pick a date</span>}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={date ? new Date(date) : undefined}
                  onSelect={(d) => {
                    if (d) {
                      const ist = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
                      setDate(ist.toISOString().slice(0, 10));
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <button
              onClick={() => setDate(prev => addDays(prev, 1))}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {holidayMsg && (
            <span className="text-xs text-gray-500 italic">{holidayMsg}</span>
          )}
          <button
            onClick={markHoliday}
            disabled={holidayLoading}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 disabled:opacity-50 transition"
          >
            {holidayLoading ? "Marking…" : "Mark as Holiday"}
          </button>
        </div>
      </div>

      {/* Summary Pills */}
      {records.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {Object.entries(summary).map(([s, count]) => (
            <div key={s} className="bg-white border border-gray-200 rounded-xl px-4 py-2 flex items-center gap-2 shadow-sm">
              <StatusBadge status={s} />
              <span className="text-sm font-semibold text-gray-700">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">
            Attendance —{" "}
            {new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </h3>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No records for this date.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-medium">Employee</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Check-in</th>
                  <th className="px-5 py-3 text-left font-medium">Check-out</th>
                  <th className="px-5 py-3 text-left font-medium">Multiplier</th>
                  <th className="px-5 py-3 text-left font-medium">Log</th>
                  <th className="px-5 py-3 text-left font-medium">Note</th>
                  <th className="px-5 py-3 text-left font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/60 transition">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800">{r.User.name}</p>
                      {r.User.designation && (
                        <p className="text-xs text-gray-400">{r.User.designation}</p>
                      )}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-5 py-3 text-gray-600">{formatTime(r.checkInTime)}</td>
                    <td className="px-5 py-3 text-gray-600">{formatTime(r.checkOutTime)}</td>
                    <td className="px-5 py-3 text-gray-600">{r.payMultiplier.toFixed(1)}×</td>
                    <td className="px-5 py-3">
                      {r.dailyLogSubmitted ? (
                        <span className="text-emerald-600 font-medium">✓</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {r.overriddenByAdminId && (
                        <span
                          title={r.overrideReason ?? ""}
                          className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full cursor-help"
                        >
                          Overridden
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => setOverrideTarget(r)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition"
                      >
                        Override
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AttendancePage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        Loading…
      </div>
    );
  }

  const isAdmin = session?.user.role === "ADMIN";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-sm text-gray-500 mt-1">
          {isAdmin
            ? "View and manage team attendance. Override records and mark holidays."
            : "Check in and out each day. Your attendance is tied to your pay."}
        </p>
      </div>

      {isAdmin ? (
        <AdminView />
      ) : (
        <EmployeeView userId={session?.user.id ?? ""} />
      )}
    </div>
  );
}
