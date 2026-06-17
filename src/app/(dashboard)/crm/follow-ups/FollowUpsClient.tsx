"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Phone } from "lucide-react";
import { Prospect, OUTCOME_LABELS, formatDate, followUpStatus } from "../types";

function Section({
  title,
  items,
  accent,
}: {
  title: string;
  items: Prospect[];
  accent: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className={accent}>{title}</span>
          <Badge variant="outline">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((p) => (
          <Link
            key={p.id}
            href={`/crm/prospects/${p.id}`}
            className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-800 p-3 hover:border-blue-400 transition-colors"
          >
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{p.companyName}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Phone className="h-3 w-3" /> {p.contactName} · {p.phone}
              </p>
            </div>
            <div className="text-right shrink-0 ml-3">
              <p className={`text-sm ${accent}`}>{formatDate(p.nextFollowUpAt)}</p>
              {p.lastCallOutcome && (
                <p className="text-[10px] text-gray-400">{OUTCOME_LABELS[p.lastCallOutcome]}</p>
              )}
            </div>
          </Link>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-400">Nothing here.</p>}
      </CardContent>
    </Card>
  );
}

export default function FollowUpsClient() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/prospects");
      const data = await res.json();
      setProspects(data.prospects ?? []);
    } catch {
      toast.error("Failed to load follow-ups.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const withFollowUp = prospects.filter((p) => p.nextFollowUpAt);
  const overdue = withFollowUp.filter((p) => followUpStatus(p.nextFollowUpAt) === "overdue");
  const today = withFollowUp.filter((p) => followUpStatus(p.nextFollowUpAt) === "today");
  const upcoming = withFollowUp.filter((p) => followUpStatus(p.nextFollowUpAt) === "upcoming");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Follow-ups</h1>
      <Section title="Overdue" items={overdue} accent="text-red-600 dark:text-red-400" />
      <Section title="Today" items={today} accent="text-amber-600 dark:text-amber-400" />
      <Section title="Upcoming" items={upcoming} accent="text-blue-600 dark:text-blue-400" />
    </div>
  );
}
