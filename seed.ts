import { PrismaClient } from './src/generated/prisma'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // ── Sachin ──────────────────────────────────────────────────────────────────
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

  console.log({ sachin })
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })