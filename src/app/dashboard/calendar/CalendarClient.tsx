"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/use-confirm";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, PlusIcon, Loader2, Pencil, Trash2, Globe, Lock, CalendarIcon, Target } from "lucide-react";

interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  isPrivate: boolean;
  isCompanyWide: boolean;
  User: { id: string; name: string };
  isTarget?: boolean;
  targetPriority?: string;
  targetStatus?: string;
}

interface Props {
  session: any;
  users: { id: string; name: string }[];
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function CalendarClient({ session, users }: Props) {
  const isAdmin = session.user.role === "ADMIN";
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("mine");
  const { confirm, ConfirmDialog } = useConfirm();

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Detail panel
  const [detailDate, setDetailDate] = useState<string | null>(null);

  // Form
  const [form, setForm] = useState({ title: "", description: "", startTime: "", endTime: "", isPrivate: true, isCompanyWide: false });
  const [formSaving, setFormSaving] = useState(false);
  const [formErr, setFormErr] = useState("");

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const start = new Date(currentYear, currentMonth, 1).toISOString();
    const end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();
    let url = `/api/calendar?start=${start}&end=${end}`;
    if (isAdmin && selectedUserId !== "mine") url += `&userId=${selectedUserId}`;
    const res = await fetch(url);
    const data = await res.json();
    setEvents(data.events || []);
    setLoading(false);
  }, [currentMonth, currentYear, selectedUserId, isAdmin]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
    setDetailDate(null);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
    setDetailDate(null);
  };
  const goToday = () => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()); setDetailDate(null); };

  const openNewEvent = (dateStr: string) => {
    setEditingEvent(null);
    setSelectedDate(dateStr);
    const defaultStart = `${dateStr}T09:00`;
    const defaultEnd = `${dateStr}T10:00`;
    setForm({ title: "", description: "", startTime: defaultStart, endTime: defaultEnd, isPrivate: true, isCompanyWide: false });
    setFormErr("");
    setModalOpen(true);
  };

  const openEditEvent = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    const st = new Date(ev.startTime);
    const en = new Date(ev.endTime);
    const toLocal = (d: Date) => {
      const pad = (n: number) => n.toString().padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setForm({ title: ev.title, description: ev.description || "", startTime: toLocal(st), endTime: toLocal(en), isPrivate: ev.isPrivate, isCompanyWide: ev.isCompanyWide });
    setFormErr("");
    setModalOpen(true);
  };

  const canEditEvent = (ev: CalendarEvent) => {
    if (ev.isTarget) return false;
    if (ev.userId === session.user.id) return true;
    if (isAdmin && !ev.isPrivate) return true;
    return false;
  };

  const saveEvent = async () => {
    if (!form.title.trim()) { setFormErr("Title is required."); return; }
    if (!form.startTime || !form.endTime) { setFormErr("Start and end time are required."); return; }
    if (new Date(form.endTime) <= new Date(form.startTime)) { setFormErr("End time must be after start time."); return; }

    setFormSaving(true); setFormErr("");
    const method = editingEvent ? "PATCH" : "POST";
    const url = editingEvent ? `/api/calendar/${editingEvent.id}` : "/api/calendar";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    setFormSaving(false);
    if (!res.ok) { setFormErr(data.error || "Failed to save event."); }
    else { setModalOpen(false); fetchEvents(); }
  };

  const deleteEvent = async (id: string) => {
    const ok = await confirm("Delete Event", "Are you sure you want to delete this event?");
    if (!ok) return;
    const res = await fetch(`/api/calendar/${id}`, { method: "DELETE" });
    if (res.ok) fetchEvents();
    else toast.error("Failed to delete event.");
  };

  // Build calendar grid
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfWeek(currentYear, currentMonth);
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const getDateStr = (day: number) => {
    const m = (currentMonth + 1).toString().padStart(2, "0");
    const d = day.toString().padStart(2, "0");
    return `${currentYear}-${m}-${d}`;
  };

  const getEventsForDay = (day: number) => {
    const dateStr = getDateStr(day);
    return events.filter(ev => {
      const evDate = new Date(ev.startTime);
      const evStr = `${evDate.getFullYear()}-${(evDate.getMonth()+1).toString().padStart(2,"0")}-${evDate.getDate().toString().padStart(2,"0")}`;
      return evStr === dateStr;
    });
  };

  const isToday = (day: number) => today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear;

  const detailEvents = detailDate ? events.filter(ev => {
    const evDate = new Date(ev.startTime);
    const evStr = `${evDate.getFullYear()}-${(evDate.getMonth()+1).toString().padStart(2,"0")}-${evDate.getDate().toString().padStart(2,"0")}`;
    return evStr === detailDate;
  }) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin ? "View team schedules and manage company events." : "Manage your personal schedule."}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {isAdmin && (
            <Select value={selectedUserId} onValueChange={(val) => setSelectedUserId(val || "mine")}>
              <SelectTrigger className="w-[200px]">
                {selectedUserId === "mine"
                  ? "My Calendar"
                  : users.find(u => u.id === selectedUserId)?.name || "Select Employee"}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mine">My Calendar</SelectItem>
                {users.filter(u => u.id !== session.user.id).map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={() => openNewEvent(getDateStr(today.getDate()))} className="w-full sm:w-auto">
            <PlusIcon className="h-4 w-4 mr-2" /> New Event
          </Button>
        </div>
      </div>

      {/* Month Navigation */}
      <Card className="shadow-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={goToday} className="ml-1 text-xs">Today</Button>
          </div>
          <h2 className="text-lg font-semibold text-foreground">{MONTH_NAMES[currentMonth]} {currentYear}</h2>
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 flex justify-center items-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading events…</span>
            </div>
          ) : (
            <>
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-border">
                {DAY_LABELS.map(d => (
                  <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {Array.from({ length: totalCells }).map((_, i) => {
                  const day = i - firstDay + 1;
                  const isValid = day >= 1 && day <= daysInMonth;
                  const dayEvents = isValid ? getEventsForDay(day) : [];
                  const dateStr = isValid ? getDateStr(day) : "";
                  const isSelected = dateStr === detailDate;

                  return (
                    <div
                      key={i}
                      className={`min-h-[90px] sm:min-h-[110px] border-b border-r border-border p-1.5 sm:p-2 cursor-pointer transition-colors ${
                        isValid ? "hover:bg-accent/30" : "bg-muted/20"
                      } ${isSelected ? "bg-accent/50 ring-2 ring-primary/30 ring-inset" : ""}`}
                      onClick={() => isValid && setDetailDate(isSelected ? null : dateStr)}
                      onDoubleClick={() => isValid && openNewEvent(dateStr)}
                    >
                      {isValid && (
                        <>
                          <div className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${
                            isToday(day) ? "bg-primary text-primary-foreground" : "text-foreground"
                          }`}>
                            {day}
                          </div>
                          <div className="space-y-0.5 overflow-hidden">
                            {dayEvents.slice(0, 3).map(ev => (
                              <div
                                key={ev.id}
                                className={`text-[10px] sm:text-xs leading-tight truncate rounded px-1 py-0.5 ${
                                  ev.isTarget
                                    ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                                    : ev.isCompanyWide
                                    ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                                    : ev.isPrivate
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                    : "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
                                }`}
                                title={ev.title}
                              >
                                {ev.title}
                              </div>
                            ))}
                            {dayEvents.length > 3 && (
                              <div className="text-[10px] text-muted-foreground pl-1">+{dayEvents.length - 3} more</div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Panel */}
      {detailDate && (
        <Card className="shadow-sm animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">
                {new Date(detailDate + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </h3>
            </div>
            <Button size="sm" variant="outline" onClick={() => openNewEvent(detailDate)}>
              <PlusIcon className="h-3.5 w-3.5 mr-1.5" /> Add
            </Button>
          </div>
          <CardContent className="p-4 sm:p-6">
            {detailEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6 italic">No events on this day. Double-click a date or press "Add" to create one.</p>
            ) : (
              <div className="space-y-3">
                {detailEvents.map(ev => (
                  <div key={ev.id} className={`flex items-start justify-between gap-4 p-3 rounded-lg border ${
                    ev.isTarget ? "border-rose-200 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/20"
                    : ev.isCompanyWide ? "border-violet-200 bg-violet-50/50 dark:border-violet-800 dark:bg-violet-950/20"
                    : ev.isPrivate ? "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
                    : "border-sky-200 bg-sky-50/50 dark:border-sky-800 dark:bg-sky-950/20"
                  }`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-foreground">{ev.title}</span>
                        {ev.isTarget && <Badge variant="secondary" className="text-[10px] gap-1 bg-rose-100 text-rose-700 hover:bg-rose-100 border-rose-200"><Target className="h-3 w-3" />Target Due</Badge>}
                        {ev.isCompanyWide && <Badge variant="secondary" className="text-[10px] gap-1"><Globe className="h-3 w-3" />Company</Badge>}
                        {ev.isPrivate && <Badge variant="outline" className="text-[10px] gap-1"><Lock className="h-3 w-3" />Private</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{formatTime(ev.startTime)} — {formatTime(ev.endTime)}</p>
                      {ev.description && <p className="text-sm text-muted-foreground mt-1.5">{ev.description}</p>}
                      {isAdmin && ev.userId !== session.user.id && (
                        <p className="text-[10px] text-muted-foreground mt-1">Created by {ev.User.name}</p>
                      )}
                    </div>
                    {canEditEvent(ev) && (
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditEvent(ev)}>
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteEvent(ev.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive/70" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground px-1">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-200 dark:bg-rose-800 inline-block" /> Target Due</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-violet-200 dark:bg-violet-800 inline-block" /> Company-wide</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-sky-200 dark:bg-sky-800 inline-block" /> Shared</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-200 dark:bg-amber-800 inline-block" /> Private</div>
      </div>

      {/* Event Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[480px] overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "New Event"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="ev-title">Title <span className="text-destructive">*</span></Label>
              <Input id="ev-title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Team standup, Client call…" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="ev-start">Start <span className="text-destructive">*</span></Label>
                <Input id="ev-start" type="datetime-local" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ev-end">End <span className="text-destructive">*</span></Label>
                <Input id="ev-end" type="datetime-local" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ev-desc">Description</Label>
              <Textarea id="ev-desc" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional details…" className="resize-y" />
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Checkbox id="ev-private" checked={form.isPrivate && !form.isCompanyWide} disabled={form.isCompanyWide}
                  onCheckedChange={(checked) => setForm({ ...form, isPrivate: !!checked })} />
                <Label htmlFor="ev-private" className="text-sm font-normal cursor-pointer">Private (only visible to me)</Label>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <Checkbox id="ev-company" checked={form.isCompanyWide}
                    onCheckedChange={(checked) => setForm({ ...form, isCompanyWide: !!checked, isPrivate: checked ? false : form.isPrivate })} />
                  <Label htmlFor="ev-company" className="text-sm font-normal cursor-pointer">Company-wide (visible to everyone)</Label>
                </div>
              )}
            </div>
            {formErr && (
              <div className="bg-destructive/10 text-destructive px-3 py-2 rounded-lg text-sm font-medium border border-destructive/20">{formErr}</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={saveEvent} disabled={formSaving}>
              {formSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {formSaving ? "Saving…" : "Save Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog />
    </div>
  );
}
