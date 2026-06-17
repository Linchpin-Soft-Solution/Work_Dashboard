import { PrismaClient, Prisma } from './src/generated/prisma'
import type { PipelineStage, User } from './src/generated/prisma'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ── date helpers (seed runs under tsx / full Node) ──────────────────────────
const now = new Date()
const dayMs = 24 * 60 * 60 * 1000
const addDays = (base: Date, days: number) => new Date(base.getTime() + days * dayMs)
const atHour = (d: Date, h: number) => {
  const x = new Date(d)
  x.setHours(h, 0, 0, 0)
  return x
}

async function main() {
  // ── Sachin (admin) ──────────────────────────────────────────────────────
  const sachinPassword = await bcrypt.hash('Sachin123', 10)
  const sachin = await prisma.user.upsert({
    where: { email: 'sachin@linchpinsoftsolution.com' },
    update: {},
    create: {
      email: 'sachin@linchpinsoftsolution.com',
      name: 'Sachin',
      password: sachinPassword,
      role: 'ADMIN',
      designation: 'CTO',
      baseMonthlySalary: 150000,
    },
  })
  console.log({ sachin: sachin.email })

  // ── Sales CRM seed ────────────────────────────────────────────────────────
  await seedCrm()
}

async function seedCrm() {
  // Reset CRM data for an idempotent re-run. Deleting prospects cascades to
  // their calls / remarks / activities.
  await prisma.prospect.deleteMany({})
  await prisma.pipelineStage.deleteMany({})

  // ── Users: 1 sales manager + 4 reps ────────────────────────────────────────
  const defaultPassword = await bcrypt.hash('Sales@123', 10)

  const manager = await prisma.user.upsert({
    where: { email: 'sales.manager@linchpinsoftsolution.com' },
    update: { role: 'SALES_MANAGER' },
    create: {
      email: 'sales.manager@linchpinsoftsolution.com',
      name: 'Priya Menon',
      password: defaultPassword,
      role: 'SALES_MANAGER',
      designation: 'Sales Manager',
    },
  })

  const repSeeds = [
    { email: 'rohit.sharma@linchpinsoftsolution.com', name: 'Rohit Sharma' },
    { email: 'aisha.khan@linchpinsoftsolution.com', name: 'Aisha Khan' },
    { email: 'vikram.rao@linchpinsoftsolution.com', name: 'Vikram Rao' },
    { email: 'neha.gupta@linchpinsoftsolution.com', name: 'Neha Gupta' },
  ]
  const reps: User[] = []
  for (const r of repSeeds) {
    const rep = await prisma.user.upsert({
      where: { email: r.email },
      update: { role: 'SALES_REP' },
      create: {
        email: r.email,
        name: r.name,
        password: defaultPassword,
        role: 'SALES_REP',
        designation: 'BD Executive',
      },
    })
    reps.push(rep)
  }

  // ── Pipeline stages (default 9) ─────────────────────────────────────────────
  const stageSeeds = [
    { name: 'New', isWon: false, isLost: false },
    { name: 'Contacted', isWon: false, isLost: false },
    { name: 'Qualified', isWon: false, isLost: false },
    { name: 'Meeting Scheduled', isWon: false, isLost: false },
    { name: 'Proposal Sent', isWon: false, isLost: false },
    { name: 'Negotiation', isWon: false, isLost: false },
    { name: 'Won', isWon: true, isLost: false },
    { name: 'Lost', isWon: false, isLost: true },
    { name: 'On Hold / Nurture', isWon: false, isLost: false },
  ]
  const stages: PipelineStage[] = []
  for (let i = 0; i < stageSeeds.length; i++) {
    const s = stageSeeds[i]
    const stage = await prisma.pipelineStage.create({
      data: { name: s.name, sortOrder: i, isWon: s.isWon, isLost: s.isLost },
    })
    stages.push(stage)
  }
  const stageByName = (name: string) => stages.find((s) => s.name === name)!

  // ── Prospects ───────────────────────────────────────────────────────────────
  const sources = ['REFERRAL', 'INBOUND', 'COLD_LIST', 'EVENT', 'OTHER'] as const
  const cities = ['Mumbai', 'Bengaluru', 'Delhi', 'Pune', 'Hyderabad', 'Chennai', 'Ahmedabad', 'Kolkata']
  const industries = ['E-commerce', 'EdTech', 'FinTech', 'Healthcare', 'Real Estate', 'SaaS', 'Manufacturing', 'Hospitality', 'Logistics', 'Retail']
  const outcomes = ['CONNECTED_INTERESTED', 'CONNECTED_CALLBACK', 'CONNECTED_NOT_INTERESTED', 'NO_ANSWER', 'UNREACHABLE', 'WRONG_NUMBER'] as const
  const lostReasons = ['Budget too low', 'Went with competitor', 'No decision-maker access', 'Project shelved']

  // Distribution of prospects across stages (weighted toward early stages).
  const stagePlan = [
    'New', 'New', 'New', 'New', 'New', 'New',
    'Contacted', 'Contacted', 'Contacted', 'Contacted', 'Contacted',
    'Qualified', 'Qualified', 'Qualified', 'Qualified',
    'Meeting Scheduled', 'Meeting Scheduled', 'Meeting Scheduled',
    'Proposal Sent', 'Proposal Sent', 'Proposal Sent',
    'Negotiation', 'Negotiation', 'Negotiation',
    'Won', 'Won', 'Won', 'Won',
    'Lost', 'Lost', 'Lost', 'Lost',
    'On Hold / Nurture', 'On Hold / Nurture', 'On Hold / Nurture',
    'Contacted', 'Qualified', 'New', 'Proposal Sent', 'Negotiation',
  ]

  const companyNames = [
    'Brightline Retail', 'NovaEdu Learning', 'PayCircle FinServ', 'MediCare Plus', 'Urban Nest Realty',
    'CloudStack SaaS', 'IronForge Industries', 'StayWell Hotels', 'SwiftMove Logistics', 'TrendKart',
    'GreenLeaf Organics', 'BlueOcean Travels', 'Pixel Forge Studio', 'Summit Consulting', 'CraftBox DTC',
    'MetroFit Gyms', 'Lumen Solar', 'FreshCrate Grocery', 'Apex Legal', 'Vista Interiors',
    'Quantum Analytics', 'HealthFirst Clinics', 'EduSpark Academy', 'CoinBridge', 'NestRealty Group',
    'ByteWorks IT', 'PrimeCast Media', 'GoFleet Mobility', 'PureSip Beverages', 'StyleHub Fashion',
    'AgroNext Farms', 'SecurePay Gateway', 'KidLearn Toys', 'Vitality Pharma', 'Skyline Builders',
    'DataNest Cloud', 'EventPro Planners', 'CartFlow Commerce', 'Wellness Co', 'RouteOne Transport',
  ]
  const contactNames = [
    'Amit Verma', 'Sneha Iyer', 'Rahul Nair', 'Pooja Reddy', 'Karan Malhotra', 'Divya Pillai',
    'Sanjay Joshi', 'Meera Das', 'Arjun Kapoor', 'Ritu Singh', 'Manish Agarwal', 'Tara Bose',
    'Nikhil Shah', 'Anjali Mehta', 'Suresh Kumar', 'Farah Ansari', 'Deepak Choudhary', 'Lata Krishnan',
    'Varun Sethi', 'Isha Banerjee',
  ]

  for (let i = 0; i < stagePlan.length; i++) {
    const stageName = stagePlan[i]
    const stage = stageByName(stageName)
    const rep = reps[i % reps.length]
    const company = companyNames[i % companyNames.length]
    const contact = contactNames[i % contactNames.length]
    const phone = `+9198${String(76000000 + i * 137).padStart(8, '0')}`
    const source = sources[i % sources.length]
    const city = cities[i % cities.length]
    const industry = industries[i % industries.length]
    const isWonOrLost = stage.isWon || stage.isLost
    const isInvalid = stageName === 'Lost' && i % 9 === 0 // a couple invalid numbers
    const dealValue = i % 5 === 0 ? null : (i % 9) * 25000 + 50000 // some unknown values

    // Follow-up spread: overdue / today / upcoming for non-closed prospects.
    let nextFollowUpAt: Date | null = null
    if (!isWonOrLost) {
      const m = i % 4
      if (m === 0) nextFollowUpAt = atHour(addDays(now, -(1 + (i % 3))), 11) // overdue
      else if (m === 1) nextFollowUpAt = atHour(now, 16) // today
      else nextFollowUpAt = atHour(addDays(now, 1 + (i % 5)), 10) // upcoming
    }

    // Build a small call history per prospect.
    const callCount = isWonOrLost ? 3 : 1 + (i % 3)
    const calls = []
    for (let c = 0; c < callCount; c++) {
      const outcome = isInvalid && c === callCount - 1 ? 'WRONG_NUMBER' : outcomes[(i + c) % outcomes.length]
      calls.push({
        userId: rep.id,
        outcome,
        durationSeconds: outcome.startsWith('CONNECTED') ? 60 + ((i + c) % 10) * 45 : null,
        remark: `Call ${c + 1}: ${outcome.replaceAll('_', ' ').toLowerCase()}.`,
        calledAt: atHour(addDays(now, -(callCount - c) * 4 - (i % 3)), 10 + (c % 6)),
      })
    }
    const lastCall = calls[calls.length - 1]

    const prospect = await prisma.prospect.create({
      data: {
        companyName: company,
        contactName: contact,
        phone,
        email: `${contact.split(' ')[0].toLowerCase()}@${company.split(' ')[0].toLowerCase()}.com`,
        city,
        industry,
        source,
        dealValue,
        stageId: stage.id,
        assignedRepId: rep.id,
        nextFollowUpAt,
        lastCallOutcome: lastCall.outcome,
        lostReason: stage.isLost ? lostReasons[i % lostReasons.length] : null,
        isInvalid,
        createdAt: atHour(addDays(now, -20 - (i % 15)), 9),
        Calls: { create: calls },
        Remarks: {
          create: [
            {
              userId: rep.id,
              text: `Initial notes for ${company}. ${industry} player in ${city}; ${source.toLowerCase()} lead.`,
            },
          ],
        },
      },
    })

    // Activity timeline: assignment + a call activity + follow-up set (where set).
    const activities: Omit<Prisma.CrmActivityCreateManyInput, 'prospectId'>[] = [
      {
        userId: manager.id,
        type: 'ASSIGNMENT',
        detail: `Assigned to ${rep.name}`,
        createdAt: prospect.createdAt,
      },
      {
        userId: rep.id,
        type: 'CALL',
        detail: `Logged call — ${lastCall.outcome.replaceAll('_', ' ').toLowerCase()}`,
        createdAt: lastCall.calledAt,
      },
    ]
    if (!isWonOrLost && stageName !== 'New') {
      activities.push({
        userId: rep.id,
        type: 'STAGE_CHANGE',
        detail: `Moved to ${stageName}`,
        createdAt: atHour(addDays(now, -(i % 5) - 1), 12),
      })
    }
    if (nextFollowUpAt) {
      activities.push({
        userId: rep.id,
        type: 'FOLLOW_UP_SET',
        detail: `Follow-up set for ${nextFollowUpAt.toISOString().slice(0, 10)}`,
        createdAt: lastCall.calledAt,
      })
    }
    await prisma.crmActivity.createMany({
      data: activities.map((a) => ({ ...a, prospectId: prospect.id })),
    })
  }

  console.log(
    `CRM seeded: 1 manager, ${reps.length} reps, ${stages.length} stages, ${stagePlan.length} prospects.`,
  )
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
