"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Target, FileText, CalendarCheck, AlertCircle, CheckCircle2, Calendar, Clock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";

type DashboardStats = {
  role: "ADMIN" | "EMPLOYEE" | "INTERN";
  userName: string;
  adminStats?: {
    totalUsers: number;
    presentToday: number;
    lateToday: number;
    absentToday: number;
    openTargets: number;
    openInvoices: number;
  };
  employeeStats?: {
    attendanceToday: "PRESENT" | "LATE" | "ABSENT" | "HOLIDAY" | null;
    openTargets: number;
    logSubmittedToday: boolean;
  };
  activeTargets: any[];
  upcomingEvents: any[];
};

export default function DashboardClient({ stats }: { stats: DashboardStats }) {
  const isAdmin = stats.role === "ADMIN";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Welcome back, {stats.userName}
        </h1>
        <p className="text-slate-500 mt-2">
          Here is a brief overview of your workspace today.
        </p>
      </div>

      {isAdmin && stats.adminStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Active Users</CardTitle>
              <Users className="w-4 h-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.adminStats.totalUsers}</div>
              <p className="text-xs text-slate-500 mt-1">Employees & Interns</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Today's Attendance</CardTitle>
              <CalendarCheck className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {stats.adminStats.presentToday} <span className="text-lg text-slate-400 font-medium">present</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {stats.adminStats.lateToday} late, {stats.adminStats.absentToday} absent
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Open Targets</CardTitle>
              <Target className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.adminStats.openTargets}</div>
              <p className="text-xs text-slate-500 mt-1">Pending or In Progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Open Invoices</CardTitle>
              <FileText className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.adminStats.openInvoices}</div>
              <p className="text-xs text-slate-500 mt-1">Draft or Sent</p>
            </CardContent>
          </Card>
        </div>
      )}

      {!isAdmin && stats.employeeStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Today's Attendance</CardTitle>
              <CalendarCheck className="w-4 h-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", 
                stats.employeeStats.attendanceToday === 'PRESENT' ? 'text-emerald-600' :
                stats.employeeStats.attendanceToday === 'LATE' ? 'text-amber-600' :
                stats.employeeStats.attendanceToday === 'ABSENT' ? 'text-red-600' :
                stats.employeeStats.attendanceToday === 'HOLIDAY' ? 'text-blue-600' : 'text-slate-600'
              )}>
                {stats.employeeStats.attendanceToday || "Not Checked In"}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Your current status for today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">My Open Targets</CardTitle>
              <Target className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.employeeStats.openTargets}</div>
              <p className="text-xs text-slate-500 mt-1">Targets needing your attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Daily Log</CardTitle>
              {stats.employeeStats.logSubmittedToday ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", stats.employeeStats.logSubmittedToday ? "text-emerald-600" : "text-amber-600")}>
                {stats.employeeStats.logSubmittedToday ? "Submitted" : "Pending"}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {stats.employeeStats.logSubmittedToday ? "Great job!" : "Don't forget to log your work today"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 mt-8">
        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Active Targets</CardTitle>
              <CardDescription>Your current pending and in-progress targets.</CardDescription>
            </div>
            <Link href="/targets" className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
              View all <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {stats.activeTargets && stats.activeTargets.length > 0 ? (
              <div className="space-y-4">
                {stats.activeTargets.map((target) => (
                  <div key={target.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{target.title}</p>
                      <div className="flex items-center text-xs text-slate-500 space-x-2">
                        <span className={cn("px-2 py-0.5 rounded-full",
                          target.priority === 'HIGH' ? 'bg-red-100 text-red-700' :
                          target.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                          'bg-emerald-100 text-emerald-700'
                        )}>
                          {target.priority}
                        </span>
                        {isAdmin && target.User_Target_assignedToIdToUser?.name && (
                          <span>Assigned to: {target.User_Target_assignedToIdToUser.name}</span>
                        )}
                      </div>
                    </div>
                    {target.dueDate && (
                      <div className="text-xs text-slate-500 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {format(new Date(target.dueDate), "MMM d")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500 py-4 text-center">
                No active targets found.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming Events</CardTitle>
              <CardDescription>Your upcoming calendar schedule.</CardDescription>
            </div>
            <Link href="/calendar" className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
              View all <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {stats.upcomingEvents && stats.upcomingEvents.length > 0 ? (
              <div className="space-y-4">
                {stats.upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-center space-x-4 border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex flex-col items-center justify-center bg-blue-50 text-blue-700 rounded-lg p-2 min-w-[50px]">
                      <span className="text-xs font-semibold">{format(new Date(event.startTime), "MMM")}</span>
                      <span className="text-lg font-bold">{format(new Date(event.startTime), "d")}</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none flex items-center">
                        {event.title}
                        {event.isCompanyWide && (
                          <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            Company
                          </span>
                        )}
                      </p>
                      <div className="text-xs text-slate-500 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {format(new Date(event.startTime), "h:mm a")} - {format(new Date(event.endTime), "h:mm a")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500 py-4 text-center">
                No upcoming events found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
