import { PrismaClient } from "./src/generated/prisma";
const prisma = new PrismaClient();

async function main() {
  const reports = await prisma.dailyReport.findMany({
    orderBy: { date: 'desc' },
    take: 10,
  });
  console.log("Recent Daily Reports:");
  reports.forEach(r => {
    console.log({
      id: r.id,
      date: r.date.toISOString(),
      generatedAt: r.generatedAt.toISOString(),
      emailSent: r.emailSent,
    });
  });
}
main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
