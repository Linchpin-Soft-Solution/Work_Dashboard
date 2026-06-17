"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Download } from "lucide-react";
import { SOURCE_LABELS, LeadSource, formatINR } from "../types";

interface ReportData {
  from: string;
  to: string;
  callActivity: { repId: string; name: string; calls: number; connected: number; connectRate: number }[];
  pipelineSnapshot: { name: string; count: number; value: number }[];
  winLoss: {
    won: number;
    lost: number;
    total: number;
    conversionRate: number;
    lostReasons: { reason: string; count: number }[];
  };
  sourcePerformance: { source: LeadSource; total: number; won: number; winRate: number }[];
}

// Build and trigger a CSV download from rows of primitives.
function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function ReportsClient() {
  const today = new Date();
  const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());

  const [from, setFrom] = useState(isoDate(monthAgo));
  const [to, setTo] = useState(isoDate(today));
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/reports?from=${from}&to=${to}`);
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error("Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reports</h1>
        <div className="flex items-end gap-2">
          <div>
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </div>
        </div>
      </div>

      {loading || !data ? (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          {/* Call activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>Call activity (in range)</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadCsv(
                      "call-activity.csv",
                      ["Rep", "Calls", "Connected", "Connect rate %"],
                      data.callActivity.map((r) => [r.name, r.calls, r.connected, r.connectRate]),
                    )
                  }
                >
                  <Download className="h-4 w-4 mr-1" /> CSV
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rep</TableHead>
                    <TableHead>Calls</TableHead>
                    <TableHead>Connected</TableHead>
                    <TableHead>Connect rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.callActivity.map((r) => (
                    <TableRow key={r.repId}>
                      <TableCell>{r.name}</TableCell>
                      <TableCell>{r.calls}</TableCell>
                      <TableCell>{r.connected}</TableCell>
                      <TableCell>{r.connectRate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pipeline snapshot */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>Pipeline snapshot</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadCsv(
                      "pipeline-snapshot.csv",
                      ["Stage", "Count", "Value (INR)"],
                      data.pipelineSnapshot.map((r) => [r.name, r.count, r.value]),
                    )
                  }
                >
                  <Download className="h-4 w-4 mr-1" /> CSV
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stage</TableHead>
                    <TableHead>Count</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.pipelineSnapshot.map((r) => (
                    <TableRow key={r.name}>
                      <TableCell>{r.name}</TableCell>
                      <TableCell>{r.count}</TableCell>
                      <TableCell>{formatINR(r.value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Win/loss */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Win / Loss</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">{data.winLoss.won}</p>
                    <p className="text-xs text-gray-500">Won</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{data.winLoss.lost}</p>
                    <p className="text-xs text-gray-500">Lost</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{data.winLoss.conversionRate}%</p>
                    <p className="text-xs text-gray-500">Conversion</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-sm font-medium mb-1">Lost reasons</p>
                  {data.winLoss.lostReasons.length === 0 ? (
                    <p className="text-sm text-gray-400">No lost prospects.</p>
                  ) : (
                    data.winLoss.lostReasons.map((l) => (
                      <div key={l.reason} className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{l.reason}</span>
                        <span className="font-medium">{l.count}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Source performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>Source performance</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      downloadCsv(
                        "source-performance.csv",
                        ["Source", "Total", "Won", "Win rate %"],
                        data.sourcePerformance.map((r) => [
                          SOURCE_LABELS[r.source],
                          r.total,
                          r.won,
                          r.winRate,
                        ]),
                      )
                    }
                  >
                    <Download className="h-4 w-4 mr-1" /> CSV
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Won</TableHead>
                      <TableHead>Win rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.sourcePerformance.map((r) => (
                      <TableRow key={r.source}>
                        <TableCell>{SOURCE_LABELS[r.source]}</TableCell>
                        <TableCell>{r.total}</TableCell>
                        <TableCell>{r.won}</TableCell>
                        <TableCell>{r.winRate}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
