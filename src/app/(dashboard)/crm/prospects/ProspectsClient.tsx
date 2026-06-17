"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, PlusIcon, LayoutGrid, List, Phone } from "lucide-react";
import {
  Prospect,
  Stage,
  RepRef,
  LeadSource,
  OUTCOME_LABELS,
  SOURCE_LABELS,
  SOURCE_ORDER,
  formatINR,
  formatDate,
  followUpStatus,
  stageBadgeClass,
  stageDotClass,
  outcomeBadgeClass,
} from "../types";

const followUpClasses: Record<string, string> = {
  overdue: "text-red-600 dark:text-red-400 font-semibold",
  today: "text-amber-600 dark:text-amber-400 font-semibold",
  upcoming: "text-gray-600 dark:text-gray-400",
  none: "text-gray-400",
};

const emptyForm = {
  companyName: "",
  contactName: "",
  phone: "",
  email: "",
  city: "",
  industry: "",
  source: "COLD_LIST" as LeadSource,
  dealValue: "",
  stageId: "",
  assignedRepId: "",
};

export default function ProspectsClient({
  isManager,
  reps,
}: {
  isManager: boolean;
  reps: RepRef[];
}) {
  const searchParams = useSearchParams();
  const initialStage = searchParams.get("stageId") ?? "all";

  const [stages, setStages] = useState<Stage[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"board" | "list">("board");

  // Filters
  const [filterStage, setFilterStage] = useState(initialStage);
  const [filterRep, setFilterRep] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [search, setSearch] = useState("");

  // New prospect modal
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchStages = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/stages");
      const data = await res.json();
      setStages(data.stages ?? []);
    } catch {
      toast.error("Failed to load stages.");
    }
  }, []);

  const fetchProspects = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStage !== "all") params.set("stageId", filterStage);
    if (isManager && filterRep !== "all") params.set("repId", filterRep);
    if (filterSource !== "all") params.set("source", filterSource);
    if (search.trim()) params.set("search", search.trim());
    try {
      const res = await fetch(`/api/crm/prospects?${params.toString()}`);
      const data = await res.json();
      setProspects(data.prospects ?? []);
    } catch {
      toast.error("Failed to load prospects.");
    } finally {
      setLoading(false);
    }
  }, [filterStage, filterRep, filterSource, search, isManager]);

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  useEffect(() => {
    const t = setTimeout(fetchProspects, 250);
    return () => clearTimeout(t);
  }, [fetchProspects]);

  async function moveStage(prospectId: string, stageId: string) {
    try {
      const res = await fetch(`/api/crm/prospects/${prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Stage updated");
      fetchProspects();
    } catch {
      toast.error("Failed to move prospect.");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/crm/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          stageId: form.stageId || undefined,
          assignedRepId: isManager ? form.assignedRepId || undefined : undefined,
        }),
      });
      const data = await res.json();
      if (res.status === 409) {
        toast.error(data.error || "Duplicate phone number");
        return;
      }
      if (!res.ok) throw new Error(data.error);
      toast.success("Prospect added");
      setModalOpen(false);
      setForm(emptyForm);
      fetchProspects();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add prospect.");
    } finally {
      setSaving(false);
    }
  }

  const repName = (id: string) => reps.find((r) => r.id === id)?.name ?? "—";

  // Item maps so the Select trigger shows labels (names) instead of raw values (ids).
  const stageItems = stages.map((s) => ({ value: s.id, label: s.name }));
  const repItems = reps.map((r) => ({ value: r.id, label: r.name }));
  const sourceItems = SOURCE_ORDER.map((s) => ({ value: s, label: SOURCE_LABELS[s] }));
  const stageFilterItems = [{ value: "all", label: "All stages" }, ...stageItems];
  const repFilterItems = [{ value: "all", label: "All reps" }, ...repItems];
  const sourceFilterItems = [{ value: "all", label: "All sources" }, ...sourceItems];

  function ProspectCard({ p }: { p: Prospect }) {
    const fu = followUpStatus(p.nextFollowUpAt);
    return (
      <Card className="mb-3">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/crm/prospects/${p.id}`} className="font-semibold text-sm hover:underline">
              {p.companyName}
            </Link>
            {p.dealValue != null && (
              <span className="text-xs font-medium text-emerald-600 whitespace-nowrap">
                {formatINR(p.dealValue)}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {p.contactName} · {p.phone}
          </p>
          {p.lastCallOutcome && (
            <Badge variant="outline" className={`text-[10px] ${outcomeBadgeClass(p.lastCallOutcome)}`}>
              {OUTCOME_LABELS[p.lastCallOutcome]}
            </Badge>
          )}
          <div className="flex items-center justify-between text-xs">
            <span className={followUpClasses[fu]}>
              {p.nextFollowUpAt ? `Follow-up: ${formatDate(p.nextFollowUpAt)}` : "No follow-up"}
            </span>
            {isManager && <span className="text-gray-400">{repName(p.assignedRepId)}</span>}
          </div>
          <Select value={p.stageId} onValueChange={(v) => v && moveStage(p.id, v)} items={stageItems}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {stages.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Prospects</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {loading ? "Loading…" : `${prospects.length} ${prospects.length === 1 ? "prospect" : "prospects"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "board" ? "list" : "board")}
          >
            {viewMode === "board" ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
            <span className="ml-1">{viewMode === "board" ? "List" : "Board"}</span>
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setForm({ ...emptyForm, stageId: stages[0]?.id ?? "" });
              setModalOpen(true);
            }}
          >
            <PlusIcon className="h-4 w-4 mr-1" /> New Prospect
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search company / contact / phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filterStage} onValueChange={(v) => v && setFilterStage(v)} items={stageFilterItems}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {stages.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isManager && (
          <Select value={filterRep} onValueChange={(v) => v && setFilterRep(v)} items={repFilterItems}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Rep" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All reps</SelectItem>
              {reps.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={filterSource} onValueChange={(v) => v && setFilterSource(v)} items={sourceFilterItems}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {SOURCE_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {SOURCE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : viewMode === "board" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((s) => {
            const cards = prospects.filter((p) => p.stageId === s.id);
            return (
              <div key={s.id} className="w-72 shrink-0">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <span className={`h-2 w-2 rounded-full ${stageDotClass(s)}`} />
                    {s.name}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {cards.length}
                  </Badge>
                </div>
                <div className="bg-gray-100 dark:bg-gray-900/50 rounded-lg p-2 min-h-24 max-h-[calc(100vh-22rem)] overflow-y-auto">
                  {cards.map((p) => (
                    <ProspectCard key={p.id} p={p} />
                  ))}
                  {cards.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">No prospects</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Last outcome</TableHead>
                  <TableHead>Follow-up</TableHead>
                  <TableHead>Value</TableHead>
                  {isManager && <TableHead>Rep</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {prospects.map((p) => {
                  const fu = followUpStatus(p.nextFollowUpAt);
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link href={`/crm/prospects/${p.id}`} className="font-medium hover:underline">
                          {p.companyName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {p.contactName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={stageBadgeClass(p.Stage)}>
                          {p.Stage.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {p.lastCallOutcome ? (
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${outcomeBadgeClass(p.lastCallOutcome)}`}
                          >
                            {OUTCOME_LABELS[p.lastCallOutcome]}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className={`text-sm ${followUpClasses[fu]}`}>
                        {formatDate(p.nextFollowUpAt)}
                      </TableCell>
                      <TableCell className="text-sm">{formatINR(p.dealValue)}</TableCell>
                      {isManager && (
                        <TableCell className="text-sm text-gray-500">
                          {repName(p.assignedRepId)}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
                {prospects.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isManager ? 7 : 6} className="text-center text-gray-400 py-8">
                      No prospects match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* New prospect modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Prospect</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Company *</Label>
                <Input
                  required
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                />
              </div>
              <div>
                <Label>Contact *</Label>
                <Input
                  required
                  value={form.contactName}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <Label>Industry</Label>
                <Input
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                />
              </div>
              <div>
                <Label>Source</Label>
                <Select
                  value={form.source}
                  onValueChange={(v) => v && setForm({ ...form, source: v as LeadSource })}
                  items={sourceItems}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>
                        {SOURCE_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Deal value (₹)</Label>
                <Input
                  type="number"
                  value={form.dealValue}
                  onChange={(e) => setForm({ ...form, dealValue: e.target.value })}
                />
              </div>
              <div>
                <Label>Stage</Label>
                <Select value={form.stageId} onValueChange={(v) => v && setForm({ ...form, stageId: v })} items={stageItems}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isManager && (
                <div>
                  <Label>Assign to</Label>
                  <Select
                    value={form.assignedRepId}
                    onValueChange={(v) => v && setForm({ ...form, assignedRepId: v })}
                    items={repItems}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Me (default)" />
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
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Add Prospect
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
