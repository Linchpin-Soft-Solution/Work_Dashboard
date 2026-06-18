"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useConfirm } from "@/hooks/use-confirm";
import {
  Loader2,
  ArrowLeft,
  Phone,
  PhoneCall,
  MessageSquare,
  ArrowRightLeft,
  UserPlus,
  CalendarClock,
  Trash2,
  Pencil,
} from "lucide-react";
import {
  ProspectDetail,
  Stage,
  RepRef,
  CallOutcome,
  CrmActivityType,
  LeadSource,
  OUTCOME_LABELS,
  OUTCOME_ORDER,
  SOURCE_LABELS,
  SOURCE_ORDER,
  PackageTier,
  PACKAGE_LABELS,
  PACKAGE_ORDER,
  formatINR,
  formatDate,
  formatDateTime,
  followUpStatus,
  stageBadgeClass,
  outcomeBadgeClass,
  packageBadgeClass,
} from "../../types";

type TimelineItem = {
  id: string;
  kind: "call" | "remark" | "activity";
  at: string;
  who: string;
  title: string;
  body?: string | null;
  activityType?: CrmActivityType;
  outcome?: CallOutcome;
};

const activityIconColor: Record<CrmActivityType, string> = {
  CALL: "text-emerald-500",
  REMARK: "text-blue-500",
  STAGE_CHANGE: "text-violet-500",
  ASSIGNMENT: "text-amber-500",
  FOLLOW_UP_SET: "text-sky-500",
};

const activityIcon: Record<CrmActivityType, React.ReactNode> = {
  CALL: <PhoneCall className="h-4 w-4" />,
  REMARK: <MessageSquare className="h-4 w-4" />,
  STAGE_CHANGE: <ArrowRightLeft className="h-4 w-4" />,
  ASSIGNMENT: <UserPlus className="h-4 w-4" />,
  FOLLOW_UP_SET: <CalendarClock className="h-4 w-4" />,
};

export default function ProspectDetailClient({
  prospectId,
  isManager,
  reps,
}: {
  prospectId: string;
  isManager: boolean;
  reps: RepRef[];
}) {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();

  const [prospect, setProspect] = useState<ProspectDetail | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);

  // Call-logging form
  const [outcome, setOutcome] = useState<CallOutcome | "">("");
  const [duration, setDuration] = useState("");
  const [callRemark, setCallRemark] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [callStageId, setCallStageId] = useState("");
  const [loggingCall, setLoggingCall] = useState(false);

  // Remark box
  const [remarkText, setRemarkText] = useState("");
  const [savingRemark, setSavingRemark] = useState(false);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    email: "",
    city: "",
    industry: "",
    source: "OTHER" as LeadSource,
    packageTier: "" as PackageTier | "",
    dealValue: "",
    lostReason: "",
    assignedRepId: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchProspect = useCallback(async () => {
    try {
      const res = await fetch(`/api/crm/prospects/${prospectId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProspect(data.prospect);
      setCallStageId(data.prospect.stageId);
    } catch {
      toast.error("Failed to load prospect.");
    } finally {
      setLoading(false);
    }
  }, [prospectId]);

  const fetchStages = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/stages");
      const data = await res.json();
      setStages(data.stages ?? []);
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    fetchProspect();
    fetchStages();
  }, [fetchProspect, fetchStages]);

  async function logCall(e: React.FormEvent) {
    e.preventDefault();
    if (!outcome) {
      toast.error("Pick a call outcome.");
      return;
    }
    setLoggingCall(true);
    try {
      const res = await fetch(`/api/crm/prospects/${prospectId}/calls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcome,
          durationSeconds: duration ? Number(duration) * 60 : undefined,
          remark: callRemark || undefined,
          nextFollowUpAt: followUp || undefined,
          stageId: callStageId || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Call logged");
      setOutcome("");
      setDuration("");
      setCallRemark("");
      setFollowUp("");
      fetchProspect();
    } catch {
      toast.error("Failed to log call.");
    } finally {
      setLoggingCall(false);
    }
  }

  async function addRemark(e: React.FormEvent) {
    e.preventDefault();
    if (!remarkText.trim()) return;
    setSavingRemark(true);
    try {
      const res = await fetch(`/api/crm/prospects/${prospectId}/remarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: remarkText }),
      });
      if (!res.ok) throw new Error();
      toast.success("Remark added");
      setRemarkText("");
      fetchProspect();
    } catch {
      toast.error("Failed to add remark.");
    } finally {
      setSavingRemark(false);
    }
  }

  function openEdit() {
    if (!prospect) return;
    setEditForm({
      email: prospect.email ?? "",
      city: prospect.city ?? "",
      industry: prospect.industry ?? "",
      source: prospect.source,
      packageTier: prospect.packageTier ?? "",
      dealValue: prospect.dealValue != null ? String(prospect.dealValue) : "",
      lostReason: prospect.lostReason ?? "",
      assignedRepId: prospect.assignedRepId,
    });
    setEditOpen(true);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/crm/prospects/${prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: editForm.email,
          city: editForm.city,
          industry: editForm.industry,
          source: editForm.source,
          packageTier: editForm.packageTier || null,
          dealValue: editForm.dealValue === "" ? null : editForm.dealValue,
          lostReason: editForm.lostReason,
          ...(isManager ? { assignedRepId: editForm.assignedRepId } : {}),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Prospect updated");
      setEditOpen(false);
      fetchProspect();
    } catch {
      toast.error("Failed to update prospect.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteProspect() {
    const ok = await confirm("Delete prospect?", "This permanently removes the prospect and its history.");
    if (!ok) return;
    try {
      const res = await fetch(`/api/crm/prospects/${prospectId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Prospect deleted");
      router.push("/crm/prospects");
    } catch {
      toast.error("Failed to delete prospect.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!prospect) return <p className="text-gray-500">Prospect not found.</p>;

  // Item maps so Select triggers show labels (names) instead of raw values (ids).
  const stageItems = stages.map((s) => ({ value: s.id, label: s.name }));
  const repItems = reps.map((r) => ({ value: r.id, label: r.name }));
  const sourceItems = SOURCE_ORDER.map((s) => ({ value: s, label: SOURCE_LABELS[s] }));
  const outcomeItems = OUTCOME_ORDER.map((o) => ({ value: o, label: OUTCOME_LABELS[o] }));
  const packageItems = PACKAGE_ORDER.map((p) => ({ value: p, label: PACKAGE_LABELS[p] }));

  // Merge the timeline.
  const timeline: TimelineItem[] = [
    ...prospect.Calls.map((c) => ({
      id: `c-${c.id}`,
      kind: "call" as const,
      at: c.calledAt,
      who: c.User.name,
      title: OUTCOME_LABELS[c.outcome],
      body: c.remark,
      activityType: "CALL" as CrmActivityType,
      outcome: c.outcome,
    })),
    ...prospect.Remarks.map((r) => ({
      id: `r-${r.id}`,
      kind: "remark" as const,
      at: r.createdAt,
      who: r.User.name,
      title: "Remark",
      body: r.text,
      activityType: "REMARK" as CrmActivityType,
    })),
    ...prospect.Activities.filter((a) => a.type === "STAGE_CHANGE" || a.type === "ASSIGNMENT" || a.type === "FOLLOW_UP_SET").map(
      (a) => ({
        id: `a-${a.id}`,
        kind: "activity" as const,
        at: a.createdAt,
        who: a.User.name,
        title: a.detail,
        activityType: a.type,
      }),
    ),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const fu = followUpStatus(prospect.nextFollowUpAt);

  return (
    <div className="space-y-6">
      <Link
        href="/crm/prospects"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to prospects
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {prospect.companyName}
                </h1>
                {prospect.isInvalid && <Badge variant="destructive">Invalid</Badge>}
                <Badge variant="outline" className={stageBadgeClass(prospect.Stage)}>
                  {prospect.Stage.name}
                </Badge>
                {prospect.packageTier && (
                  <Badge variant="outline" className={packageBadgeClass(prospect.packageTier)}>
                    {PACKAGE_LABELS[prospect.packageTier]}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <Phone className="h-3 w-3" /> {prospect.contactName} · {prospect.phone}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 pt-1">
                {prospect.email && <span>{prospect.email}</span>}
                {prospect.city && <span>{prospect.city}</span>}
                {prospect.industry && <span>{prospect.industry}</span>}
                <span>Source: {SOURCE_LABELS[prospect.source]}</span>
                <span>Rep: {prospect.Rep.name}</span>
              </div>
            </div>
            <div className="text-right space-y-1">
              <p className="text-lg font-bold text-emerald-600">{formatINR(prospect.dealValue)}</p>
              <p className={`text-sm ${fu === "overdue" ? "text-red-600 font-semibold" : fu === "today" ? "text-amber-600 font-semibold" : "text-gray-500"}`}>
                {prospect.nextFollowUpAt ? `Follow-up: ${formatDate(prospect.nextFollowUpAt)}` : "No follow-up set"}
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={openEdit}>
                  <Pencil className="h-3 w-3 mr-1" /> Edit
                </Button>
                {isManager && (
                  <Button size="sm" variant="outline" onClick={deleteProspect}>
                    <Trash2 className="h-3 w-3 mr-1" /> Delete
                  </Button>
                )}
              </div>
            </div>
          </div>
          {prospect.lostReason && (
            <p className="text-sm text-red-600 mt-3">Lost reason: {prospect.lostReason}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Log a call */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Log a call</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={logCall} className="space-y-3">
              <div>
                <Label>Outcome *</Label>
                <Select value={outcome} onValueChange={(v) => v && setOutcome(v as CallOutcome)} items={outcomeItems}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTCOME_ORDER.map((o) => (
                      <SelectItem key={o} value={o}>
                        {OUTCOME_LABELS[o]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Duration (min)</Label>
                  <Input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="optional"
                  />
                </div>
                <div>
                  <Label>Next follow-up</Label>
                  <Input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Move to stage</Label>
                <Select value={callStageId} onValueChange={(v) => v && setCallStageId(v)} items={stageItems}>
                  <SelectTrigger>
                    <SelectValue />
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
              <div>
                <Label>Remark</Label>
                <Textarea
                  value={callRemark}
                  onChange={(e) => setCallRemark(e.target.value)}
                  placeholder="What happened on the call?"
                  rows={2}
                />
              </div>
              <Button type="submit" disabled={loggingCall} className="w-full">
                {loggingCall && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Log call
              </Button>
            </form>

            <form onSubmit={addRemark} className="space-y-2 pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
              <Label>Add a remark (no call)</Label>
              <Textarea
                value={remarkText}
                onChange={(e) => setRemarkText(e.target.value)}
                rows={2}
                placeholder="General note…"
              />
              <Button type="submit" variant="outline" size="sm" disabled={savingRemark}>
                {savingRemark && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Add remark
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[28rem] overflow-y-auto">
              {timeline.map((t) => (
                <div key={t.id} className="flex gap-3">
                  <div className={`mt-0.5 ${t.activityType ? activityIconColor[t.activityType] : "text-gray-400"}`}>
                    {t.activityType ? activityIcon[t.activityType] : <MessageSquare className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    {t.outcome ? (
                      <Badge variant="outline" className={`text-[10px] ${outcomeBadgeClass(t.outcome)}`}>
                        {t.title}
                      </Badge>
                    ) : (
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t.title}</p>
                    )}
                    {t.body && <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{t.body}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t.who} · {formatDateTime(t.at)}
                    </p>
                  </div>
                </div>
              ))}
              {timeline.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">No activity yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit prospect</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveEdit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Email</Label>
                <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div>
                <Label>City</Label>
                <Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
              </div>
              <div>
                <Label>Industry</Label>
                <Input
                  value={editForm.industry}
                  onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                />
              </div>
              <div>
                <Label>Deal value (₹)</Label>
                <Input
                  type="number"
                  value={editForm.dealValue}
                  onChange={(e) => setEditForm({ ...editForm, dealValue: e.target.value })}
                />
              </div>
              <div>
                <Label>Source</Label>
                <Select
                  value={editForm.source}
                  onValueChange={(v) => v && setEditForm({ ...editForm, source: v as LeadSource })}
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
                <Label>Package</Label>
                <Select
                  value={editForm.packageTier}
                  onValueChange={(v) => v && setEditForm({ ...editForm, packageTier: v as PackageTier })}
                  items={packageItems}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select package" />
                  </SelectTrigger>
                  <SelectContent>
                    {PACKAGE_ORDER.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PACKAGE_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isManager && (
                <div>
                  <Label>Assigned rep</Label>
                  <Select
                    value={editForm.assignedRepId}
                    onValueChange={(v) => v && setEditForm({ ...editForm, assignedRepId: v })}
                    items={repItems}
                  >
                    <SelectTrigger>
                      <SelectValue />
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
            <div>
              <Label>Lost reason</Label>
              <Input
                value={editForm.lostReason}
                onChange={(e) => setEditForm({ ...editForm, lostReason: e.target.value })}
                placeholder="If marking as lost"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingEdit}>
                {savingEdit && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </div>
  );
}
