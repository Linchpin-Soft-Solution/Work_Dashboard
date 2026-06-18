"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Loader2 } from "lucide-react";
import {
  Stage,
  RepRef,
  LeadSource,
  PackageTier,
  SOURCE_LABELS,
  SOURCE_ORDER,
  PACKAGE_LABELS,
  PACKAGE_ORDER,
} from "./types";

const emptyForm = {
  companyName: "",
  contactName: "",
  phone: "",
  email: "",
  city: "",
  industry: "",
  source: "COLD_LIST" as LeadSource,
  packageTier: "" as PackageTier | "",
  dealValue: "",
  stageId: "",
  assignedRepId: "",
};

// Reusable "add a prospect/client" dialog. Self-contained: it loads the active
// pipeline stages on open and posts to /api/crm/prospects.
export default function NewProspectDialog({
  open,
  onOpenChange,
  isManager,
  reps,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isManager: boolean;
  reps: RepRef[];
  onCreated?: () => void;
}) {
  const [stages, setStages] = useState<Stage[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchStages = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/stages");
      const data = await res.json();
      setStages(data.stages ?? []);
    } catch {
      /* non-fatal — POST falls back to the default stage */
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchStages();
      setForm(emptyForm);
    }
  }, [open, fetchStages]);

  // Default the stage selection to the first stage once stages load.
  useEffect(() => {
    if (open && stages.length > 0) {
      setForm((f) => (f.stageId ? f : { ...f, stageId: stages[0].id }));
    }
  }, [open, stages]);

  const stageItems = stages.map((s) => ({ value: s.id, label: s.name }));
  const repItems = reps.map((r) => ({ value: r.id, label: r.name }));
  const sourceItems = SOURCE_ORDER.map((s) => ({ value: s, label: SOURCE_LABELS[s] }));
  const packageItems = PACKAGE_ORDER.map((p) => ({ value: p, label: PACKAGE_LABELS[p] }));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/crm/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          packageTier: form.packageTier || undefined,
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
      toast.success("Client added");
      onOpenChange(false);
      setForm(emptyForm);
      onCreated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add client.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Client</DialogTitle>
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
              <Label>Package</Label>
              <Select
                value={form.packageTier}
                onValueChange={(v) => v && setForm({ ...form, packageTier: v as PackageTier })}
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
              <Select
                value={form.stageId}
                onValueChange={(v) => v && setForm({ ...form, stageId: v })}
                items={stageItems}
              >
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Add Client
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
