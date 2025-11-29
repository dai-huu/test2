import express from 'express';
import 'express-async-errors';
import { json } from 'body-parser';
import cookieSession from 'cookie-session';
import { errorHandler, NotFoundError } from '@sgtickets/common';
import { tracer } from './tracer';

import { currentUserRouter } from './routes/current-user';
import { signinRouter } from './routes/signin';
import { signoutRouter } from './routes/signout';
import { signupRouter } from './routes/signup';

const app = express();
app.set('trust proxy', true);
app.use(json());
// Jaeger tracing middleware (using jaeger-client only)
app.use((req, res, next) => {
  try {
    const wireCtx = (tracer as any).extract('http_headers', req.headers as any);
    const span = (tracer as any).startSpan(req.path, { childOf: wireCtx || undefined, tags: { 'http.method': req.method } });
    (req as any).span = span;
    res.on('finish', () => {
      span.setTag('http.status_code', (res as any).statusCode);
      span.finish();
    });
  } catch (err) {
    // continue without tracing when extraction/starting fails
  }
  next();
});
app.use(
  cookieSession({
    signed: false,
    // secure: process.env.NODE_ENV !== 'test',
    secure: false,
  })
);

app.use(currentUserRouter);
app.use(signinRouter);
app.use(signoutRouter);
app.use(signupRouter);

app.all('*', async (req, res) => {
  throw new NotFoundError();
});

app.use(errorHandler);

export { app };
