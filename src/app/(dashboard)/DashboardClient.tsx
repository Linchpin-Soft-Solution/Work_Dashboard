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
    pendingLeaves?: any[];
  };
  employeeStats?: {
    attendanceToday: "PRESENT" | "LATE" | "ABSENT" | "HOLIDAY" | null;
    openTargets: number;
    logSubmittedToday: boolean;
    myRecentLeaves?: any[];
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
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">
                {stats.adminStats.presentToday} <span className="text-lg text-slate-400 dark:text-slate-500 font-medium">present</span>
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
                stats.employeeStats.attendanceToday === 'PRESENT' ? 'text-emerald-600 dark:text-emerald-500' :
                stats.employeeStats.attendanceToday === 'LATE' ? 'text-amber-600 dark:text-amber-500' :
                stats.employeeStats.attendanceToday === 'ABSENT' ? 'text-red-600 dark:text-red-500' :
                stats.employeeStats.attendanceToday === 'HOLIDAY' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'
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
              <div className={cn("text-2xl font-bold", stats.employeeStats.logSubmittedToday ? "text-emerald-600 dark:text-emerald-500" : "text-amber-600 dark:text-amber-500")}>
                {stats.employeeStats.logSubmittedToday ? "Submitted" : "Pending"}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {stats.employeeStats.logSubmittedToday ? "Great job!" : "Don't forget to log your work today"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-8">
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
                          target.priority === 'HIGH' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                          target.priority === 'MEDIUM' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                          'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
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
                  <div key={event.id} className="flex items-center space-x-4 border-b dark:border-gray-800 pb-3 last:border-0 last:pb-0">
                    <div className="flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg p-2 min-w-[50px]">
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

        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{isAdmin ? "Pending Leaves" : "My Leaves"}</CardTitle>
              <CardDescription>
                {isAdmin ? "Requests awaiting your approval." : "Status of your recent leave requests."}
              </CardDescription>
            </div>
            <Link href="/leaves" className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
              View all <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {isAdmin && stats.adminStats?.pendingLeaves && stats.adminStats.pendingLeaves.length > 0 ? (
              <div className="space-y-4">
                {stats.adminStats.pendingLeaves.map((leave) => (
                  <div key={leave.id} className="flex items-center justify-between border-b dark:border-gray-800 pb-3 last:border-0 last:pb-0">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold leading-none">{leave.User.name}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {leave.type} · {format(new Date(leave.startDate), "MMM d")} - {format(new Date(leave.endDate), "MMM d")}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            ) : !isAdmin && stats.employeeStats?.myRecentLeaves && stats.employeeStats.myRecentLeaves.length > 0 ? (
              <div className="space-y-4">
                {stats.employeeStats.myRecentLeaves.map((leave) => (
                  <div key={leave.id} className="flex items-center justify-between border-b dark:border-gray-800 pb-3 last:border-0 last:pb-0">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold leading-none">{leave.type}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {format(new Date(leave.startDate), "MMM d")} - {format(new Date(leave.endDate), "MMM d")}
                      </p>
                    </div>
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                      leave.status === "PENDING" ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200" :
                      leave.status === "APPROVED" ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200" :
                      "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-200"
                    )}>
                      {leave.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500 py-4 text-center">
                {isAdmin ? "All caught up! No pending requests." : "No leave requests logged."}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
