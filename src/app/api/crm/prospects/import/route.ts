import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isCrmManager } from "@/lib/crm-auth";
import { LeadSource } from "@/generated/prisma";

const VALID_SOURCES: LeadSource[] = ["REFERRAL", "INBOUND", "COLD_LIST", "EVENT", "OTHER"];

interface ImportRow {
  companyName?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  city?: string;
  industry?: string;
  source?: string;
  dealValue?: string | number;
  assignedRepId?: string;
}

// POST /api/crm/prospects/import — bulk import parsed rows (manager only)
// Rows whose phone already exists (or duplicate within the batch) are skipped.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isCrmManager(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const rows: ImportRow[] = Array.isArray(body.rows) ? body.rows : [];
    const defaultRepId: string | undefined = body.defaultRepId;

    if (rows.length === 0) {
      return NextResponse.json({ error: "No rows to import" }, { status: 400 });
    }

    const firstStage = await prisma.pipelineStage.findFirst({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    if (!firstStage) {
      return NextResponse.json({ error: "No pipeline stages configured" }, { status: 400 });
    }

    const skipped: { row: number; reason: string }[] = [];
    const seenInBatch = new Set<string>();
    let imported = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const companyName = (r.companyName || "").trim();
      const contactName = (r.contactName || "").trim();
      const phone = (r.phone || "").trim();

      if (!companyName || !contactName || !phone) {
        skipped.push({ row: i + 1, reason: "Missing company, contact, or phone" });
        continue;
      }
      if (seenInBatch.has(phone)) {
        skipped.push({ row: i + 1, reason: "Duplicate phone within file" });
        continue;
      }
      seenInBatch.add(phone);

      const existing = await prisma.prospect.findUnique({ where: { phone } });
      if (existing) {
        skipped.push({ row: i + 1, reason: "Phone already exists" });
        continue;
      }

      const source = (r.source || "").toUpperCase();
      const repId = r.assignedRepId || defaultRepId || session.user.id;

      await prisma.prospect.create({
        data: {
          companyName,
          contactName,
          phone,
          email: r.email?.trim() || null,
          city: r.city?.trim() || null,
          industry: r.industry?.trim() || null,
          source: VALID_SOURCES.includes(source as LeadSource) ? (source as LeadSource) : "COLD_LIST",
          dealValue: r.dealValue != null && r.dealValue !== "" ? Number(r.dealValue) : null,
          stageId: firstStage.id,
          assignedRepId: repId,
          Activities: {
            create: { userId: session.user.id, type: "ASSIGNMENT", detail: "Imported prospect" },
          },
        },
      });
      imported++;
    }

    return NextResponse.json({ imported, skipped });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to import prospects";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
