import { Request, Response } from 'express';
import { redisSubscriber } from '../config/redis.js';
import prisma from '../config/prisma.js';

// Map untuk mengelola koneksi SSE aktif
// Key: eventId (UUID), Value: Set Response stream
const eventClients = new Map<string, Set<Response>>();
const orderClients = new Map<string, Set<Response>>();
const adminClients = new Set<Response>();

// Inisialisasi listener Redis Pub/Sub sekali di startup
let isSubscribed = false;
function initRedisSubscriber() {
  if (isSubscribed) return;
  isSubscribed = true;

  redisSubscriber.subscribe(
    'event:quota_updated',
    'order:status_updated',
    'admin:telemetry_updated',
    (err) => {
      if (err) {
        console.error('[SSE Redis PubSub Error]:', err);
      } else {
        console.log(
          '[SSE]: Subscribed to event:quota_updated, order:status_updated & admin:telemetry_updated',
        );
      }
    },
  );

  redisSubscriber.on('message', (channel, message) => {
    try {
      const data = JSON.parse(message);

      if (channel === 'event:quota_updated') {
        const { eventId, categories } = data;
        const clients = eventClients.get(eventId);
        if (clients && clients.size > 0) {
          const payload = `data: ${JSON.stringify({ type: 'QUOTA_UPDATE', eventId, categories })}\n\n`;
          clients.forEach((client) => client.write(payload));
        }
      }

      if (channel === 'order:status_updated') {
        const { orderId, status } = data;
        const clients = orderClients.get(orderId);
        if (clients && clients.size > 0) {
          const payload = `data: ${JSON.stringify({ type: 'ORDER_STATUS_UPDATE', orderId, status })}\n\n`;
          clients.forEach((client) => client.write(payload));
        }
      }

      if (channel === 'admin:telemetry_updated') {
        if (adminClients.size > 0) {
          const payload = `data: ${JSON.stringify({ type: 'ADMIN_TELEMETRY_SYNC', ...data })}\n\n`;
          adminClients.forEach((client) => client.write(payload));
        }
      }
    } catch (e) {
      console.error('[SSE Message Parse Error]:', e);
    }
  });
}

export class RealtimeController {
  constructor() {
    initRedisSubscriber();
  }

  // SSE Stream untuk Live Kuota Tiket Event (Mendukung ID UUID maupun Slug)
  streamEventQuota = async (req: Request, res: Response): Promise<void> => {
    const identifier = String(req.params.id);
    let eventId = identifier;

    // Resolve UUID jika client mengirim slug
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
    if (!isUuid) {
      try {
        const found = await prisma.event.findFirst({
          where: { slug: identifier },
          select: { id: true },
        });
        if (found) {
          eventId = found.id;
        }
      } catch (err) {
        console.error('[SSE Resolve Event Slug Error]:', err);
      }
    }

    // Set Header Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Daftarkan client ke pool berdasar UUID konsisten dan identifier asli (Slug)
    if (!eventClients.has(eventId)) {
      eventClients.set(eventId, new Set());
    }
    eventClients.get(eventId)!.add(res);

    if (identifier !== eventId) {
      if (!eventClients.has(identifier)) {
        eventClients.set(identifier, new Set());
      }
      eventClients.get(identifier)!.add(res);
    }

    // Kirim initial state kuota terkini
    try {
      const categories = await prisma.ticketCategory.findMany({
        where: { eventId },
        select: { id: true, name: true, remainingCapacity: true, totalCapacity: true },
      });
      res.write(`data: ${JSON.stringify({ type: 'INITIAL_QUOTA', eventId, categories })}\n\n`);
    } catch (err) {
      console.error('[SSE Initial Quota Error]:', err);
    }

    // Heartbeat ping setiap 25 detik agar koneksi HTTP tidak ditutup oleh proxy/cloud
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      eventClients.get(eventId)?.delete(res);
      if (eventClients.get(eventId)?.size === 0) {
        eventClients.delete(eventId);
      }
      if (identifier !== eventId) {
        eventClients.get(identifier)?.delete(res);
        if (eventClients.get(identifier)?.size === 0) {
          eventClients.delete(identifier);
        }
      }
    });
  };

  // SSE Stream untuk Live Status Pesanan (Deteksi Lunas Instan)
  streamOrderStatus = async (req: Request, res: Response): Promise<void> => {
    const orderId = String(req.params.id);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    if (!orderClients.has(orderId)) {
      orderClients.set(orderId, new Set());
    }
    orderClients.get(orderId)!.add(res);

    // Kirim status awal
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, status: true },
      });
      if (order) {
        res.write(
          `data: ${JSON.stringify({ type: 'INITIAL_STATUS', orderId, status: order.status })}\n\n`,
        );
      }
    } catch (err) {
      console.error('[SSE Initial Status Error]:', err);
    }

    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      orderClients.get(orderId)?.delete(res);
      if (orderClients.get(orderId)?.size === 0) {
        orderClients.delete(orderId);
      }
    });
  };

  // SSE Stream untuk Admin Live Dashboard & Telemetri
  streamAdminTelemetry = async (req: Request, res: Response): Promise<void> => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    adminClients.add(res);
    res.write(`data: ${JSON.stringify({ type: 'ADMIN_CONNECTED' })}\n\n`);

    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      adminClients.delete(res);
    });
  };
}
