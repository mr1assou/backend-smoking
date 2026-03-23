"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const count = await prisma.asset.count();
    console.log(`Nombre d'actifs en base : ${count}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=check-assets.js.map