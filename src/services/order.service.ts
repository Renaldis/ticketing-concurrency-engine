import { OrderRepository } from '../repositories/order.repository';
import { AppError } from '../utils/app-error';
import QRCode from 'qrcode';

export class OrderService {
  constructor(private orderRepo: OrderRepository) {}

  async getUserOrders(userId: string) {
    return this.orderRepo.findByUserId(userId);
  }

  async getEticket(orderId: string, userId: string) {
    const order = await this.orderRepo.findByIdAndUserId(orderId, userId);

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.status !== 'PAID') {
      throw new AppError(
        `E-Ticket is only available for PAID orders. Current status: ${order.status}`,
        400,
      );
    }

    // Payload QR Code yang akan di-scan saat check-in pintu konser
    const qrPayload = JSON.stringify({
      orderId: order.id,
      userId: order.userId,
      eventId: order.eventId,
      status: order.status,
    });

    // Generate Base64 Data URL untuk QR Code
    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload);

    return {
      orderId: order.id,
      status: order.status,
      event: {
        id: order.event.id,
        title: order.event.title,
        location: order.event.location,
        date: order.event.date,
      },
      items: order.orderItems.map((item) => ({
        ticketCategory: item.ticketCategory.name,
        quantity: item.quantity,
        price: item.price,
      })),
      qrCode: qrCodeDataUrl,
    };
  }
}
