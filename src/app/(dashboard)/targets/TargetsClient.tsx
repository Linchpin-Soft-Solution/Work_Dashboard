"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/use-confirm";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClockIcon, EditIcon, PlusIcon, TrashIcon, Loader2, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <Badge variant={variantMap[status]} className="text-xs font-medium">
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
  const { confirm, ConfirmDialog } = useConfirm();

  // Navigation / View state
  const [viewMode, setViewMode] = useState<"kanban" | "list">(isAdmin ? "list" : "kanban");

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
    
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.targets) {
        setTargets(data.targets);
      }
    } catch (err) {
      toast.error("Failed to load targets.");
    } finally {
      setLoading(false);
    }
  }, [filterUser, filterStatus]);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  const openNewModal = () => {
    setEditingTarget(null);
    setFormData({
      assignedToId: isAdmin ? (users.length > 0 ? users[0].id : "") : session.user.id,
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

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormErr(data.error || "Failed to save target.");
      } else {
        toast.success(editingTarget ? "Target updated successfully" : "Target created successfully");
        setIsModalOpen(false);
        fetchTargets();
      }
    } catch (err) {
      setFormErr("A network error occurred.");
    } finally {
      setFormSaving(false);
    }
  };

  const deleteTarget = async (id: string) => {
    const ok = await confirm("Delete Target", "Are you sure you want to delete this target?");
    if (!ok) return;
    
    const res = await fetch(`/api/targets/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Target deleted successfully.");
      fetchTargets();
    } else {
      toast.error("Failed to delete target.");
    }
  };

  const employeeUpdateStatus = async (id: string, newStatus: TargetStatus) => {
    const res = await fetch(`/api/targets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      toast.success("Status updated successfully.");
      fetchTargets();
    } else {
      toast.error("Failed to update status.");
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
      toast.error("Failed to update status.");
    } else {
      toast.success("Status updated.");
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
            className="bg-muted/40 rounded-xl border border-muted/80 p-4 min-h-[500px] min-w-[280px]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, col.defaultStatus)}
          >
            <h3 className="font-semibold text-foreground mb-4 px-1">{col.title}</h3>
            <div className="space-y-4">
              {targets.filter(t => col.statuses.includes(t.status)).map(t => {
                const isOverdue = t.status === "OVERDUE" || (t.status !== "COMPLETED" && t.dueDate && new Date(t.dueDate).setHours(23, 59, 59, 999) < new Date().getTime());
                const displayStatus = isOverdue ? "OVERDUE" : t.status;
                const canEdit = isAdmin || t.assignedToId === session.user.id || t.assignedById === session.user.id;
                const canDelete = isAdmin || t.assignedById === session.user.id;

                return (
                  <Card 
                    key={t.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, t.id)}
                    className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200 ${isOverdue ? "border-destructive/40 shadow-sm shadow-destructive/5" : ""}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <PriorityBadge priority={t.priority} />
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mr-1.5">{t.timeframe}</span>
                          {canEdit && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 p-0 hover:bg-muted" 
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(t);
                              }}
                            >
                              <EditIcon className="h-3 w-3 text-muted-foreground hover:text-primary" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 p-0 hover:bg-muted text-destructive/80 hover:text-destructive" 
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTarget(t.id);
                              }}
                            >
                              <TrashIcon className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
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
                             <StatusBadge status={displayStatus} />
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
      <CardHeader className="p-4 border-b border-border">
        <CardTitle className="text-lg">Targets List</CardTitle>
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
                  <TableHead>Assigned By</TableHead>
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
                  const canEdit = isAdmin || t.assignedToId === session.user.id || t.assignedById === session.user.id;
                  const canDelete = isAdmin || t.assignedById === session.user.id;

                  return (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="font-medium">{t.title}</div>
                        <div className="text-xs text-muted-foreground">{t.timeframe}</div>
                      </TableCell>
                      <TableCell>
                        {t.assignedToId === session.user.id ? (
                          <span className="font-medium text-primary">Me</span>
                        ) : (
                          t.User_Target_assignedToIdToUser?.name || "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {t.assignedById === session.user.id ? "Me" : (t.User_Target_assignedByIdToUser?.name || "—")}
                      </TableCell>
                      <TableCell><PriorityBadge priority={t.priority} /></TableCell>
                      <TableCell>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</TableCell>
                      <TableCell><StatusBadge status={displayStatus} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canEdit && (
                            <Button variant="ghost" size="icon" onClick={() => openEditModal(t)}>
                              <EditIcon className="h-4 w-4 text-muted-foreground hover:text-primary" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon" onClick={() => deleteTarget(t.id)}>
                              <TrashIcon className="h-4 w-4 text-destructive/80 hover:text-destructive" />
                            </Button>
                          )}
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
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Targets</h1>
            <Button 
              size="sm" 
              onClick={openNewModal} 
              className="h-8 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 shadow-sm transition-all duration-200"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              <span>Create Target</span>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Assign and track team targets." : "Manage your daily, weekly, and monthly goals."}
          </p>
        </div>

        {/* View Switcher Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-muted/65 p-1 rounded-lg border border-border/80 shadow-inner">
            <Button
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="sm"
              className={`h-7 px-3 text-xs gap-1.5 rounded-md transition-all ${viewMode === "kanban" ? "shadow-sm bg-background text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setViewMode("kanban")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Kanban</span>
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className={`h-7 px-3 text-xs gap-1.5 rounded-md transition-all ${viewMode === "list" ? "shadow-sm bg-background text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setViewMode("list")}
            >
              <List className="h-3.5 w-3.5" />
              <span>List</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Shared Filter Bar */}
      {(isAdmin || viewMode === "list") && (
        <div className="flex flex-wrap gap-3 items-center justify-start bg-muted/30 p-3 rounded-lg border border-border/60">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">Filters:</span>
          {isAdmin && (
            <Select value={filterUser} onValueChange={(val) => { if (val) setFilterUser(val); }}>
              <SelectTrigger className="w-full sm:w-[200px] bg-background">
                <SelectValue placeholder="All Employees">
                  {filterUser === "all" ? "All Users" : (filterUser === session.user.id ? "Me (Admin)" : users.find(u => u.id === filterUser)?.name)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.id === session.user.id ? `${u.name} (Me)` : u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {viewMode === "list" && (
            <Select value={filterStatus} onValueChange={(val) => { if (val) setFilterStatus(val); }}>
              <SelectTrigger className="w-full sm:w-[180px] bg-background">
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
          )}
        </div>
      )}

      {/* Targets Main Panels */}
      {viewMode === "kanban" ? renderKanban() : renderTable()}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingTarget 
                ? (isAdmin || editingTarget.assignedById === session.user.id ? "Edit Target" : "Update Target Status")
                : "Create New Target"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
              <Input
                id="title"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="E.g. Complete Q3 Report"
                disabled={editingTarget !== null && !isAdmin && editingTarget.assignedById !== session.user.id}
              />
            </div>

            {isAdmin && (
              <div className="grid gap-2">
                <Label>Assign To <span className="text-destructive">*</span></Label>
                <Select value={formData.assignedToId} onValueChange={val => { if (val) setFormData({ ...formData, assignedToId: val }); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select User">
                      {formData.assignedToId === session.user.id ? `${session.user.name} (Me)` : (users.find(u => u.id === formData.assignedToId)?.name || "Select User")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.id === session.user.id ? `${u.name} (Me)` : u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={val => { if (val) setFormData({ ...formData, priority: val as TargetPriority }); }}
                  disabled={editingTarget !== null && !isAdmin && editingTarget.assignedById !== session.user.id}
                >
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
                <Select 
                  value={formData.timeframe} 
                  onValueChange={val => { if (val) setFormData({ ...formData, timeframe: val as TargetTimeframe }); }}
                  disabled={editingTarget !== null && !isAdmin && editingTarget.assignedById !== session.user.id}
                >
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
                  disabled={editingTarget !== null && !isAdmin && editingTarget.assignedById !== session.user.id}
                />
              </div>
              
              {editingTarget && (
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={val => { if (val) setFormData({ ...formData, status: val as TargetStatus }); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      {(isAdmin || editingTarget.assignedById === session.user.id) && (
                        <SelectItem value="OVERDUE">Overdue</SelectItem>
                      )}
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
                disabled={editingTarget !== null && !isAdmin && editingTarget.assignedById !== session.user.id}
              />
            </div>

            {formErr && (
              <div className="bg-destructive/10 text-destructive px-3 py-2 rounded-lg text-sm font-medium border border-destructive/20 animate-bounce">
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
      <ConfirmDialog />
    </div>
  );
}
