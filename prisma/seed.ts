import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. Hapus data lama (opsional, agar bersih setiap kali di-seed)
  await prisma.transaction.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.ticketCategory.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 2. Buat User dummy
  const user = await prisma.user.create({
    data: {
      email: 'buyer@example.com',
      name: 'Budi Pembeli',
      password: hashedPassword, // Tambahkan kolom password
      role: 'CUSTOMER', // Tambahkan kolom role
    },
  });
  console.log(`Created user: ${user.name} (${user.email})`);

  // 3. Buat Event dummy
  const event = await prisma.event.create({
    data: {
      title: 'Konser Music Blast 2026',
      description: 'Konser musik spektakuler tahun ini!',
      location: 'Stadion Utama Gelora Bung Karno, Jakarta',
      date: new Date('2026-12-25T19:00:00Z'),
    },
  });
  console.log(`Created event: ${event.title}`);

  // 4. Buat Kategori Tiket
  // Kita buat kapasitas VIP sedikit (misal 5) agar nanti mudah menguji kondisi tiket habis / rebutan
  const vipCategory = await prisma.ticketCategory.create({
    data: {
      eventId: event.id,
      name: 'VIP',
      price: 5000000.0, // Rp 5.000.000
      totalCapacity: 5,
      remainingCapacity: 5,
    },
  });

  const cat1Category = await prisma.ticketCategory.create({
    data: {
      eventId: event.id,
      name: 'CAT 1',
      price: 2500000.0, // Rp 2.500.000
      totalCapacity: 50,
      remainingCapacity: 50,
    },
  });

  console.log(`Created ticket category: ${vipCategory.name} (Stock: ${vipCategory.totalCapacity})`);
  console.log(
    `Created ticket category: ${cat1Category.name} (Stock: ${cat1Category.totalCapacity})`,
  );

  // SIMPAN ID BARU KE FILE JSON
  const seedData = {
    userId: user.id,
    eventId: event.id,
    ticketCategoryId: vipCategory.id,
  };

  fs.writeFileSync(
    path.join(process.cwd(), 'prisma', 'seed-data.json'),
    JSON.stringify(seedData, null, 2),
  );
  console.log('Successfully saved UUIDs to prisma/seed-data.json!');

  console.log('Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
