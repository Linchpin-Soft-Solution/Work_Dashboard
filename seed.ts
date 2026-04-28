import { PrismaClient } from './src/generated/prisma'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@linchpinsoftsolution.com' },
    update: {},
    create: {
      email: 'admin@linchpinsoftsolution.com',
      name: 'Super Admin',
      password: hashedPassword,
      role: 'ADMIN',
      designation: 'CEO',
      baseMonthlySalary: 100000,
    },
  })

  console.log({ admin })
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })