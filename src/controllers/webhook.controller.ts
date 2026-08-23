import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/prisma.js';

export class WebhookController {
  static async handlePaymentWebhook(req: Request, res: Response): Promise<void> {
    const signature = req.headers['x-signature'] as string;
    const secret = process.env.WEBHOOK_SECRET;

    if (!secret) {
      res.status(500).json({ error: 'Webhook secret is not configured' });
      return;
    }

    if (!signature) {
      res.status(400).json({ error: 'Missing x-signature header' });
      return;
    }

    // 1. VERIFIKASI SECARA KRIPTOGRAFIS (HMAC SHA256)
    // Kita men-hash body request menggunakan WEBHOOK_SECRET lalu menyandingkannya dengan signature di header
    const payloadString = JSON.stringify(req.body);
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');

    if (computedSignature !== signature) {
      console.warn('[webhook]: Invalid signature detected! Rejecting request.');
      res.status(401).json({ error: 'Invalid cryptographic signature' });
      return;
    }

    const { orderId, status } = req.body;

    if (!orderId || !status) {
      res.status(400).json({ error: 'Missing orderId or status in payload' });
      return;
    }

    console.log(
      `[webhook]: Memproses notifikasi pembayaran untuk Order ${orderId} (Status: ${status})`,
    );

    try {
      await prisma.$transaction(async (tx) => {
        // 2. Ambil data order untuk pengecekan berikutnya
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { orderItems: true },
        });

        if (!order) {
          throw new Error('Order not found');
        }

        // 3. IDEMPOTENCY CHECK (Mencegah Pemrosesan Ganda)
        // Jika order sudah diselesaikan (PAID / CANCELLED), kembalikan respon sukses aslinya tanpa memproses ulang.
        if (order.status === 'PAID') {
          console.log(
            `[webhook]: Order ${orderId} sudah berstatus PAID sebelumnya (Idempotent). Selesai.`,
          );
          return;
        }
        if (order.status === 'CANCELLED') {
          console.log(
            `[webhook]: Order ${orderId} sudah berstatus CANCELLED sebelumnya (Idempotent). Selesai.`,
          );
          return;
        }

        // 4. EKSEKUSI FINALISASI
        if (status === 'settlement') {
          // Pembayaran berhasil!
          console.log(`[webhook]: Menyetujui pembayaran! Mengubah Order ${orderId} menjadi PAID`);

          await tx.order.update({
            where: { id: orderId },
            data: { status: 'PAID' },
          });

          await tx.transaction.update({
            where: { orderId: orderId },
            data: { status: 'SUCCESS' },
          });
        } else if (status === 'expire' || status === 'cancel') {
          // Pembayaran kedaluwarsa atau dibatalkan sepihak oleh user di halaman PG
          console.log(
            `[webhook]: Pembayaran ditolak/expire! Mengubah Order ${orderId} menjadi CANCELLED`,
          );

          await tx.order.update({
            where: { id: orderId },
            data: { status: 'CANCELLED' },
          });

          await tx.transaction.update({
            where: { orderId: orderId },
            data: { status: 'FAILED' },
          });

          // Kembalikan sisa kapasitas tiket di database
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
              `[webhook]: Berhasil merilis kembali ${item.quantity} tiket karena pembatalan ke kategori: ${item.ticketCategoryId}`,
            );
          }
        } else {
          throw new Error(`Unhandled payment status: ${status}`);
        }
      });

      res.status(200).json({ message: 'Webhook processed successfully' });
    } catch (error: any) {
      console.error('[webhook Error]:', error.message);
      res.status(400).json({ error: error.message || 'Processing failed' });
    }
  }
}
