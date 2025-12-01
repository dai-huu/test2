import express from 'express';
import 'express-async-errors';
import { json } from 'body-parser';
// using jaeger-client directly; no opentracing import
import cookieSession from 'cookie-session';
import { errorHandler, NotFoundError, currentUser } from '@sgtickets/common';
import { createChargeRouter } from './routes/new';
import { tracer } from './tracer';
import { startHttpSpan, getTraceIds } from './tracing-utils';
import logger from './logger';

const app = express();
app.set('trust proxy', true);
app.use(json());
// Jaeger tracing middleware
app.use((req, res, next) => {
  try {
    const span = startHttpSpan(tracer, req, 'payments');
    if (span) {
      (req as any).span = span;
      const ids = getTraceIds(tracer, span);
      (req as any).traceId = ids.traceId;
      (req as any).logger = logger.child ? logger.child({ trace_id: ids.traceId }) : logger;
      res.on('finish', () => {
        span.setTag('http.status_code', (res as any).statusCode);
        span.finish();
      });
    }
  } catch (err) {
    // continue without tracing
  }
  next();
});
app.use(
  cookieSession({
    signed: false,
    secure: process.env.NODE_ENV !== 'test',
  })
);
app.use(currentUser);

app.use(createChargeRouter);

app.all('*', async (req, res) => {
  throw new NotFoundError();
});

app.use(errorHandler);

export { app };
