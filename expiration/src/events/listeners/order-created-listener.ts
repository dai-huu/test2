import { Listener, OrderCreatedEvent, Subjects } from '@sgtickets/common';
import { Message } from 'node-nats-streaming';
import { queueGroupName } from './queue-group-name';
import { expirationQueue } from '../../queues/expiration-queue';
import { tracer } from '../../tracer';

export class OrderCreatedListener extends Listener<OrderCreatedEvent> {
  subject: Subjects.OrderCreated = Subjects.OrderCreated;
  queueGroupName = queueGroupName;

  async onMessage(data: OrderCreatedEvent['data'], msg: Message) {
    // Start a span for handling the incoming OrderCreated event
    const span = (tracer as any).startSpan('expiration.onMessage', {
      tags: { 'event.subject': Subjects.OrderCreated, 'order.id': data.id },
    });

    try {
      const delay = new Date(data.expiresAt).getTime() - new Date().getTime();
      console.log('Waiting this many milliseconds to process the job:', delay);

      await expirationQueue.add(
        {
          orderId: data.id,
        },
        {
          delay,
        }
      );

      msg.ack();
    } catch (err) {
      span.setTag('error', true);
      span.log({ event: 'error', message: (err as Error).message });
      throw err;
    } finally {
      span.finish();
    }
  }
}
