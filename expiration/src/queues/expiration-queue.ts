import Queue from 'bull';
import { ExpirationCompletePublisher } from '../events/publishers/expiration-complete-publisher';
import { natsWrapper } from '../nats-wrapper';
import { tracer } from '../tracer';

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
  let parentCtx;
  try {
    parentCtx = (tracer as any).extract('text_map', (job.data as any)._trace || {});
  } catch (e) {
    parentCtx = undefined;
  }

  const span = (tracer as any).startSpan('expiration.processJob', {
    childOf: parentCtx || undefined,
    tags: { 'queue.name': 'order:expiration', 'order.id': job.data.orderId },
  });
  try {
    // publish expiration complete and inject trace context so downstream services can continue the trace
    const payload: any = { orderId: job.data.orderId };
    try {
      const carrier: Record<string, string> = {};
      (tracer as any).inject(span.context(), 'text_map', carrier);
      payload._trace = carrier;
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
