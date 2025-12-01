import express, { Request, Response } from 'express';
import {
  requireAuth,
  NotFoundError,
  NotAuthorizedError,
} from '@sgtickets/common';
import { Order, OrderStatus } from '../models/order';
import { OrderCancelledPublisher } from '../events/publishers/order-cancelled-publisher';
import { natsWrapper } from '../nats-wrapper';
import { tracer } from '../tracer';
import { injectTraceTo } from '../tracing-utils';

const router = express.Router();

router.delete(
  '/api/orders/:orderId',
  requireAuth,
  async (req: Request, res: Response) => {
    const { orderId } = req.params;

    const order = await Order.findById(orderId).populate('ticket');

    if (!order) {
      throw new NotFoundError();
    }
    if (order.userId !== req.currentUser!.id) {
      throw new NotAuthorizedError();
    }
    order.status = OrderStatus.Cancelled;
    await order.save();

    // publishing an event saying this was cancelled!
    const payload: any = {
      id: order.id,
      version: order.version,
      ticket: {
        id: order.ticket.id,
      },
    };
    try {
      const span = (req as any).span;
      injectTraceTo(tracer, span, payload);
    } catch (e) {
      // ignore
    }
    new OrderCancelledPublisher(natsWrapper.client).publish(payload);

    res.status(204).send(order);
  }
);

export { router as deleteOrderRouter };
