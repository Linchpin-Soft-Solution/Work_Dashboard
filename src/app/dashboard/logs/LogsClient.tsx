"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ChevronLeft, ChevronRight, Loader2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type TabType = "daily" | "weekly" | "monthly";

function getWeekStart(dateStr: string) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
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

  // Summary State
  const [summaryDate, setSummaryDate] = useState(todayValue());
  const [summaryData, setSummaryData] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryGenerating, setSummaryGenerating] = useState(false);
  const [summaryMsg, setSummaryMsg] = useState<{ text: string; ok: boolean } | null>(null);

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

  const dailyDateObj = dailyDate ? new Date(dailyDate) : undefined;
  const summaryDateObj = summaryDate ? new Date(summaryDate) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Daily Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin ? "Manage team logs and generate summaries." : "Document your daily work and generate summaries."}
          </p>
        </div>

        {isAdmin && (
          <div className="w-full md:w-64">
            <Label className="sr-only">Select Employee</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an employee">
                  {users.find(u => u.id === selectedUserId)?.name || "Select an employee"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} {u.id === session.user.id && "(You)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex border-b border-border gap-6 overflow-x-auto pb-1">
        {(["daily", "weekly", "monthly"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setDailyMsg(null); setSummaryMsg(null); }}
            className={`pb-2 text-sm font-medium transition whitespace-nowrap ${
              activeTab === tab
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "daily" && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
            <CardTitle className="text-lg">Daily Log</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setDailyDate(prev => addDays(prev, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Popover>
                <PopoverTrigger render={
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[160px] justify-start text-left font-normal",
                      !dailyDate && "text-muted-foreground"
                    )}
                  />
                }>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dailyDate ? format(new Date(dailyDate), "PPP") : <span>Pick a date</span>}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="single"
                    selected={dailyDateObj}
                    onSelect={(d) => {
                      if (d) {
                        const ist = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
                        setDailyDate(ist.toISOString().slice(0, 10));
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setDailyDate(prev => addDays(prev, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {dailyDate === todayValue() && !dailyLog && (
              <div className="mb-6 bg-amber-50 text-amber-800 border border-amber-200 px-4 py-3 rounded-lg text-sm font-medium">
                ⚠️ You haven't submitted your log for today.
              </div>
            )}

            {dailyLog?.submittedByAdminId && (
              <div className="mb-6 bg-amber-50 text-amber-800 border border-amber-200 px-4 py-3 rounded-lg text-sm">
                <span className="font-semibold">Overridden by Admin:</span> {dailyLog.overrideReason}
              </div>
            )}

            {dailyLoading ? (
              <div className="py-12 flex justify-center items-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading log...</span>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <Textarea
                  rows={6}
                  value={dailyContent}
                  onChange={(e) => setDailyContent(e.target.value)}
                  placeholder="What did you work on today? Provide a detailed log..."
                  className="resize-y"
                />

                {isAdmin && selectedUserId !== session.user.id && (
                  <div className="space-y-2">
                    <Label>
                      Override Reason <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="Why are you submitting this log on behalf of the employee?"
                    />
                  </div>
                )}

                {dailyMsg && (
                  <div
                    className={`text-sm px-4 py-3 rounded-lg font-medium border ${
                      dailyMsg.ok
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-destructive/10 text-destructive border-destructive/20"
                    }`}
                  >
                    {dailyMsg.text}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={submitDailyLog}
                    disabled={dailySaving || (!dailyContent.trim())}
                    className="w-full sm:w-auto"
                  >
                    {dailySaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {dailySaving ? "Saving..." : dailyLog ? "Update Log" : "Submit Log"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(activeTab === "weekly" || activeTab === "monthly") && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
            <CardTitle className="text-lg">
              {activeTab === "weekly" ? "Weekly Summary" : "Monthly Summary"}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSummaryDate(prev => activeTab === "weekly" ? addDays(prev, -7) : addMonths(prev, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {activeTab === "weekly" ? (
                <Popover>
                  <PopoverTrigger render={
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[160px] justify-start text-left font-normal",
                        !summaryDate && "text-muted-foreground"
                      )}
                    />
                  }>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {summaryDate ? format(new Date(summaryDate), "PPP") : <span>Pick a date</span>}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <Calendar
                      mode="single"
                      selected={summaryDateObj}
                      onSelect={(d) => {
                        if (d) {
                          const ist = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
                          setSummaryDate(ist.toISOString().slice(0, 10));
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <Input
                  type="month"
                  value={summaryDate.slice(0, 7)}
                  onChange={(e) => setSummaryDate(e.target.value + "-01")}
                  className="w-[160px]"
                />
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSummaryDate(prev => activeTab === "weekly" ? addDays(prev, 7) : addMonths(prev, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {summaryMsg && (
              <div
                className={`mb-6 text-sm px-4 py-3 rounded-lg font-medium border ${
                  summaryMsg.ok
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-destructive/10 text-destructive border-destructive/20"
                }`}
              >
                {summaryMsg.text}
              </div>
            )}

            {summaryLoading ? (
              <div className="py-12 flex justify-center items-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading summary...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-muted/40 shadow-none border-muted">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-semibold">AI Summary</CardTitle>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={generateSummary}
                      disabled={summaryGenerating}
                    >
                      {summaryGenerating && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                      {summaryGenerating ? "Generating..." : summaryData ? "Regenerate" : "Generate"}
                    </Button>
                  </CardHeader>
                  <CardContent className="h-72 overflow-y-auto">
                    {summaryData?.aiSummary ? (
                      <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                        {summaryData.aiSummary}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground italic">
                        No summary generated yet.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-none border-muted">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Raw Compiled Logs</CardTitle>
                  </CardHeader>
                  <CardContent className="h-72 overflow-y-auto">
                    {summaryData?.rawSummary ? (
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans">
                        {summaryData.rawSummary}
                      </pre>
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground italic text-center px-4">
                        No logs compiled for this period. Generate the summary to compile logs.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
