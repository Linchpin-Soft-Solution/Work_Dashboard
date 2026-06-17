"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Upload } from "lucide-react";
import { RepRef } from "../types";

// Minimal CSV parser: handles quoted fields, escaped quotes, and CRLF.
function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const records: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c.trim() !== "")) records.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((c) => c.trim() !== "")) records.push(row);
  }
  const headers = records.shift() ?? [];
  return { headers: headers.map((h) => h.trim()), rows: records };
}

const TARGET_FIELDS = [
  { key: "companyName", label: "Company *", required: true },
  { key: "contactName", label: "Contact *", required: true },
  { key: "phone", label: "Phone *", required: true },
  { key: "email", label: "Email", required: false },
  { key: "city", label: "City", required: false },
  { key: "industry", label: "Industry", required: false },
  { key: "source", label: "Source", required: false },
  { key: "dealValue", label: "Deal value", required: false },
] as const;

const NONE = "__none__";

function guessColumn(headers: string[], key: string): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  const target = norm(key);
  const found = headers.find((h) => norm(h).includes(target) || target.includes(norm(h)));
  return found ?? NONE;
}

export default function ImportClient({ reps }: { reps: RepRef[] }) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [defaultRepId, setDefaultRepId] = useState(reps[0]?.id ?? "");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: { row: number; reason: string }[] } | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const { headers: h, rows: r } = parseCsv(String(reader.result));
      setHeaders(h);
      setRows(r);
      setResult(null);
      const initial: Record<string, string> = {};
      for (const f of TARGET_FIELDS) initial[f.key] = guessColumn(h, f.key);
      setMapping(initial);
    };
    reader.readAsText(file);
  }

  async function doImport() {
    const required = TARGET_FIELDS.filter((f) => f.required);
    for (const f of required) {
      if (!mapping[f.key] || mapping[f.key] === NONE) {
        toast.error(`Map a column for "${f.label}".`);
        return;
      }
    }
    const colIndex = (key: string) => headers.indexOf(mapping[key]);
    const payload = rows.map((r) => {
      const obj: Record<string, string> = {};
      for (const f of TARGET_FIELDS) {
        const idx = colIndex(f.key);
        if (idx >= 0) obj[f.key] = (r[idx] ?? "").trim();
      }
      return obj;
    });

    setImporting(true);
    try {
      const res = await fetch("/api/crm/prospects/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: payload, defaultRepId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      toast.success(`${data.imported} imported, ${data.skipped.length} skipped`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Import Prospects</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Upload a CSV, map the columns, and import. Duplicate phone numbers are skipped automatically.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Upload CSV</CardTitle>
        </CardHeader>
        <CardContent>
          <input type="file" accept=".csv,text/csv" onChange={onFile} className="text-sm" />
          {rows.length > 0 && (
            <p className="text-sm text-gray-500 mt-2">{rows.length} data rows detected.</p>
          )}
        </CardContent>
      </Card>

      {headers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Map columns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {TARGET_FIELDS.map((f) => (
                <div key={f.key}>
                  <Label>{f.label}</Label>
                  <Select
                    value={mapping[f.key] ?? NONE}
                    onValueChange={(v) => setMapping((m) => ({ ...m, [f.key]: v ?? NONE }))}
                    items={[{ value: NONE, label: "— none —" }, ...headers.map((h) => ({ value: h, label: h }))]}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— none —</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div>
              <Label>Assign imported prospects to</Label>
              <Select
                value={defaultRepId}
                onValueChange={(v) => v && setDefaultRepId(v)}
                items={reps.map((r) => ({ value: r.id, label: r.name }))}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select rep" />
                </SelectTrigger>
                <SelectContent>
                  {reps.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={doImport} disabled={importing}>
              {importing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
              Import {rows.length} rows
            </Button>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Result</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-emerald-600 mb-3">{result.imported} prospects imported.</p>
            {result.skipped.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Reason skipped</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.skipped.map((s) => (
                    <TableRow key={s.row}>
                      <TableCell>{s.row}</TableCell>
                      <TableCell className="text-sm text-gray-500">{s.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
