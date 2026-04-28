# Linchpin — Product Requirements Document

**Product:** Linchpin Workspace Dashboard  
**URL:** dashboard.linchpinsoftsolution.com  
**Version:** 1.0  
**Status:** Pre-development  
**Last Updated:** April 2026

---

## 1. Overview

Linchpin is an internal company workspace dashboard built for Linchpin Soft Solution. Its primary purpose is to give management full visibility into daily team activity — who's in the office, what everyone is working on, whether targets are being met, and how pay should be calculated based on attendance and work submissions.

The dashboard will be accessible via web browser (desktop and mobile) and hosted on the cloud at `dashboard.linchpinsoftsolution.com`.

---

## 2. Users & Roles

| Role | Description |
|---|---|
| **Admin** | Full access to all modules. Can assign targets, view all logs, override records, generate reports, create invoices, and manage employees. |
| **Employee** | Access to their own logs, attendance, targets, calendar, and pay records. |
| **Intern** | Same access as Employee. Distinguished by role label only. |

**Team size:** 11–30 users.

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| Authentication | NextAuth.js v5 |
| Database | PostgreSQL via Neon (serverless) |
| ORM | Prisma |
| AI Summaries | OpenRouter API (model: `mistralai/mistral-7b-instruct:free`) |
| PDF Generation | @react-pdf/renderer |
| Email | Resend |
| Deployment | Vercel |

---

## 4. Authentication

- Email/password login with bcrypt hashing
- Google SSO (Sign in with Google)
- Protected routes: all `/dashboard/*` routes require an active session
- Unauthenticated users are redirected to `/login`
- Role (Admin/Employee/Intern) is embedded in the JWT session token
- The root `/` route is intentionally left empty for a separate landing page

---

## 5. Features

---

### 5.1 Attendance

**Goal:** Track daily office presence and tie it to pay.

**How it works:**
- Employees manually check in via the dashboard
- The server compares their IP address against the stored office public IP (`OFFICE_IP` env variable)
- If the IP does not match, check-in is blocked with a message: *"You must be connected to the office WiFi to check in"*
- Check-in time determines status:
  - Before 9:30 AM → **Present** (pay multiplier: 1.0)
  - After 9:30 AM → **Late** (pay multiplier: 0.5)
- Employees must also check out at end of day
- Full attendance credit requires the employee's daily log to be submitted

**Employee view:**
- Check-in / check-out button with current status
- Monthly attendance table: date, status badge, check-in time, pay multiplier
- Admin-overridden records show an "Edited by Admin" badge with the override reason

**Admin view:**
- Table of all employees' attendance for any given date
- Filters by date
- Ability to mark a date as a company holiday (applies to all users)

**Admin Overrides:**
- Manually mark any employee as Present / Late / Absent for any date (bypasses IP check)
- Override pay multiplier on any record (e.g. revert 0.5 → 1.0 for offsite work)
- Set check-in and check-out times retroactively
- Toggle `dailyLogSubmitted` flag manually
- All overrides require a mandatory written reason and are attributed to the admin who made them

---

### 5.2 Daily Logs

**Goal:** Employees document what they worked on each day.

**How it works:**
- Each employee submits one log per day via a text area
- Submitting a log marks `dailyLogSubmitted = true` on that day's attendance record
- Logs are the raw data source for AI-generated weekly and monthly summaries

**Employee view:**
- **Daily tab:** Write and submit today's log; read past logs via date picker; warning banner if today's log is missing
- **Weekly tab:** Raw compiled daily entries + AI-generated summary side by side; "Generate Summary" button
- **Monthly tab:** Same structure as weekly
- Admin-submitted logs are clearly flagged with the admin's name and reason

**Admin view:**
- Select any employee and date
- View or edit that employee's log
- Submit a log on behalf of an employee (requires mandatory override reason)
- History of all admin-submitted logs with timestamps and reasons

**AI Summaries:**
- Generated via OpenRouter API using `mistralai/mistral-7b-instruct:free`
- Prompt instructs the model to produce a 3–5 sentence professional summary of the employee's work for the week/month
- Both the raw compiled entries and AI summary are stored and displayed

---

### 5.3 Target Assignment

**Goal:** Admins assign work targets to employees/interns with clear priority and deadlines.

**Target fields:**
- Title and description
- Assigned to (single employee or intern)
- Priority: **High / Medium / Low**
- Timeframe: **Daily / Weekly / Monthly**
- Due date
- Status: Pending → In Progress → Completed / Overdue

**Employee view:**
- Kanban or tabbed view grouped by status
- Each card shows: title, priority badge (red/yellow/green), timeframe, due date, assigned by
- Employee can update status (In Progress, Completed)
- Overdue targets (past due date, not completed) shown with a red outline

**Admin view:**
- "Assign New Target" dialog: select employee, fill details
- Full table of all targets with filters: by employee, priority, status, timeframe
- Admin can update any field or delete a target

---

### 5.4 Daily Reports

**Goal:** Admin receives a summarised end-of-day briefing on team activity.

**How it works:**
- A report is auto-generated every day at **7:00 PM IST** via a Vercel cron job
- Can also be triggered manually by admin at any time
- Report content: who was present/late/absent, summaries of submitted daily logs, targets completed that day
- AI (OpenRouter) generates a structured, readable summary from this compiled data
- Reports are stored in the database and optionally emailed to all admins via Resend

**Admin view:**
- "Generate Today's Report" button
- List of past reports sorted by date
- Full report rendered in readable prose format
- Toggle to enable/disable automatic email delivery

---

### 5.5 Calendar

**Goal:** Employees manage their own schedule; admins can plan across the whole team.

**How it works:**
- Each employee has their own calendar
- Events can be marked as private (only visible to the employee) or non-private (visible to admin)
- Admin can view any employee's non-private calendar via an employee selector
- Admin can create company-wide events visible to all

**Employee view:**
- Monthly calendar grid
- Click a date to add an event (title, time, description, private toggle)
- Click an existing event to edit or delete it

**Admin view:**
- Same calendar with an employee dropdown to overlay a specific person's schedule
- Can edit/delete any non-private event
- Can create company-wide events

---

### 5.6 Invoice & Quotation Maker

**Goal:** Admin creates professional invoices and quotations for clients, downloadable as PDF.

**Invoice fields:**
- Type: Invoice or Quotation
- Auto-generated invoice number
- Client name, address, GSTIN
- Line items: description, quantity, rate, amount
- GST rate selector: 0%, 5%, 12%, 18%, 28%
- Subtotal, GST amount, Total in INR (₹)
- Amount in words (e.g. "Rupees Forty-Five Thousand Only")
- Status: Draft / Sent / Paid

**PDF format:**
- Company header: name, address, GSTIN (from environment variables)
- Professional layout with line items table
- Footer with payment terms and thank you note
- Downloaded as PDF directly from the browser

**Admin view:**
- "New Invoice" and "New Quotation" buttons
- Dynamic line item rows (add/remove)
- Preview mode before downloading
- Table of all invoices: number, client, amount, status, date
- Status updatable inline

---

### 5.7 Pay Records

**Goal:** Track and calculate each employee's monthly pay based on attendance.

**Calculation formula:**
```
dailyRate = baseMonthlySalary / workingDaysInMonth
calculatedPay = Σ (dailyRate × payMultiplier) for each day
```

- Present day: multiplier 1.0
- Late day: multiplier 0.5
- Absent day: multiplier 0.0

**Admin adjustments:**
- Add manual adjustments (bonus, deduction, sick leave, other) with a reason
- Final pay = base calculation + all adjustments
- Adjustments are listed as line items on the pay record

**Admin view:**
- Select employee + month → calculate pay
- Breakdown: base salary, working days, present/late/absent counts, base calculated pay
- Adjustment panel: add/delete adjustments with type and reason
- Final pay shown prominently
- Table of all employees' current month pay
- Export as CSV

**Employee view:**
- Read-only monthly pay history
- Each month shows: days present/late/absent, base pay, adjustments (with reasons), final pay
- Note shown if any admin overrides affected their attendance that month

---

### 5.8 Admin Override Audit Log

**Goal:** Full accountability trail for all admin interventions.

- Every admin override across all modules is recorded
- Columns: timestamp, admin name, action type, affected employee, details, reason
- Filterable by date range, employee, and action type
- Read-only — cannot be edited or deleted

**Action types tracked:**
- Attendance manual mark
- Pay multiplier override
- Daily log submitted on behalf
- Check-out time set retroactively
- Pay adjustment added
- Calendar event edited/deleted
- Target status force-updated

---

### 5.9 User Management (Admin)

- View all employees and interns
- Edit: name, designation, base monthly salary, role
- Deactivate accounts (soft delete — user cannot log in but data is preserved)
- Invite new users by email: sends a Resend email with a registration link pre-filled with their email address

---

## 6. Database Models (Summary)

| Model | Key Fields |
|---|---|
| `User` | id, name, email, password, role, designation, baseMonthlySalary, isActive |
| `Attendance` | userId, date, checkInTime, checkOutTime, status, payMultiplier, dailyLogSubmitted, overrideReason, overriddenByAdminId |
| `DailyLog` | userId, date, content, submittedByAdminId, overrideReason |
| `WeeklyLog` | userId, weekStart, rawSummary, aiSummary |
| `MonthlyLog` | userId, month, rawSummary, aiSummary |
| `Target` | assignedById, assignedToId, title, priority, timeframe, dueDate, status |
| `CalendarEvent` | userId, title, startTime, endTime, isPrivate |
| `Invoice` | createdById, invoiceNumber, clientName, lineItems, gstRate, totalAmount, status, isQuotation |
| `PayRecord` | userId, month, baseSalary, workingDays, presentDays, lateDays, calculatedPay |
| `PayAdjustment` | payRecordId, amount, type, reason, createdByAdminId |
| `DailyReport` | date, content, generatedAt |

---

## 7. Environment Variables

```
DATABASE_URL
NEXTAUTH_SECRET
NEXTAUTH_URL=https://dashboard.linchpinsoftsolution.com
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
OPENROUTER_API_KEY
RESEND_API_KEY
OFFICE_IP
COMPANY_NAME
COMPANY_ADDRESS
COMPANY_GSTIN
```

---

## 8. Deployment

| Item | Detail |
|---|---|
| Platform | Vercel |
| Domain | dashboard.linchpinsoftsolution.com |
| DNS | CNAME: `dashboard` → `cname.vercel-dns.com` |
| Database | Neon (serverless PostgreSQL, free tier) |
| Google OAuth redirect URI | `https://dashboard.linchpinsoftsolution.com/api/auth/callback/google` |
| Cron job | Daily report at 7:00 PM IST (13:30 UTC) via `vercel.json` |

---

## 9. Out of Scope (v1.0)

- Native mobile app (iOS/Android)
- Full payroll processing or bank transfers
- Video/audio calling
- Document storage / file uploads
- Multi-company or multi-workspace support
- Public-facing client portal

---

## 10. Open Questions

- What is the official company working hours start time? (Currently assumed 9:30 AM for late threshold)
- Should interns have a different pay structure or the same multiplier logic?
- Who is the first Admin user — will they be seeded directly into the database?
- Should the daily report email go to all admins or a configurable list?
- Is there a probation period or notice period tracking requirement in future?
