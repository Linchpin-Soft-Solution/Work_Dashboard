import { PrismaClient } from "./src/generated/prisma";
const prisma = new PrismaClient();

async function main() {
  const dailyLogs = await prisma.dailyLog.findMany();
  console.log("Daily Logs:", dailyLogs);
  
  const weeklyLogs = await prisma.weeklyLog.findMany();
  console.log("Weekly Logs:", weeklyLogs);
}
main();
