"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClockIcon, EditIcon, PlusIcon, TrashIcon, Loader2 } from "lucide-react";

// --- Types ---
type TargetPriority = "HIGH" | "MEDIUM" | "LOW";
type TargetTimeframe = "DAILY" | "WEEKLY" | "MONTHLY";
type TargetStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";

interface Target {
  id: string;
  assignedById: string;
  assignedToId: string;
  title: string;
  description: string | null;
  priority: TargetPriority;
  timeframe: TargetTimeframe;
  dueDate: string | null;
  status: TargetStatus;
  User_Target_assignedToIdToUser: { id: string; name: string; designation: string | null };
  User_Target_assignedByIdToUser: { id: string; name: string };
}

function PriorityBadge({ priority }: { priority: TargetPriority }) {
  const variant = priority === "HIGH" ? "destructive" : priority === "MEDIUM" ? "default" : "secondary";
  return (
    <Badge variant={variant} className="text-[10px] tracking-wider uppercase">
      {priority}
    </Badge>
  );
}

function StatusBadge({ status }: { status: TargetStatus }) {
  const variantMap: Record<TargetStatus, "default" | "secondary" | "destructive" | "outline"> = {
    PENDING: "secondary",
    IN_PROGRESS: "default",
    COMPLETED: "outline",
    OVERDUE: "destructive",
  };
  const label = status.replace("_", " ");
  return (
    <Badge variant={variantMap[status]} className="text-xs">
      {label}
    </Badge>
  );
}

export default function TargetsClient({
  session,
  users,
}: {
  session: any;
  users: { id: string; name: string; designation: string | null }[];
}) {
  const isAdmin = session.user.role === "ADMIN";
  
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterUser, setFilterUser] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<Target | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    assignedToId: "",
    title: "",
    description: "",
    priority: "MEDIUM" as TargetPriority,
    timeframe: "DAILY" as TargetTimeframe,
    dueDate: "",
    status: "PENDING" as TargetStatus,
  });
  const [formSaving, setFormSaving] = useState(false);
  const [formErr, setFormErr] = useState("");

  const fetchTargets = useCallback(async () => {
    setLoading(true);
    let url = "/api/targets?";
    if (filterUser && filterUser !== "all") url += `&assignedToId=${filterUser}`;
    if (filterStatus && filterStatus !== "all") url += `&status=${filterStatus}`;
    
    const res = await fetch(url);
    const data = await res.json();
    setLoading(false);
    if (data.targets) {
      setTargets(data.targets);
    }
  }, [filterUser, filterStatus]);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  const openNewModal = () => {
    setEditingTarget(null);
    setFormData({
      assignedToId: users.length > 0 ? users[0].id : "",
      title: "",
      description: "",
      priority: "MEDIUM",
      timeframe: "DAILY",
      dueDate: "",
      status: "PENDING",
    });
    setFormErr("");
    setIsModalOpen(true);
  };

  const openEditModal = (t: Target) => {
    setEditingTarget(t);
    setFormData({
      assignedToId: t.assignedToId,
      title: t.title,
      description: t.description || "",
      priority: t.priority,
      timeframe: t.timeframe,
      dueDate: t.dueDate ? t.dueDate.slice(0, 10) : "",
      status: t.status,
    });
    setFormErr("");
    setIsModalOpen(true);
  };

  const saveTarget = async () => {
    if (!formData.title.trim()) {
      setFormErr("Title is required.");
      return;
    }
    if (isAdmin && !formData.assignedToId) {
      setFormErr("Assignee is required.");
      return;
    }

    setFormSaving(true);
    setFormErr("");

    const method = editingTarget ? "PATCH" : "POST";
    const url = editingTarget ? `/api/targets/${editingTarget.id}` : "/api/targets";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const data = await res.json();
    setFormSaving(false);

    if (!res.ok) {
      setFormErr(data.error || "Failed to save target.");
    } else {
      setIsModalOpen(false);
      fetchTargets();
    }
  };

  const deleteTarget = async (id: string) => {
    if (!confirm("Are you sure you want to delete this target?")) return;
    
    const res = await fetch(`/api/targets/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchTargets();
    } else {
      alert("Failed to delete target.");
    }
  };

  const employeeUpdateStatus = async (id: string, newStatus: TargetStatus) => {
    const res = await fetch(`/api/targets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      fetchTargets();
    }
  };

  const handleDragStart = (e: React.DragEvent, targetId: string) => {
    e.dataTransfer.setData("targetId", targetId);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: TargetStatus) => {
    e.preventDefault();
    const targetId = e.dataTransfer.getData("targetId");
    if (!targetId) return;

    const prevTargets = [...targets];
    setTargets(prev => prev.map(t => t.id === targetId ? { ...t, status: newStatus } : t));

    const res = await fetch(`/api/targets/${targetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    
    if (!res.ok) {
      setTargets(prevTargets);
      alert("Failed to update status.");
    } else {
      fetchTargets();
    }
  };

  const renderKanban = () => {
    const columns: { title: string; statuses: TargetStatus[]; defaultStatus: TargetStatus }[] = [
      { title: "To Do", statuses: ["PENDING"], defaultStatus: "PENDING" },
      { title: "In Progress", statuses: ["IN_PROGRESS"], defaultStatus: "IN_PROGRESS" },
      { title: "Completed / Overdue", statuses: ["COMPLETED", "OVERDUE"], defaultStatus: "COMPLETED" },
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 overflow-x-auto pb-4">
        {columns.map(col => (
          <div 
            key={col.defaultStatus} 
            className="bg-muted/40 rounded-xl border border-muted p-4 min-h-[500px] min-w-[280px]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, col.defaultStatus)}
          >
            <h3 className="font-semibold text-foreground mb-4 px-1">{col.title}</h3>
            <div className="space-y-4">
              {targets.filter(t => col.statuses.includes(t.status)).map(t => {
                const isOverdue = t.status === "OVERDUE" || (t.status !== "COMPLETED" && t.dueDate && new Date(t.dueDate).setHours(23, 59, 59, 999) < new Date().getTime());
                return (
                  <Card 
                    key={t.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, t.id)}
                    className={`cursor-grab active:cursor-grabbing mb-4 ${isOverdue ? "border-destructive/50" : ""}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <PriorityBadge priority={t.priority} />
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{t.timeframe}</span>
                      </div>
                      <h4 className="font-semibold text-foreground leading-tight mb-1">{t.title}</h4>
                      {t.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{t.description}</p>}
                      
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center text-xs text-muted-foreground">
                          <ClockIcon className="h-3.5 w-3.5 mr-1" />
                          <span>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "No Date"}</span>
                        </div>
                        <div className="flex gap-1">
                          {t.status === "PENDING" && (
                            <Button size="sm" variant="secondary" onClick={() => employeeUpdateStatus(t.id, "IN_PROGRESS")}>
                              Start
                            </Button>
                          )}
                          {t.status === "IN_PROGRESS" && (
                            <Button size="sm" onClick={() => employeeUpdateStatus(t.id, "COMPLETED")}>
                              Complete
                            </Button>
                          )}
                          {(t.status === "COMPLETED" || t.status === "OVERDUE") && (
                             <StatusBadge status={t.status} />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {targets.filter(t => col.statuses.includes(t.status)).length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground italic">No targets here</div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTable = () => (
    <Card className="shadow-sm">
      <CardHeader className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <CardTitle className="text-lg">All Targets</CardTitle>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Select value={filterUser} onValueChange={setFilterUser}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="OVERDUE">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading targets...</span>
          </div>
        ) : targets.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No targets found.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {targets.map(t => {
                  const isOverdue = t.status === "OVERDUE" || (t.status !== "COMPLETED" && t.dueDate && new Date(t.dueDate).setHours(23, 59, 59, 999) < new Date().getTime());
                  const displayStatus = isOverdue ? "OVERDUE" : t.status;
                  return (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="font-medium">{t.title}</div>
                      <div className="text-xs text-muted-foreground">{t.timeframe}</div>
                    </TableCell>
                    <TableCell>{t.User_Target_assignedToIdToUser.name}</TableCell>
                    <TableCell><PriorityBadge priority={t.priority} /></TableCell>
                    <TableCell>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</TableCell>
                    <TableCell><StatusBadge status={displayStatus} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditModal(t)}>
                          <EditIcon className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteTarget(t.id)}>
                          <TrashIcon className="h-4 w-4 text-destructive/80 hover:text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Targets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin ? "Assign and track team targets." : "Manage your daily, weekly, and monthly goals."}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openNewModal} className="w-full sm:w-auto">
            <PlusIcon className="h-4 w-4 mr-2" /> Assign Target
          </Button>
        )}
      </div>

      {isAdmin ? renderTable() : renderKanban()}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingTarget ? "Edit Target" : "Assign New Target"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
              <Input
                id="title"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="E.g. Complete Q3 Report"
              />
            </div>

            {isAdmin && (
              <div className="grid gap-2">
                <Label>Assign To <span className="text-destructive">*</span></Label>
                <Select value={formData.assignedToId} onValueChange={val => setFormData({ ...formData, assignedToId: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select value={formData.priority} onValueChange={val => setFormData({ ...formData, priority: val as TargetPriority })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Timeframe</Label>
                <Select value={formData.timeframe} onValueChange={val => setFormData({ ...formData, timeframe: val as TargetTimeframe })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
              {editingTarget && isAdmin && (
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={val => setFormData({ ...formData, status: val as TargetStatus })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="OVERDUE">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional details..."
                className="resize-y"
              />
            </div>

            {formErr && (
              <div className="bg-destructive/10 text-destructive px-3 py-2 rounded-lg text-sm font-medium border border-destructive/20">
                {formErr}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={saveTarget} disabled={formSaving}>
              {formSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {formSaving ? "Saving..." : "Save Target"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
