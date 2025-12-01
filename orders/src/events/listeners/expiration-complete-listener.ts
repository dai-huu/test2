import {
  Listener,
  Subjects,
  ExpirationCompleteEvent,
  OrderStatus,
} from '@sgtickets/common';
import { Message } from 'node-nats-streaming';
import { queueGroupName } from './queue-group-name';
import { Order } from '../../models/order';
import { OrderCancelledPublisher } from '../publishers/order-cancelled-publisher';
import { tracer } from '../../tracer';
import { injectTraceTo, extractTraceFrom, startEventSpan, getTraceIds } from '../../tracing-utils';
import logger from '../../logger';

export class ExpirationCompleteListener extends Listener<
  ExpirationCompleteEvent
> {
  queueGroupName = queueGroupName;
  subject: Subjects.ExpirationComplete = Subjects.ExpirationComplete;

  async onMessage(data: ExpirationCompleteEvent['data'], msg: Message) {
    // try extract parent trace context from incoming event
    const parentCtx = extractTraceFrom(tracer, data);

    const span = startEventSpan(tracer, 'ExpirationComplete', parentCtx, {
      'event.subject': Subjects.ExpirationComplete,
      'order.id': data.orderId,
      'span.kind': 'consumer',
    }, 'orders');
    const ids = getTraceIds(tracer, span);
    const log = logger.child ? logger.child({ trace_id: ids.traceId }) : logger;

    const order = await Order.findById(data.orderId).populate('ticket');

    if (!order) {
      throw new Error('Order not found');
    }
    if (order.status === OrderStatus.Complete) {
      return msg.ack();
    }

    order.set({ status: OrderStatus.Cancelled });
    await order.save();

    // prepare payload and inject current span context so downstream consumers can continue trace
    const payload: any = {
      id: order.id,
      version: order.version,
      ticket: { id: order.ticket.id },
    };
    try {
      injectTraceTo(tracer, span, payload);
    } catch (e) {
      // ignore
    }

    await new OrderCancelledPublisher(this.client).publish(payload);

    span.finish();
    msg.ack();
  }
}
