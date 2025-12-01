export const injectTraceTo = (tracer: any, span: any, target: any) => {
  try {
    if (!span || !tracer) return;
    const carrier: Record<string, string> = {};
    tracer.inject(span.context(), 'text_map', carrier);
    target._trace = carrier;
  } catch (e) {
    // ignore
  }
};

export const extractTraceFrom = (tracer: any, src: any) => {
  try {
    if (!tracer) return undefined;
    return tracer.extract('text_map', (src && src._trace) ? src._trace : {});
  } catch (e) {
    return undefined;
  }
};

export const startHttpSpan = (tracer: any, req: any, serviceName = 'service') => {
  try {
    const wireCtx = (tracer as any).extract('http_headers', req && req.headers ? req.headers : {});
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

export const startEventSpan = (tracer: any, eventName: string, parentCtx: any, tags: Record<string, any> = {}, serviceName = 'service') => {
  try {
    const span = (tracer as any).startSpan(`event:${eventName}`, {
      childOf: parentCtx || undefined,
      tags: Object.assign({}, tags, { 'service.name': serviceName }),
    });
    return span;
  } catch (e) {
    return undefined;
  }
};

export const startJobSpan = (tracer: any, jobName: string, parentCtx: any, tags: Record<string, any> = {}, serviceName = 'service') => {
  try {
    const span = (tracer as any).startSpan(`job:${jobName}`, {
      childOf: parentCtx || undefined,
      tags: Object.assign({}, tags, { 'service.name': serviceName }),
    });
    return span;
  } catch (e) {
    return undefined;
  }
};

export default { injectTraceTo, extractTraceFrom, startHttpSpan, startEventSpan, startJobSpan };

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
