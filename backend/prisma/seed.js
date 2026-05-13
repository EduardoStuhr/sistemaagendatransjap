import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const USERS = [
  { name: 'Luiz',    color: '#388bfd', isAdmin: true,  isManager: true,  role: 'admin'   },
  { name: 'Wando',   color: '#3fb950', isAdmin: false, isManager: false, role: 'tecnico' },
  { name: 'Eduardo', color: '#8957e5', isAdmin: true,  isManager: true,  role: 'admin'   },
  { name: 'Davi',    color: '#db6d28', isAdmin: false, isManager: false, role: 'tecnico' },
  { name: 'Diego',   color: '#d29922', isAdmin: false, isManager: false, role: 'tecnico' },
  { name: 'Jean',    color: '#f78166', isAdmin: false, isManager: false, role: 'tecnico' },
];

async function main() {
  const hash = await bcrypt.hash('Transjap2026*', 10);

  for (const u of USERS) {
    const email = `${u.name.toLowerCase()}@transjap.local`;
    await prisma.user.upsert({
      where:  { email },
      update: { password: hash, isAdmin: u.isAdmin, isManager: u.isManager, active: true, color: u.color },
      create: {
        name:      u.name,
        email,
        password:  hash,
        role:      u.role,
        initials:  u.name.substring(0, 2).toUpperCase(),
        color:     u.color,
        isAdmin:   u.isAdmin,
        isManager: u.isManager,
      },
    });
    console.log(`✅  ${u.name.padEnd(8)} criado/atualizado`);
  }

  console.log('\n🔒 Senha de todos: Transjap2026*\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
