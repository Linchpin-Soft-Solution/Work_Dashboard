"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Loader2, PhoneCall, AlertCircle, CalendarClock, Trophy, Users } from "lucide-react";
import { formatINR, stageDotClass } from "./types";

interface PipelineRow {
  stageId: string;
  name: string;
  isWon: boolean;
  isLost: boolean;
  count: number;
  value: number;
}
interface RepActivity {
  repId: string;
  name: string;
  callsThisMonth: number;
}
interface DashboardData {
  manager: boolean;
  pipeline: PipelineRow[];
  callsDueToday: number;
  overdueFollowUps: number;
  callsLoggedToday: number;
  wonThisMonth: number;
  lostThisMonth: number;
  repActivity?: RepActivity[];
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${accent}`}>{value}</p>
          </div>
          <div className={accent}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CrmDashboardClient({ userName }: { userName: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/dashboard");
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error("Failed to load CRM dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!data) return null;

  const totalValue = data.pipeline.reduce((sum, p) => sum + (p.isWon || p.isLost ? 0 : p.value), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {data.manager ? "Team CRM Dashboard" : `Welcome, ${userName}`}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {data.manager ? "Pipeline and call activity across the team." : "Your worklist for today."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/crm/prospects" className={buttonVariants()}>
            <Users className="h-4 w-4 mr-1" /> Prospects
          </Link>
          <Link href="/crm/follow-ups" className={buttonVariants({ variant: "outline" })}>
            <CalendarClock className="h-4 w-4 mr-1" /> Follow-ups
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/crm/follow-ups">
          <StatCard
            label="Calls due today"
            value={data.callsDueToday}
            icon={<CalendarClock className="h-6 w-6" />}
            accent="text-blue-600 dark:text-blue-400"
          />
        </Link>
        <Link href="/crm/follow-ups">
          <StatCard
            label="Overdue follow-ups"
            value={data.overdueFollowUps}
            icon={<AlertCircle className="h-6 w-6" />}
            accent="text-red-600 dark:text-red-400"
          />
        </Link>
        <StatCard
          label="Calls logged today"
          value={data.callsLoggedToday}
          icon={<PhoneCall className="h-6 w-6" />}
          accent="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          label="Won this month"
          value={data.wonThisMonth}
          icon={<Trophy className="h-6 w-6" />}
          accent="text-amber-600 dark:text-amber-400"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{data.manager ? "Team pipeline" : "My pipeline"}</span>
            <span className="text-sm font-normal text-gray-500">
              Open value: {formatINR(totalValue)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {data.pipeline.map((p) => (
              <Link
                key={p.stageId}
                href={`/crm/prospects?stageId=${p.stageId}`}
                className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 hover:border-blue-400 hover:shadow-sm transition-all"
              >
                <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-gray-500 truncate">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${stageDotClass(p)}`} />
                  <span className="truncate">{p.name}</span>
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">{p.count}</p>
                <p className="text-xs text-gray-500">{formatINR(p.value)}</p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {data.manager && data.repActivity && (
        <Card>
          <CardHeader>
            <CardTitle>Calls per rep (this month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.repActivity.map((r) => (
                <div key={r.repId} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{r.name}</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {r.callsThisMonth}
                  </span>
                </div>
              ))}
              {data.repActivity.length === 0 && (
                <p className="text-sm text-gray-400">No reps configured yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
