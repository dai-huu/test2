import express from 'express';
import 'express-async-errors';
import { json } from 'body-parser';
// using jaeger-client directly; no opentracing import
import cookieSession from 'cookie-session';
import { errorHandler, NotFoundError, currentUser } from '@sgtickets/common';
import { createTicketRouter } from './routes/new';
import { showTicketRouter } from './routes/show';
import { indexTicketRouter } from './routes/index';
import { updateTicketRouter } from './routes/update';
import { tracer } from './tracer';
import { startHttpSpan } from './tracing-utils';

const app = express();
app.set('trust proxy', true);
app.use(json());
// Jaeger tracing middleware
app.use((req, res, next) => {
  try {
    const span = startHttpSpan(tracer, req, 'tickets');
    if (span) (req as any).span = span;
    res.on('finish', () => {
      span.setTag('http.status_code', (res as any).statusCode);
      span.finish();
    });
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

app.use(createTicketRouter);
app.use(showTicketRouter);
app.use(indexTicketRouter);
app.use(updateTicketRouter);

app.all('*', async (req, res) => {
  throw new NotFoundError();
});

app.use(errorHandler);

export { app };
