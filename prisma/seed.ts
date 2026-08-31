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

  // 3. Buat Event dummy dari berbagai macam kategori nyata
  const event1 = await prisma.event.create({
    data: {
      title: 'Neon Symphony Live Concert 2026',
      slug: 'neon-symphony-live-concert-2026',
      category: 'CONCERT',
      description: '<p>Experience the ultimate fusion of electronic music beats and immersive digital laser art.</p>',
      location: 'The Void Arena, Jakarta',
      date: new Date('2026-10-24T19:00:00Z'),
      imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1200&auto=format&fit=crop',
    },
  });

  const event2 = await prisma.event.create({
    data: {
      title: 'Jakarta Night 10K Marathon 2026',
      slug: 'jakarta-night-10k-marathon-2026',
      category: 'SPORTS',
      description: '<p>Annual night road race through the iconic streets of Jakarta with hydration points and finisher medals.</p>',
      location: 'Gelora Bung Karno (GBK) Senayan, Jakarta',
      date: new Date('2026-11-15T19:00:00Z'),
      imageUrl: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?q=80&w=1200&auto=format&fit=crop',
    },
  });

  const event3 = await prisma.event.create({
    data: {
      title: 'Cloud & AI Engineering Summit',
      slug: 'cloud-ai-engineering-summit',
      category: 'SEMINAR',
      description: '<p>Executive conference and technical deep-dives on high-concurrency cloud architecture and AI agent systems.</p>',
      location: 'Jakarta Convention Center (JCC)',
      date: new Date('2026-12-05T09:00:00Z'),
      imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1200&auto=format&fit=crop',
    },
  });

  const event4 = await prisma.event.create({
    data: {
      title: 'Future Digital Art & Tech Expo',
      slug: 'future-digital-art-tech-expo',
      category: 'EXHIBITION',
      description: '<p>Immersive interactive gallery showcasing generative art, holograms, and next-gen creative tech.</p>',
      location: 'Art:1 New Museum, Jakarta',
      date: new Date('2026-12-20T10:00:00Z'),
      imageUrl: 'https://images.unsplash.com/photo-1508997449629-303059a039c0?q=80&w=1200&auto=format&fit=crop',
    },
  });

  const event5 = await prisma.event.create({
    data: {
      title: 'Fullstack Next.js & System Design Workshop',
      slug: 'fullstack-nextjs-system-design-workshop',
      category: 'WORKSHOP',
      description: '<p>Hands-on interactive masterclass building production-grade fullstack web applications.</p>',
      location: 'Online Live Stream (Zoom + Discord Lab)',
      date: new Date('2026-11-28T13:00:00Z'),
      imageUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1200&auto=format&fit=crop',
    },
  });
  console.log(`Created 5 events across diverse categories (Concert, Sports, Seminar, Exhibition, Workshop)`);

  // 4. Kategori Tiket untuk Event 1 (Concert)
  const vipCategory = await prisma.ticketCategory.create({
    data: {
      eventId: event1.id,
      name: 'VIP Pass',
      price: 5000000.0,
      totalCapacity: 5,
      remainingCapacity: 5,
    },
  });

  await prisma.ticketCategory.create({
    data: {
      eventId: event1.id,
      name: 'CAT 1 Festival',
      price: 2500000.0,
      totalCapacity: 50,
      remainingCapacity: 50,
    },
  });

  // Kategori Tiket untuk Event 2 (Marathon / Sports)
  await prisma.ticketCategory.create({
    data: {
      eventId: event2.id,
      name: '10K Early Bird Entry',
      price: 350000.0,
      totalCapacity: 100,
      remainingCapacity: 100,
    },
  });
  await prisma.ticketCategory.create({
    data: {
      eventId: event2.id,
      name: '10K Master Runner Pack',
      price: 600000.0,
      totalCapacity: 50,
      remainingCapacity: 50,
    },
  });

  // Kategori Tiket untuk Event 3 (Seminar)
  await prisma.ticketCategory.create({
    data: {
      eventId: event3.id,
      name: 'Full Conference Pass',
      price: 1500000.0,
      totalCapacity: 150,
      remainingCapacity: 150,
    },
  });
  await prisma.ticketCategory.create({
    data: {
      eventId: event3.id,
      name: 'VIP Executive Networking',
      price: 3000000.0,
      totalCapacity: 30,
      remainingCapacity: 30,
    },
  });

  // Kategori Tiket untuk Event 4 (Exhibition)
  await prisma.ticketCategory.create({
    data: {
      eventId: event4.id,
      name: 'Single Day Pass',
      price: 150000.0,
      totalCapacity: 200,
      remainingCapacity: 200,
    },
  });

  // Kategori Tiket untuk Event 5 (Workshop)
  await prisma.ticketCategory.create({
    data: {
      eventId: event5.id,
      name: 'Standard Ticket',
      price: 499000.0,
      totalCapacity: 80,
      remainingCapacity: 80,
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
