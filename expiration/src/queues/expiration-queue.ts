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
  const span = (tracer as any).startSpan('expiration.processJob', {
    tags: { 'queue.name': 'order:expiration', 'order.id': job.data.orderId },
  });
  try {
    new ExpirationCompletePublisher(natsWrapper.client).publish({
      orderId: job.data.orderId,
    });
  } catch (err) {
    span.setTag('error', true);
    span.log({ event: 'error', message: (err as Error).message });
    throw err;
  } finally {
    span.finish();
  }
});

export { expirationQueue };
