import Queue from 'bull';
import { ExpirationCompletePublisher } from '../events/publishers/expiration-complete-publisher';
import { natsWrapper } from '../nats-wrapper';
import { tracer } from '../tracer';
import { extractTraceFrom, injectTraceTo, startJobSpan } from '../tracing-utils';

interface Payload {
  orderId: string;
}

const expirationQueue = new Queue<Payload>('order:expiration', {
  redis: {
    host: process.env.REDIS_HOST,
  },
});

expirationQueue.process(async (job) => {
  // Try to extract parent trace context from the job data
  const parentCtx = extractTraceFrom(tracer, job.data as any);

  const span = startJobSpan(tracer, 'ProcessExpiration', parentCtx, {
    'queue.name': 'order:expiration',
    'order.id': job.data.orderId,
    'span.kind': 'worker',
  }, 'expiration');
  try {
    // publish expiration complete and inject trace context so downstream services can continue the trace
    const payload: any = { orderId: job.data.orderId };
    try {
      injectTraceTo(tracer, span, payload);
    } catch (e) {
      // ignore inject errors
    }
    new ExpirationCompletePublisher(natsWrapper.client).publish(payload);
  } catch (err) {
    span.setTag('error', true);
    span.log({ event: 'error', message: (err as Error).message });
    throw err;
  } finally {
    span.finish();
  }
});

export { expirationQueue };
