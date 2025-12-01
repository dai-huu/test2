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
