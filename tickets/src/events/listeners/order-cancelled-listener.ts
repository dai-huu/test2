import { Listener, OrderCancelledEvent, Subjects } from '@sgtickets/common';
import { Message } from 'node-nats-streaming';
import { queueGroupName } from './queue-group-name';
import { Ticket } from '../../models/ticket';
import { TicketUpdatedPublisher } from '../publishers/ticket-updated-publisher';
import { tracer } from '../../tracer';
import { extractTraceFrom, injectTraceTo } from '../../tracing-utils';
import { getTraceIds } from '../../tracing-utils';
import logger from '../../logger';

export class OrderCancelledListener extends Listener<OrderCancelledEvent> {
  subject: Subjects.OrderCancelled = Subjects.OrderCancelled;
  queueGroupName = queueGroupName;

  async onMessage(data: OrderCancelledEvent['data'], msg: Message) {
    // extract parent trace context (if any)
    const parentCtx = extractTraceFrom(tracer, data);

    const span = (tracer as any).startSpan('event:OrderCancelled', {
      childOf: parentCtx || undefined,
      tags: {
        'event.subject': Subjects.OrderCancelled,
        'order.id': data.id,
        'ticket.id': data.ticket.id,
        'queue.name': queueGroupName,
        'span.kind': 'consumer',
        'service.name': 'tickets',
      },
    });
    const ids = getTraceIds(tracer, span);
    const log = logger.child ? logger.child({ trace_id: ids.traceId }) : logger;

    const ticket = await Ticket.findById(data.ticket.id);

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    ticket.set({ orderId: undefined });
    await ticket.save();

    const payload: any = {
      id: ticket.id,
      orderId: ticket.orderId,
      userId: ticket.userId,
      price: ticket.price,
      title: ticket.title,
      version: ticket.version,
    };
    try {
      injectTraceTo(tracer, span, payload);
    } catch (e) {}
    await new TicketUpdatedPublisher(this.client).publish(payload);

    span.finish();

    msg.ack();
  }
}
