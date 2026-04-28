import { PrismaClient } from './src/generated/prisma'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10)
  const employeePassword = await bcrypt.hash('employee123', 10)

  // ── Admin ──────────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@linchpinsoftsolution.com' },
    update: {},
    create: {
      email: 'admin@linchpinsoftsolution.com',
      name: 'Super Admin',
      password: adminPassword,
      role: 'ADMIN',
      designation: 'CEO',
      baseMonthlySalary: 100000,
    },
  })

  // ── Employee 1 ─────────────────────────────────────────────────────────────
  const employee1 = await prisma.user.upsert({
    where: { email: 'riya.sharma@linchpinsoftsolution.com' },
    update: {},
    create: {
      email: 'riya.sharma@linchpinsoftsolution.com',
      name: 'Riya Sharma',
      password: employeePassword,
      role: 'EMPLOYEE',
      designation: 'Frontend Developer',
      baseMonthlySalary: 45000,
    },
  })

  // ── Employee 2 ─────────────────────────────────────────────────────────────
  const employee2 = await prisma.user.upsert({
    where: { email: 'arjun.mehta@linchpinsoftsolution.com' },
    update: {},
    create: {
      email: 'arjun.mehta@linchpinsoftsolution.com',
      name: 'Arjun Mehta',
      password: employeePassword,
      role: 'EMPLOYEE',
      designation: 'Backend Developer',
      baseMonthlySalary: 50000,
    },
  })

  console.log({ admin, employee1, employee2 })
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })