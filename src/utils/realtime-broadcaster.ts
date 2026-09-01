import { redisPublisher } from '../config/redis.js';
import prisma from '../config/prisma.js';

export class RealtimeBroadcaster {
  // Broadcast perubahan sisa kuota tiket event ke seluruh subscriber SSE
  static async broadcastEventQuota(eventId: string): Promise<void> {
    try {
      const [categories, event] = await Promise.all([
        prisma.ticketCategory.findMany({
          where: { eventId },
          select: {
            id: true,
            name: true,
            remainingCapacity: true,
            totalCapacity: true,
          },
        }),
        prisma.event.findUnique({
          where: { id: eventId },
          select: { slug: true },
        }),
      ]);

      const payload = JSON.stringify({
        eventId,
        slug: event?.slug || null,
        categories,
      });

      await redisPublisher.publish('event:quota_updated', payload);
      // Trigger update ke admin dashboard juga
      await redisPublisher.publish('admin:telemetry_updated', JSON.stringify({ eventId }));
    } catch (err) {
      console.error('[RealtimeBroadcaster Quota Error]:', err);
    }
  }

  // Broadcast perubahan status pesanan (PAID / CANCELLED) ke browser user & admin
  static async broadcastOrderStatus(orderId: string, status: string): Promise<void> {
    try {
      const payload = JSON.stringify({
        orderId,
        status,
      });

      await redisPublisher.publish('order:status_updated', payload);
      await redisPublisher.publish('admin:telemetry_updated', JSON.stringify({ orderId, status }));
    } catch (err) {
      console.error('[RealtimeBroadcaster Order Error]:', err);
    }
  }
}
