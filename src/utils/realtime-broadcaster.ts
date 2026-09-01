import { redisPublisher } from '../config/redis.js';
import prisma from '../config/prisma.js';

export class RealtimeBroadcaster {
  // Broadcast perubahan sisa kuota tiket event ke seluruh subscriber SSE
  static async broadcastEventQuota(eventId: string): Promise<void> {
    try {
      const categories = await prisma.ticketCategory.findMany({
        where: { eventId },
        select: {
          id: true,
          name: true,
          remainingCapacity: true,
          totalCapacity: true,
        },
      });

      const payload = JSON.stringify({
        eventId,
        categories,
      });

      await redisPublisher.publish('event:quota_updated', payload);
    } catch (err) {
      console.error('[RealtimeBroadcaster Quota Error]:', err);
    }
  }

  // Broadcast perubahan status pesanan (PAID / CANCELLED) ke browser user
  static async broadcastOrderStatus(orderId: string, status: string): Promise<void> {
    try {
      const payload = JSON.stringify({
        orderId,
        status,
      });

      await redisPublisher.publish('order:status_updated', payload);
    } catch (err) {
      console.error('[RealtimeBroadcaster Order Error]:', err);
    }
  }
}
