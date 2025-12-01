import { Listener, OrderCreatedEvent, Subjects } from '@sgtickets/common';
import { Message } from 'node-nats-streaming';
import { queueGroupName } from './queue-group-name';
import { expirationQueue } from '../../queues/expiration-queue';
import { tracer } from '../../tracer';

export class OrderCreatedListener extends Listener<OrderCreatedEvent> {
  subject: Subjects.OrderCreated = Subjects.OrderCreated;
  queueGroupName = queueGroupName;

  async onMessage(data: OrderCreatedEvent['data'], msg: Message) {
    // Try to extract parent trace context from the incoming event payload
    let parentCtx;
    try {
      parentCtx = (tracer as any).extract('text_map', (data as any)._trace || {});
    } catch (e) {
      parentCtx = undefined;
    }

    // Start a span for handling the incoming OrderCreated event (as child of parent if available)
    const span = (tracer as any).startSpan('expiration.onMessage', {
      childOf: parentCtx || undefined,
      tags: { 'event.subject': Subjects.OrderCreated, 'order.id': data.id },
    });

    try {
      const delay = new Date(data.expiresAt).getTime() - new Date().getTime();
      console.log('Waiting this many milliseconds to process the job:', delay);

      // inject current span context into job data so the job processor can continue the trace
      const jobData: any = { orderId: data.id };
      try {
        const carrier: Record<string, string> = {};
        (tracer as any).inject(span.context(), 'text_map', carrier);
        jobData._trace = carrier;
      } catch (e) {
        // ignore inject errors
      }

      await expirationQueue.add(jobData, { delay });

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
