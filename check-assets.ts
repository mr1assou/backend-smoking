import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.asset.count();
  console.log(`Nombre d'actifs en base : ${count}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
