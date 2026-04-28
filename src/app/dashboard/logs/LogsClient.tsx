"use client";

import { useState, useEffect, useCallback } from "react";

type TabType = "daily" | "weekly" | "monthly";

function getWeekStart(dateStr: string) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function getMonthStart(dateStr: string) {
  return dateStr.slice(0, 7) + "-01";
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

function todayValue() {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

export default function LogsClient({
  session,
  users,
}: {
  session: any;
  users: { id: string; name: string; designation: string | null }[];
}) {
  const isAdmin = session.user.role === "ADMIN";
  const [activeTab, setActiveTab] = useState<TabType>("daily");
  const [selectedUserId, setSelectedUserId] = useState<string>(session.user.id);
  
  // Daily State
  const [dailyDate, setDailyDate] = useState(todayValue());
  const [dailyLog, setDailyLog] = useState<any>(null);
  const [dailyContent, setDailyContent] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailySaving, setDailySaving] = useState(false);
  const [dailyMsg, setDailyMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Summary State (Weekly/Monthly)
  const [summaryDate, setSummaryDate] = useState(todayValue());
  const [summaryData, setSummaryData] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryGenerating, setSummaryGenerating] = useState(false);
  const [summaryMsg, setSummaryMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Fetch Daily Log
  const fetchDailyLog = useCallback(async () => {
    setDailyLoading(true);
    setDailyMsg(null);
    const res = await fetch(`/api/logs/daily?date=${dailyDate}&userId=${selectedUserId}`);
    const data = await res.json();
    setDailyLoading(false);
    if (data.log) {
      setDailyLog(data.log);
      setDailyContent(data.log.content);
    } else {
      setDailyLog(null);
      setDailyContent("");
    }
  }, [dailyDate, selectedUserId]);

  useEffect(() => {
    if (activeTab === "daily") fetchDailyLog();
  }, [fetchDailyLog, activeTab]);

  // Submit Daily Log
  const submitDailyLog = async () => {
    if (!dailyContent.trim()) {
      setDailyMsg({ text: "Log content cannot be empty.", ok: false });
      return;
    }
    const isOverride = isAdmin && selectedUserId !== session.user.id;
    if (isOverride && !overrideReason.trim()) {
      setDailyMsg({ text: "Override reason is required.", ok: false });
      return;
    }

    setDailySaving(true);
    setDailyMsg(null);
    const res = await fetch("/api/logs/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: dailyDate,
        content: dailyContent,
        userId: selectedUserId,
        reason: overrideReason,
      }),
    });
    const data = await res.json();
    setDailySaving(false);

    if (!res.ok) {
      setDailyMsg({ text: data.error || "Failed to save log.", ok: false });
    } else {
      setDailyMsg({ text: "Log saved successfully!", ok: true });
      setDailyLog(data.log);
      setOverrideReason("");
    }
  };

  // Fetch Summary
  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryMsg(null);
    
    let targetDate = summaryDate;
    if (activeTab === "weekly") targetDate = getWeekStart(summaryDate);
    if (activeTab === "monthly") targetDate = getMonthStart(summaryDate);

    const res = await fetch(`/api/logs/summary?type=${activeTab}&date=${targetDate}&userId=${selectedUserId}`);
    const data = await res.json();
    setSummaryLoading(false);
    
    if (data.summary) {
      setSummaryData(data.summary);
    } else {
      setSummaryData(null);
    }
  }, [summaryDate, activeTab, selectedUserId]);

  useEffect(() => {
    if (activeTab !== "daily") fetchSummary();
  }, [fetchSummary, activeTab]);

  // Generate Summary
  const generateSummary = async () => {
    setSummaryGenerating(true);
    setSummaryMsg(null);

    let targetDate = summaryDate;
    if (activeTab === "weekly") targetDate = getWeekStart(summaryDate);
    if (activeTab === "monthly") targetDate = getMonthStart(summaryDate);

    const res = await fetch("/api/logs/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: activeTab,
        date: targetDate,
        userId: selectedUserId,
      }),
    });
    const data = await res.json();
    setSummaryGenerating(false);

    if (!res.ok) {
      setSummaryMsg({ text: data.error || "Failed to generate summary.", ok: false });
    } else {
      setSummaryMsg({ text: "Summary generated successfully!", ok: true });
      setSummaryData(data.summary);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Logs</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isAdmin ? "Manage team logs and generate summaries." : "Document your daily work and generate summaries."}
          </p>
        </div>

        {isAdmin && (
          <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
            <label className="sr-only">Select Employee</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="text-sm font-medium text-gray-800 bg-transparent focus:outline-none focus:ring-0 px-2 py-1 w-48"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} {u.id === session.user.id && "(You)"}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-6">
        {(["daily", "weekly", "monthly"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setDailyMsg(null); setSummaryMsg(null); }}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === tab
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "daily" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Daily Log</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDailyDate(prev => addDays(prev, -1))}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={() => setDailyDate(prev => addDays(prev, 1))}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>

          {dailyDate === todayValue() && !dailyLog && (
            <div className="mb-4 bg-amber-50 text-amber-700 border border-amber-200 px-4 py-2.5 rounded-lg text-sm font-medium">
              ⚠️ You haven't submitted your log for today.
            </div>
          )}

          {dailyLog?.submittedByAdminId && (
            <div className="mb-4 bg-amber-50 text-amber-700 border border-amber-200 px-4 py-2.5 rounded-lg text-sm">
              <span className="font-bold">Overridden by Admin:</span> {dailyLog.overrideReason}
            </div>
          )}

          {dailyLoading ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
          ) : (
            <div className="space-y-4">
              <textarea
                rows={6}
                value={dailyContent}
                onChange={(e) => setDailyContent(e.target.value)}
                placeholder="What did you work on today? Provide a detailed log..."
                className="w-full border border-gray-200 rounded-xl p-4 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />

              {isAdmin && selectedUserId !== session.user.id && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Override Reason <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Why are you submitting this log on behalf of the employee?"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              {dailyMsg && (
                <div
                  className={`text-sm px-4 py-2.5 rounded-lg ${
                    dailyMsg.ok
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-red-50 text-red-600 border border-red-200"
                  }`}
                >
                  {dailyMsg.text}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={submitDailyLog}
                  disabled={dailySaving || (!dailyContent.trim())}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {dailySaving ? "Saving…" : dailyLog ? "Update Log" : "Submit Log"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {(activeTab === "weekly" || activeTab === "monthly") && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">
              {activeTab === "weekly" ? "Weekly Summary" : "Monthly Summary"}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSummaryDate(prev => activeTab === "weekly" ? addDays(prev, -7) : addMonths(prev, -1))}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              {activeTab === "weekly" ? (
                <input
                  type="date"
                  value={summaryDate}
                  onChange={(e) => setSummaryDate(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              ) : (
                <input
                  type="month"
                  value={summaryDate.slice(0, 7)}
                  onChange={(e) => setSummaryDate(e.target.value + "-01")}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              )}
              <button
                onClick={() => setSummaryDate(prev => activeTab === "weekly" ? addDays(prev, 7) : addMonths(prev, 1))}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>

          {summaryMsg && (
            <div
              className={`mb-4 text-sm px-4 py-2.5 rounded-lg ${
                summaryMsg.ok
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-red-50 text-red-600 border border-red-200"
              }`}
            >
              {summaryMsg.text}
            </div>
          )}

          {summaryLoading ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* AI Summary Panel */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-700 text-sm">AI Summary</h4>
                  <button
                    onClick={generateSummary}
                    disabled={summaryGenerating}
                    className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-200 disabled:opacity-50 transition"
                  >
                    {summaryGenerating ? "Generating..." : summaryData ? "Regenerate" : "Generate"}
                  </button>
                </div>
                {summaryData?.aiSummary ? (
                  <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap flex-1">
                    {summaryData.aiSummary}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 italic flex-1 flex items-center justify-center py-10">
                    No summary generated yet.
                  </div>
                )}
              </div>

              {/* Raw Logs Panel */}
              <div className="bg-white rounded-xl p-5 border border-gray-200 h-96 overflow-y-auto">
                <h4 className="font-semibold text-gray-700 text-sm mb-3">Raw Compiled Logs</h4>
                {summaryData?.rawSummary ? (
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans">
                    {summaryData.rawSummary}
                  </pre>
                ) : (
                  <div className="text-sm text-gray-400 italic flex items-center justify-center py-10">
                    No logs compiled for this period. Generate the summary to compile logs.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
