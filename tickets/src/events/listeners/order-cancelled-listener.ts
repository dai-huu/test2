import { Listener, OrderCancelledEvent, Subjects } from '@sgtickets/common';
import { Message } from 'node-nats-streaming';
import { queueGroupName } from './queue-group-name';
import { Ticket } from '../../models/ticket';
import { TicketUpdatedPublisher } from '../publishers/ticket-updated-publisher';
import { tracer } from '../../tracer';

export class OrderCancelledListener extends Listener<OrderCancelledEvent> {
  subject: Subjects.OrderCancelled = Subjects.OrderCancelled;
  queueGroupName = queueGroupName;

  async onMessage(data: OrderCancelledEvent['data'], msg: Message) {
    // extract parent trace context (if any)
    let parentCtx;
    try {
      parentCtx = (tracer as any).extract('text_map', (data as any)._trace || {});
    } catch (e) {
      parentCtx = undefined;
    }

    const span = (tracer as any).startSpan('tickets.orderCancelled', {
      childOf: parentCtx || undefined,
      tags: { 'event.subject': Subjects.OrderCancelled, 'order.id': data.id },
    });

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
      const carrier: Record<string, string> = {};
      (tracer as any).inject(span.context(), 'text_map', carrier);
      payload._trace = carrier;
    } catch (e) {}
    await new TicketUpdatedPublisher(this.client).publish(payload);

    span.finish();

    msg.ack();
  }
}
