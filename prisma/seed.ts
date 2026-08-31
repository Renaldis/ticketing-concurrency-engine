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

  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Admin Mantap',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });
  console.log(`Created admin: ${admin.name} (${admin.email})`);

  // 3. Buat Event dummy
  const event1 = await prisma.event.create({
    data: {
      title: 'Neon Symphony Core 2026',
      slug: 'neon-symphony-core-2026',
      description: '<p>Experience the ultimate fusion of electronic beats and digital art in a futuristic stadium stage.</p>',
      location: 'The Void Arena, Jakarta',
      date: new Date('2026-10-24T19:00:00Z'),
      imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1200&auto=format&fit=crop',
    },
  });

  const event2 = await prisma.event.create({
    data: {
      title: 'Jakarta Rock Live Festival',
      slug: 'jakarta-rock-live-festival',
      description: '<p>The biggest rock festival in Southeast Asia with international rock bands and headliners.</p>',
      location: 'Stadion Utama Gelora Bung Karno, Jakarta',
      date: new Date('2026-11-15T16:00:00Z'),
      imageUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=1200&auto=format&fit=crop',
    },
  });

  const event3 = await prisma.event.create({
    data: {
      title: 'FutureWeb Enterprise Summit',
      slug: 'futureweb-enterprise-summit',
      description: '<p>Annual gathering of software engineers, cloud architects, and tech innovators.</p>',
      location: 'Jakarta Convention Center (JCC)',
      date: new Date('2026-12-05T09:00:00Z'),
      imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1200&auto=format&fit=crop',
    },
  });
  console.log(`Created 3 events with high-res poster images`);

  // 4. Buat Kategori Tiket untuk Event 1
  const vipCategory = await prisma.ticketCategory.create({
    data: {
      eventId: event1.id,
      name: 'VIP',
      price: 5000000.0,
      totalCapacity: 5,
      remainingCapacity: 5,
    },
  });

  const cat1Category = await prisma.ticketCategory.create({
    data: {
      eventId: event1.id,
      name: 'CAT 1',
      price: 2500000.0,
      totalCapacity: 50,
      remainingCapacity: 50,
    },
  });

  // Kategori Tiket untuk Event 2
  await prisma.ticketCategory.create({
    data: {
      eventId: event2.id,
      name: 'Festival Regular',
      price: 750000.0,
      totalCapacity: 200,
      remainingCapacity: 200,
    },
  });
  await prisma.ticketCategory.create({
    data: {
      eventId: event2.id,
      name: 'VIP Moshpit',
      price: 1800000.0,
      totalCapacity: 40,
      remainingCapacity: 40,
    },
  });

  // Kategori Tiket untuk Event 3
  await prisma.ticketCategory.create({
    data: {
      eventId: event3.id,
      name: 'Conference Pass',
      price: 1200000.0,
      totalCapacity: 150,
      remainingCapacity: 150,
    },
  });

  // SIMPAN ID BARU KE FILE JSON
  const seedData = {
    userId: user.id,
    eventId: event1.id,
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
