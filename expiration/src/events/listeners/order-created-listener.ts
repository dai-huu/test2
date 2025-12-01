import { Listener, OrderCreatedEvent, Subjects } from '@sgtickets/common';
import { Message } from 'node-nats-streaming';
import { queueGroupName } from './queue-group-name';
import { expirationQueue } from '../../queues/expiration-queue';
import { tracer } from '../../tracer';
import { extractTraceFrom, injectTraceTo, startEventSpan, getTraceIds } from '../../tracing-utils';
import logger from '../../logger';

export class OrderCreatedListener extends Listener<OrderCreatedEvent> {
  subject: Subjects.OrderCreated = Subjects.OrderCreated;
  queueGroupName = queueGroupName;

  async onMessage(data: OrderCreatedEvent['data'], msg: Message) {
    // Try to extract parent trace context from the incoming event payload
    const parentCtx = extractTraceFrom(tracer, data);

    // Start a span for handling the incoming OrderCreated event (as child of parent if available)
    const span = startEventSpan(tracer, 'OrderCreated', parentCtx, {
      'event.subject': Subjects.OrderCreated,
      'order.id': data.id,
      'queue.name': queueGroupName,
      'span.kind': 'consumer',
    }, 'expiration');
    const ids = getTraceIds(tracer, span);
    const log = logger.child ? logger.child({ trace_id: ids.traceId }) : logger;

    try {
      const delay = new Date(data.expiresAt).getTime() - new Date().getTime();
      console.log('Waiting this many milliseconds to process the job:', delay);

      // inject current span context into job data so the job processor can continue the trace
      const jobData: any = { orderId: data.id };
      try {
        injectTraceTo(tracer, span, jobData);
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
