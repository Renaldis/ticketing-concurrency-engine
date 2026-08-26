import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/prisma.js';
import { asyncHandler } from '../utils/async-handler.js';

export class WebhookController {
  handlePaymentWebhook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['x-signature'] as string;
    const secret = process.env.WEBHOOK_SECRET;

    // Deteksi apakah notifikasi berasal dari Midtrans asli (berdasarkan struktur payload body)
    const isMidtransWebhook = req.body && req.body.signature_key;

    if (isMidtransWebhook) {
      // 1. VERIFIKASI SECARA KRIPTOGRAFIS NOTIFIKASI MIDTRANS (SHA-512)
      // Rumus: SHA512(order_id + status_code + gross_amount + ServerKey)
      const { order_id, status_code, gross_amount, signature_key, fraud_status } = req.body;
      const serverKey = process.env.MIDTRANS_SERVER_KEY;

      if (!serverKey) {
        console.error('[webhook Midtrans]: MIDTRANS_SERVER_KEY not set.');
        res.status(500).json({ error: 'MIDTRANS_SERVER_KEY is not configured' });
        return;
      }

      const rawString = order_id + status_code + gross_amount + serverKey;
      const computedSignature = crypto.createHash('sha512').update(rawString).digest('hex');

      if (computedSignature !== signature_key) {
        console.warn('[webhook Midtrans]: Invalid signature key! Rejecting request.');
        res.status(401).json({ error: 'Invalid Midtrans cryptographic signature' });
        return;
      }

      console.log(`[webhook Midtrans]: Verified notification for Order ${order_id}`);

      const orderId = order_id;
      const transactionStatus = req.body.transaction_status;

      let mappedStatus = '';
      if (
        transactionStatus === 'settlement' ||
        (transactionStatus === 'capture' && fraud_status === 'accept')
      ) {
        mappedStatus = 'settlement';
      } else if (
        transactionStatus === 'deny' ||
        transactionStatus === 'cancel' ||
        transactionStatus === 'expire'
      ) {
        mappedStatus = 'expire';
      }

      if (mappedStatus) {
        await this.dbFinalizeOrder(res, orderId, mappedStatus);
      } else {
        res.status(200).json({ message: `Webhook status ${transactionStatus} ignored` });
      }
      return;
    }

    // --- FALLBACK UNTUK PENGUJIAN HMAC LAMA (Stripe/Custom Webhook Simulation) ---
    if (!secret) {
      res.status(500).json({ error: 'Webhook secret is not configured' });
      return;
    }
    if (!signature) {
      res.status(400).json({ error: 'Missing x-signature header' });
      return;
    }

    const payloadString = JSON.stringify(req.body);
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');

    if (computedSignature !== signature) {
      console.warn('[webhook Fallback]: Invalid signature! Rejecting request.');
      res.status(401).json({ error: 'Invalid cryptographic signature' });
      return;
    }

    const { orderId, status } = req.body;
    if (!orderId || !status) {
      res.status(400).json({ error: 'Missing orderId or status in payload' });
      return;
    }

    await this.dbFinalizeOrder(res, orderId, status);
  });

  private async dbFinalizeOrder(
    res: Response,
    orderId: string,
    status: string,
  ): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { orderItems: true },
        });

        if (!order) {
          throw new Error('Order not found');
        }

        if (order.status === 'PAID') {
          console.log(`[webhook]: Order ${orderId} sudah berstatus PAID sebelumnya (Idempotent).`);
          return;
        }
        if (order.status === 'CANCELLED') {
          console.log(
            `[webhook]: Order ${orderId} sudah berstatus CANCELLED sebelumnya (Idempotent).`,
          );
          return;
        }

        if (status === 'settlement') {
          console.log(`[webhook]: Mengubah Status Order ${orderId} menjadi PAID`);
          await tx.order.update({
            where: { id: orderId },
            data: { status: 'PAID' },
          });
          await tx.transaction.update({
            where: { orderId: orderId },
            data: { status: 'SUCCESS' },
          });
        } else if (status === 'expire' || status === 'cancel') {
          console.log(`[webhook]: Mengubah Status Order ${orderId} menjadi CANCELLED`);
          await tx.order.update({
            where: { id: orderId },
            data: { status: 'CANCELLED' },
          });
          await tx.transaction.update({
            where: { orderId: orderId },
            data: { status: 'FAILED' },
          });

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
              `[webhook]: Merilis kembali ${item.quantity} tiket untuk kategori: ${item.ticketCategoryId}`,
            );
          }
        }
      });

      res.status(200).json({ message: 'Webhook processed successfully' });
    } catch (error: any) {
      console.error('[webhook DB Error]:', error.message);
      res.status(400).json({ error: error.message || 'Verification database transaction failed' });
    }
  }
}
