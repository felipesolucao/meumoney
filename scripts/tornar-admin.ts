// scripts/tornar-admin.ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.user.update({
    where: { email: 'felipesolucaodev@gmail.com' },
    data: { role: 'ADMIN' },
  })
  console.log('Usuário promovido a admin!')
}

main().finally(() => prisma.$disconnect())