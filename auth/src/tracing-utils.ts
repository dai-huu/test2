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
