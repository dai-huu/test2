import { Message } from 'node-nats-streaming';
import { Listener, OrderCreatedEvent, Subjects } from '@sgtickets/common';
import { queueGroupName } from './queue-group-name';
import { Ticket } from '../../models/ticket';
import { TicketUpdatedPublisher } from '../publishers/ticket-updated-publisher';
import { tracer } from '../../tracer';

export class OrderCreatedListener extends Listener<OrderCreatedEvent> {
  subject: Subjects.OrderCreated = Subjects.OrderCreated;
  queueGroupName = queueGroupName;

  async onMessage(data: OrderCreatedEvent['data'], msg: Message) {
    // try to extract parent trace context from incoming event
    let parentCtx;
    try {
      parentCtx = (tracer as any).extract('text_map', (data as any)._trace || {});
    } catch (e) {
      parentCtx = undefined;
    }

    const span = (tracer as any).startSpan('tickets.orderCreated', {
      childOf: parentCtx || undefined,
      tags: { 'event.subject': Subjects.OrderCreated, 'order.id': data.id },
    });

    // Find the ticket that the order is reserving
    const ticket = await Ticket.findById(data.ticket.id);

    // If no ticket, throw error
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    // Mark the ticket as being reserved by setting its orderId property
    ticket.set({ orderId: data.id });

    // Save the ticket
    await ticket.save();
    const payload: any = {
      id: ticket.id,
      price: ticket.price,
      title: ticket.title,
      userId: ticket.userId,
      orderId: ticket.orderId,
      version: ticket.version,
    };
    try {
      const carrier: Record<string, string> = {};
      (tracer as any).inject(span.context(), 'text_map', carrier);
      payload._trace = carrier;
    } catch (e) {}
    await new TicketUpdatedPublisher(this.client).publish(payload);

    span.finish();

    // ack the message
    msg.ack();
  }
}
