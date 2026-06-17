"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfirm } from "@/hooks/use-confirm";
import { Loader2, ChevronUp, ChevronDown, Trash2, Plus } from "lucide-react";
import { Stage, stageDotClass } from "../types";

export default function StagesClient() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchStages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/stages");
      const data = await res.json();
      setStages(data.stages ?? []);
    } catch {
      toast.error("Failed to load stages.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  async function patchStage(id: string, body: Partial<Stage>) {
    try {
      const res = await fetch(`/api/crm/stages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      fetchStages();
    } catch {
      toast.error("Failed to update stage.");
    }
  }

  async function addStage(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/crm/stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success("Stage added");
      setNewName("");
      fetchStages();
    } catch {
      toast.error("Failed to add stage.");
    } finally {
      setAdding(false);
    }
  }

  async function deleteStage(s: Stage) {
    const ok = await confirm(
      "Remove stage?",
      "If prospects are in this stage it will be deactivated instead of deleted.",
    );
    if (!ok) return;
    try {
      const res = await fetch(`/api/crm/stages/${s.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error();
      toast.success(data.deactivated ? "Stage deactivated (in use)" : "Stage removed");
      fetchStages();
    } catch {
      toast.error("Failed to remove stage.");
    }
  }

  // Swap sortOrder with the neighbour in the given direction.
  async function move(index: number, dir: -1 | 1) {
    const target = stages[index + dir];
    const current = stages[index];
    if (!target) return;
    await Promise.all([
      patchStageRaw(current.id, { sortOrder: target.sortOrder }),
      patchStageRaw(target.id, { sortOrder: current.sortOrder }),
    ]);
    fetchStages();
  }

  async function patchStageRaw(id: string, body: Partial<Stage>) {
    await fetch(`/api/crm/stages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Pipeline Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Rename, reorder, and flag your sales stages. Mark which stage means Won or Lost.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stages</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10 text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {stages.map((s, i) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-800 p-3"
                >
                  <div className="flex flex-col">
                    <button
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={i === stages.length - 1}
                      className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${stageDotClass(s)}`} />
                  <Input
                    defaultValue={s.name}
                    onBlur={(e) => {
                      if (e.target.value.trim() && e.target.value !== s.name) {
                        patchStage(s.id, { name: e.target.value.trim() });
                      }
                    }}
                    className="flex-1 min-w-40"
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={s.isWon} onCheckedChange={(v) => patchStage(s.id, { isWon: v })} />
                    Won
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={s.isLost} onCheckedChange={(v) => patchStage(s.id, { isLost: v })} />
                    Lost
                  </label>
                  <Button variant="ghost" size="sm" onClick={() => deleteStage(s)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={addStage} className="flex items-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex-1">
              <Label>New stage</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Stage name" />
            </div>
            <Button type="submit" disabled={adding}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span className="ml-1">Add</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      <ConfirmDialog />
    </div>
  );
}
