export const extractFromHeaders = (tracer: any, headers: any) => {
  try {
    if (!tracer || !headers) return undefined;
    return tracer.extract('http_headers', headers);
  } catch (e) {
    return undefined;
  }
};

export const injectToHeaders = (tracer: any, span: any, headers: any) => {
  try {
    if (!tracer || !span || !headers) return;
    tracer.inject(span.context(), 'http_headers', headers);
  } catch (e) {
    // ignore
  }
};

export default { extractFromHeaders, injectToHeaders };

export const startHttpSpan = (tracer: any, req: any, serviceName = 'service') => {
  try {
    const wireCtx = extractFromHeaders(tracer, req && req.headers ? req.headers : {});
    const spanName = `${req.method} ${req.path}`;
    const span = (tracer as any).startSpan(spanName, {
      childOf: wireCtx || undefined,
      tags: {
        'http.method': req.method,
        'http.url': req.originalUrl || req.url,
        'service.name': serviceName,
        'span.kind': 'server',
      },
    });
    return span;
  } catch (e) {
    return undefined;
  }
};

export default { extractFromHeaders, injectToHeaders, startHttpSpan };

export const getTraceIds = (tracer: any, span: any) => {
  try {
    if (!span || !tracer) return { traceId: undefined, spanId: undefined };
    const ctx = span.context && span.context();
    if (ctx && typeof ctx.toTraceId === 'function') {
      return { traceId: ctx.toTraceId(), spanId: ctx.toSpanId ? ctx.toSpanId() : undefined };
    }
    const carrier: Record<string, string> = {};
    tracer.inject(span.context(), 'http_headers', carrier);
    const uber = carrier['uber-trace-id'] || carrier['uber_trace_id'] || '';
    if (uber) {
      const parts = uber.split(':');
      return { traceId: parts[0], spanId: parts[1] };
    }
  } catch (e) {}
  return { traceId: undefined, spanId: undefined };
};
