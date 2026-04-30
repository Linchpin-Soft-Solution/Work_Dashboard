"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuditLog {
  id: string;
  adminId: string;
  actionType: string;
  affectedUserId: string | null;
  details: string;
  reason: string;
  createdAt: Date;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface Props {
  initialLogs: AuditLog[];
  users: User[];
}

export default function AuditClient({ initialLogs, users }: Props) {
  const [logs] = useState<AuditLog[]>(initialLogs);
  
  // Filters
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [employeeFilter, setEmployeeFilter] = useState<string>("ALL");

  const userMap = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach(u => { map[u.id] = u.name; });
    return map;
  }, [users]);

  const uniqueActions = useMemo(() => {
    const actions = new Set<string>();
    logs.forEach(l => actions.add(l.actionType));
    return Array.from(actions).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Search filter (reason or details)
      const matchesSearch = search === "" || 
        log.reason.toLowerCase().includes(search.toLowerCase()) || 
        log.details.toLowerCase().includes(search.toLowerCase());
      
      // Action filter
      const matchesAction = actionFilter === "ALL" || log.actionType === actionFilter;
      
      // Employee filter (either admin or affected user)
      const matchesEmployee = employeeFilter === "ALL" || 
        log.adminId === employeeFilter || 
        log.affectedUserId === employeeFilter;

      return matchesSearch && matchesAction && matchesEmployee;
    });
  }, [logs, search, actionFilter, employeeFilter]);

  const formatActionType = (action: string) => {
    return action.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-sm text-muted-foreground mt-1">Immutable record of all administrative actions and overrides.</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by reason or details..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Select value={actionFilter} onValueChange={(val) => { if (val) setActionFilter(val); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Action Type">
                  {actionFilter === "ALL" ? "All Actions" : formatActionType(actionFilter)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Actions</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>{formatActionType(action)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={employeeFilter} onValueChange={(val) => { if (val) setEmployeeFilter(val); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Employee">
                  {employeeFilter === "ALL" ? "All Employees" : users.find(u => u.id === employeeFilter)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Employees</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[160px]">Timestamp</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Affected User</TableHead>
                <TableHead className="max-w-[200px]">Details</TableHead>
                <TableHead className="max-w-[200px]">Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No audit logs found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/30">
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {format(new Date(log.createdAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {userMap[log.adminId] || "Unknown Admin"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal bg-indigo-50/50 text-indigo-700 border-indigo-200">
                        {formatActionType(log.actionType)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.affectedUserId ? (
                        <span className="text-sm">{userMap[log.affectedUserId] || "Unknown"}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">- System -</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate" title={log.details}>
                      {log.details}
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate" title={log.reason}>
                      {log.reason}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
