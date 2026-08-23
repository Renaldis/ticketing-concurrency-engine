import { Worker, Job } from 'bullmq';
import { queueConnection } from '../config/queue.js';
import prisma from '../config/prisma.js';

interface CancelOrderJobData {
  orderId: string;
}

export const orderExpirationWorker = new Worker<CancelOrderJobData>(
  'order-expiration',
  async (job: Job<CancelOrderJobData>) => {
    const { orderId } = job.data;
    console.log(`[worker]: Memulai pengecekan kedaluwarsa untuk Order ID: ${orderId}`);

    // Jalankan pengecekan di dalam database transaksi untuk keamanan
    await prisma.$transaction(async (tx) => {
      // 1. Cari data order beserta item-item tiketnya
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { orderItems: true },
      });

      if (!order) {
        console.warn(`[worker]: Order ${orderId} tidak ditemukan. Dilewati.`);
        return;
      }

      // 2. Batalkan order hanya jika statusnya masih PENDING (belum dibayar)
      if (order.status === 'PENDING') {
        console.log(`[worker]: Order ${orderId} belum dibayar. Membatalkan order...`);

        // Ganti status Order menjadi CANCELLED
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'CANCELLED' },
        });

        // Ganti status transaksi pembayaran menjadi FAILED
        await tx.transaction.update({
          where: { orderId: orderId },
          data: { status: 'FAILED' },
        });

        // Kembalikan sisa kapasitas tiket di database ke semula (Incremental)
        for (const item of order.orderItems) {
          await tx.ticketCategory.update({
            where: { id: item.ticketCategoryId },
            data: {
              remainingCapacity: {
                increment: item.quantity,
              },
            },
          });
          console.log(
            `[worker]: Berhasil mengembalikan stok sebanyak ${item.quantity} tiket ke jenis kategori: ${item.ticketCategoryId}`,
          );
        }
      } else {
        console.log(
          `[worker]: Order ${orderId} sudah berstatus ${order.status}. Pembatalan dilewati.`,
        );
      }
    });
  },
  {
    connection: queueConnection,
    concurrency: 5, // Batasi hanya 5 pemrosesan pembatalan paralel dalam satu waktu agar tidak overload
  },
);

orderExpirationWorker.on('completed', (job) => {
  console.log(`[worker]: Pekerjaan pembatalan ID ${job.id} selesai diproses.`);
});

orderExpirationWorker.on('failed', (job, err) => {
  console.error(
    `[worker]: Pekerjaan pembatalan ID ${job ? job.id : 'unknown'} gagal: ${err.message}`,
  );
});
