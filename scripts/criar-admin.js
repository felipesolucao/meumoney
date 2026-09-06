// ============================================================================
// SCRIPT: criar (ou promover) uma conta de administrador
// ----------------------------------------------------------------------------
// Uso (rodando localmente, com o DATABASE_URL do Railway no seu .env, ou
// direto no Railway via "railway run"):
//
//   node scripts/criar-admin.js seuemail@exemplo.com 123456 62999999999
//
// Se o e-mail já existir, só promove essa conta para admin (não mexe na
// senha). Se não existir, cria uma conta nova já como admin.
// ============================================================================
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  const [, , email, senha, telefone] = process.argv;

  if (!email) {
    console.error("Uso: node scripts/criar-admin.js email senha telefone");
    process.exit(1);
  }

  const existente = await prisma.usuario.findUnique({ where: { email: email.toLowerCase().trim() } });

  if (existente) {
    await prisma.usuario.update({ where: { id: existente.id }, data: { papel: "admin" } });
    console.log(`Conta ${email} promovida a admin.`);
    return;
  }

  if (!senha || !/^\d{6}$/.test(senha)) {
    console.error("Para criar uma conta nova, informe uma senha de exatamente 6 números.");
    process.exit(1);
  }
  if (!telefone) {
    console.error("Para criar uma conta nova, informe o telefone.");
    process.exit(1);
  }

  const usuario = await prisma.usuario.create({
    data: {
      email: email.toLowerCase().trim(),
      senha: await bcrypt.hash(senha, 10),
      telefone: telefone.replace(/\D/g, ""),
      papel: "admin",
    },
  });

  console.log(`Conta de admin criada: ${usuario.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
