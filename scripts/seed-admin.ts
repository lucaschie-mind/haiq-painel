// scripts/seed-admin.ts
//
// Cria o primeiro usuário admin. Rode uma vez, depois do deploy:
//
//   ADMIN_EMAIL=voce@mindsight.com.br ADMIN_NOME="Seu Nome" npx tsx scripts/seed-admin.ts
//
// Ou, no Railway, abra um shell no serviço e rode o mesmo comando.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const nome  = process.env.ADMIN_NOME || "Admin";

  if (!email) {
    console.error("Defina ADMIN_EMAIL. Ex.: ADMIN_EMAIL=voce@mindsight.com.br npx tsx scripts/seed-admin.ts");
    process.exit(1);
  }

  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente) {
    console.log(`Usuário ${email} já existe (perfil ${existente.role}).`);
    return;
  }

  const u = await prisma.user.create({ data: { email, nome, role: "ADMIN" } });
  console.log(`Admin criado: ${u.nome} <${u.email}>`);
  console.log("Entre pelo painel em /login usando este e-mail.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
